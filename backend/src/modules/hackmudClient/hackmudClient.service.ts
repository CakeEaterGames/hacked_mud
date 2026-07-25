import type {
  HackmudGameState,
  HackmudShellState,
  HackmudUpdateEvent,
} from "@shared/types/HackmudUpdateEvent.model";
import { HackmudMemoryReader } from "../memreader/HackmudMemoryReader";
import { HackmudClients, type HackmudValidPid } from "../findClients/findClients.service";
import { virtualKeyboard } from "../virtualKeyboard/virtualKeyboard.service";
import { sleep } from "bun";
import { log } from "@backend/plugins/logger/logger";
import { shellToTerminalColors } from "../memreader/utils/shellToTerminalColors";

export class HackmudClient {
  public readonly memoryReader: HackmudMemoryReader;
  public readonly pid: number;
  public readonly display: number;
  public readonly windowId: number;
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
    }, 1);
    this._isRunning = true;
  }
  public stop() {
    if (!this.isRunning()) return;
    clearInterval(this.interval!);
    this.interval = null;
    this._isRunning = false;
  }

  private gameState?: HackmudGameState;
  private shellState?: HackmudShellState;
  private isUpdating = false;
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
    } finally {
      // log.debug("...updated")
      this.isUpdating = false; // Release lock even if an error occurs
    }
  }

  public async cmd(text: string) {
    if (!this.shellState) return;
    if (!this.gameState) return;

    await this.update();
    await virtualKeyboard.sendKeyToWindow(this.windowId, this.display, "Escape");
    await sleep(20);
    await virtualKeyboard.sendTextToWindow(this.windowId, this.display, text);
    await sleep(20);
    await virtualKeyboard.sendKeyToWindow(this.windowId, this.display, "Return");

    const { head, tail, version } = this.shellState;
    let cnt = 0;
    while (version == this.shellState?.version || this.gameState?.isProcessing) {
      await sleep(17);
      await this.update();
      cnt++;
      if (cnt >= 100 && !this.gameState.isProcessing) break;
    }
    // await virtualKeyboard.sendTextToWindow(this.windowId, this.display, "#marker");
    // await sleep(20);
    // await virtualKeyboard.sendKeyToWindow(this.windowId, this.display, "Return");
    // await sleep(1000);

    log.debug("DONE");
    // await sleep(500);
    await this.update();

    const dif = this.shellState.version - version;

    function getLastLines(text: string, lineCount: number = 10): string {
      const lines = text.split("\n");
      const lastLines = lines.slice(-lineCount);
      return lastLines.join("\n");
    }

    console.log(
      getLastLines(shellToTerminalColors(this.shellState.normalizedText.join("\n")), dif / 2)
    );
  }
}

async function test() {
  await sleep(8000);
  while (true) {
    // log.debug("While true")
    const c = HackmudClients.entries().toArray()[0]?.[1];
    if (!c) continue;

    const res = await c.cmd("cake.index");
    log.debug({ res });
    await sleep(1000);
  }
}
void test();
