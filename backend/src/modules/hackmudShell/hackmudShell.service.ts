import { log } from "@backend/plugins/logger/logger";
import type {
  HackmudGameState,
  HackmudMemoryReader,
  HackmudShellState,
} from "../memreader/HackmudMemoryReader";
import { memReaders } from "../findClients/findClients.service";

export abstract class hackmudShellService {
  public static async getContents(pid: number) {
    const hm = memReaders.get(pid);
    if (!hm) throw Error();
    // await hm.update();
    // return hm.shell || "";
    return hm.readShell();
  }
  public static async getGameState(pid: number) {
    const hm = memReaders.get(pid);
    if (!hm) return ":(";
    const state = await hm.readGameState();

    return state;
  }
}

export type HackmudUpdateEvent = GameStateUpdate | ShellUpdate;

export type GameStateUpdate = {
  type: "GameStateUpdate";
  gameState: HackmudGameState;
};
export type ShellUpdate = {
  type: "ShellUpdate";
  shellState: HackmudShellState;
};

export class HackmudListener {
  constructor(
    private memoryReader: HackmudMemoryReader,
    private onUpdate: (event: HackmudUpdateEvent) => void
  ) {
    this.memoryReader = memoryReader;
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
    }, 16);
    this._isRunning = true;
  }
  public stop() {
    if (!this.isRunning()) return;
    clearInterval(this.interval!);
    this.interval = null;
    this._isRunning = false;
  }

  private lastGameState?: HackmudGameState;
  private lastShellState?: HackmudShellState;
  private isUpdating = false;
  public async update() {
    if (this.isUpdating) return;
    this.isUpdating = true;

    try {
      const gameState = await this.memoryReader.readGameState();

      let changed = false;
      if (!this.lastGameState) changed = true;

      if (this.lastGameState) {
        for (const key in gameState) {
          const k = key as keyof HackmudGameState;
          if (this.lastGameState[k] != gameState[k]) {
            changed = true;
            break;
          }
        }
      }

      if (changed) {
        this.onUpdate({ type: "GameStateUpdate", gameState: gameState });
        this.lastGameState = gameState;
      }

      const shell = await this.memoryReader.readShell();
      if (!this.lastShellState || this.lastShellState.version != shell.version) {
        this.onUpdate({ type: "ShellUpdate", shellState: shell });
        this.lastShellState = shell;
      }
    } finally {
      this.isUpdating = false; // Release lock even if an error occurs
    }
  }
}
