import type {
  HackmudGameState,
  HackmudShellState,
  HackmudUpdateEvent,
} from "@shared/types/HackmudUpdateEvent.model";
import { HackmudMemoryReader } from "../hackmudMemoryReader/hackmudMemoryReader.service";
import { type HackmudValidPid } from "../../modules/findClients/findClients.service";
import { virtualKeyboard } from "../../modules/virtualKeyboard/virtualKeyboard.service";
import { sleep } from "bun";
import { log } from "@backend/plugins/logger/logger";

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
    await this.memoryReader.initialize();
    await this.update();

    this.start();
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
  }

  public async update() {
    if (this.isUpdating) return;
    this.isUpdating = true;

    // log.debug("updating...")
    try {
      const nextGameState = await this.memoryReader.readGameState();

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

      const shell = await this.memoryReader.readShell();
      if (!this.shellState || this.shellState.version != shell.version) {
        this.onUpdate({ type: "ShellUpdate", pid: this.memoryReader.pid, shellState: shell });
      }
      this.shellState = shell;

      await this.spamHardlineNumbers();
    } finally {
      // log.debug("...updated")
      this.isUpdating = false; // Release lock even if an error occurs
    }
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

    log.debug({ dif });

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
