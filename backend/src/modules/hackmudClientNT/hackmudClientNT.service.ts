import type {
  HackmudGameState,
  HackmudShellState,
  HackmudUpdateEvent,
} from "@shared/types/HackmudUpdateEvent.model";
import { type HackmudValidPid } from "../findClients/findClients.service";
import { virtualKeyboard } from "../virtualKeyboard/virtualKeyboard.service";
import { sleep } from "bun";
import { log } from "@backend/plugins/logger/logger";
import { HackmudMemoryReader } from "../hackmudMemoryReaderNT/hackmudMemoryReaderNT.service";
import { ok } from "neverthrow";

export class HackmudClient {
  public readonly memoryReader: HackmudMemoryReader;
  public readonly pid: number;
  public readonly display: number;
  public readonly windowId: number;
  public gameState?: HackmudGameState;
  public shellState?: HackmudShellState;
  private isUpdating = false;

  constructor(
    validPid: HackmudValidPid,
    private onUpdate: (event: HackmudUpdateEvent) => void
  ) {
    this.pid = validPid.pid;
    this.display = validPid.display;
    this.windowId = validPid.windowId;
    this.memoryReader = new HackmudMemoryReader(validPid.pid);
  }

  public async initialize() {
    await this.memoryReader
      .initialize()
      .andThen(_ => {
        this.start();
        return ok();
      })
      .match(
        a => a,
        e => {
          log.error({ e });
          switch (e.type) {
            case "NULL_POINTER_ERROR":
            case "MEMORY_READER_ERROR":
            case "EXEC_ERROR":
            case "UNSUPPORTED":
            case "ASSEMBLY_NOT_FOUND_ERROR":
            case "FIELD_NOT_FOUND_ERROR":
              break;
          }
        }
      );
  }

  private _isRunning = false;
  private interval: NodeJS.Timeout | null = null;
  public isRunning() {
    return this._isRunning;
  }
  public start() {
    if (this.isRunning()) return;
    this.interval = setInterval(() => {
      void this.update();
    }, 2);
    this._isRunning = true;
  }
  public stop() {
    if (!this.isRunning()) return;
    clearInterval(this.interval!);
    this.interval = null;
    this._isRunning = false;
    this.isUpdating = false;
  }

  public async update() {
    if (this.isUpdating) return;
    this.isUpdating = true;

    const contextRes = await this.memoryReader.initialize();
    if (contextRes.isErr()) {
      //TODO idk
      log.error(contextRes.error);
      this.stop();
      return;
    }
    const context = contextRes.value;

    // log.debug("updating...")
    const nextGameStateRes = await this.memoryReader.readGameState(context);
    if (nextGameStateRes.isErr()) {
      log.error(nextGameStateRes.error);
      this.stop();
      return;
    }
    const nextGameState = nextGameStateRes.value;

    let changed = false;
    if (!this.gameState) changed = true;

    if (this.gameState) {
      for (const key in nextGameState) {
        const k = key as keyof HackmudGameState;
        if (this.gameState[k] != nextGameState[k]) {
          changed = true;
          break;
        }
      }
    }

    if (changed) {
      this.onUpdate({
        type: "GameStateUpdate",
        pid: this.memoryReader.pid,
        gameState: nextGameState,
      });
    }
    this.gameState = nextGameState;

    const shellRes = await this.memoryReader.readShell(context);
    if (shellRes.isErr()) {
      log.error(shellRes.error);
      this.stop();
      return;
    }
    const shell = shellRes.value;

    if (!this.shellState || this.shellState.version != shell.version) {
      this.onUpdate({ type: "ShellUpdate", pid: this.memoryReader.pid, shellState: shell });
    }
    this.shellState = shell;

    await this.spamHardlineNumbers();

    // log.debug("...updated")
    this.isUpdating = false; // Release lock even if an error occurs
  }

  public async cmd(text: string) {
    if (!this.shellState) throw Error("fuck");
    if (!this.gameState) throw Error("fuck");

    // await this.update();

    while (this.gameState?.isProcessing) {
      await sleep(17);
      await this.update();
    }

    const { tail, version } = this.shellState;
    await virtualKeyboard.sendKeyToWindow(this.windowId, this.display, "Escape");
    await sleep(20);
    await virtualKeyboard.sendTextToWindow(this.windowId, this.display, text);
    await sleep(20);
    await virtualKeyboard.sendKeyToWindow(this.windowId, this.display, "Return");

    let cnt = 0;
    while (version == this.shellState?.version || this.gameState?.isProcessing) {
      await sleep(17);
      await this.update();
      cnt++;
      if (cnt >= 100 && !this.gameState.isProcessing) break;
    }

    log.debug("DONE");
    await sleep(50);
    await this.update();

    let dif = this.shellState.tail - tail;
    if (dif < 0) {
      dif += 2048;
    }

    const res = this.shellState.normalizedText.slice(-dif);
    return {
      response: res,
      fullShell: this.shellState.normalizedText,
    };
  }

  async spamHardlineNumbers() {
    //  "hardlineState": 3, "hardlineStateStr": "Patching",
    if (this.gameState?.hardlineState == 3) {
      try {
        await sleep(1000);
        log.debug("CALL");
        await virtualKeyboard.sendTextToWindow(
          this.windowId,
          this.display,
          "012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789"
        );
      } catch (e) {
        log.warn({ e });
      }
    }
  }
}
