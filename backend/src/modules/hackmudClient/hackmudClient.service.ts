import type {
  HackmudGameState,
  HackmudShellState,
  HackmudStats,
  HackmudUpdateEvent,
} from "@shared/types/HackmudUpdateEvent.model";
import { findClientsService, type HackmudValidPid } from "../findClients/findClients.service";
import { virtualKeyboard } from "../virtualKeyboard/virtualKeyboard.service";
import { sleep } from "bun";
import { log } from "@backend/plugins/logger/logger";
import { HackmudMemoryReader } from "../hackmudMemoryReader/hackmudMemoryReader.service";
import { ok, Result, ResultAsync } from "neverthrow";
import { toResultAsync, type ExecError } from "@backend/utils/neverthrow";
import type { ClientCmdResponse, CmdConfig } from "./hackmudClient.types";

export class HackmudClient {
  public readonly pid: number;
  public readonly display: number;
  public readonly windowId: number;

  private isUpdating = false;

  private constructor(
    validPid: HackmudValidPid,
    public memoryReader: HackmudMemoryReader,
    public gameState: HackmudGameState,
    public shellState: HackmudShellState,
    public gameStats: HackmudStats,
    private onUpdate: (event: HackmudUpdateEvent) => void
  ) {
    this.pid = validPid.pid;
    this.display = validPid.display;
    this.windowId = validPid.windowId;
  }

  public static create(validPid: HackmudValidPid, onUpdate: (event: HackmudUpdateEvent) => void) {
    return toResultAsync(this._create(validPid, onUpdate));
  }

  private static async _create(
    validPid: HackmudValidPid,
    onUpdate: (event: HackmudUpdateEvent) => void
  ): Promise<Result<HackmudClient, unknown>> {
    let reader: HackmudMemoryReader;
    let gameState: HackmudGameState;
    let shellState: HackmudShellState;

    return HackmudMemoryReader.create(validPid.pid)
      .andThen(a => {
        reader = a;
        return reader.readGameState();
        // return new HackmudClient(validPid, memoryReader,)
      })
      .andThen(state => {
        gameState = state;
        return reader.readShell();
      })
      .andThen(state => {
        shellState = state;
        const client = new HackmudClient(validPid, reader, gameState, shellState, {}, onUpdate);
        client.start();
        return ok(client);
      });
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
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
    this._isRunning = false;
    this.isUpdating = false;
    return this.memoryReader.close();
  }

  public async update() {
    if (this.isUpdating) return;
    this.isUpdating = true;

    const nextGameStateRes = await this.memoryReader.readGameState();
    if (nextGameStateRes.isErr()) {
      log.error(nextGameStateRes.error);
      findClientsService.deleteClient(this.pid);
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

    const shellRes = await this.memoryReader.readShell();
    if (shellRes.isErr()) {
      log.error(shellRes.error);
      findClientsService.deleteClient(this.pid);
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

  public cmd(text: string, config?: CmdConfig): ResultAsync<ClientCmdResponse, ExecError> {
    return toResultAsync(this._cmd(text, config));
  }

  private async _cmd(
    text: string,
    config?: CmdConfig
  ): Promise<Result<ClientCmdResponse, ExecError>> {
    if (!config) {
      config = {
        toIncludeShell: false,
        toUncolorResponse: true,
        toUncolorShell: true,
      };
    }

    const toIncludeShell = config?.toIncludeShell ?? false;
    const toUncolorResponse = config?.toUncolorResponse ?? true;
    const toUncolorShell = config?.toUncolorShell ?? true;

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

    // log.debug("DONE");
    await sleep(50);
    await this.update();

    let dif = this.shellState.tail - tail;
    if (dif < 0) {
      dif += 2048;
    }

    let res = this.shellState.normalizedText.slice(-dif).join("\n");
    let shell = this.shellState.normalizedText.join("\n");

    if (toUncolorResponse) res = this.uncolor(res);
    if (toUncolorShell) shell = this.uncolor(shell);

    return ok({
      response: res,
      fullShell: toIncludeShell ? shell : undefined,
    });
  }

  uncolor(shell: string): string {
    return shell.replace(/<color=#\w+>/g, "").replace(/<\/color>/g, "");
  }

  async spamHardlineNumbers() {
    //  "hardlineState": 3, "hardlineStateStr": "Patching",
    if (this.gameState?.hardlineState == 3) {
      try {
        await virtualKeyboard.sendTextToWindow(
          this.windowId,
          this.display,
          "012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789"
        );
        await sleep(100);
      } catch (e) {
        log.warn({ e });
      }
    }
  }

  giveName(name: string) {
    this.gameStats.name = name;
    this.sendStatsUpdate();
  }

  sendStatsUpdate() {
    this.onUpdate({
      type: "StatsUpdate",
      pid: this.memoryReader.pid,
      gameStats: this.gameStats,
    });
  }
}
