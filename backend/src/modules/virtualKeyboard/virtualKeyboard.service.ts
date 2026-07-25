import { log } from "@backend/plugins/logger/logger";
import { exec } from "child_process";
import { promisify } from "util";
import type { KeyName } from "./virtualKeyboard.model";

const execAsync = promisify(exec);

export abstract class virtualKeyboard {
  static async sendTextToWindow(windowId: number, display: number, text: string): Promise<void> {
    const escapedText = text.replace(/"/g, '\\"');
    await execAsync(
      `DISPLAY=:${display} xdotool type --window ${windowId} --delay 0 "${escapedText}"`
    );
  }
  static async sendKeyToWindow(windowId: number, display: number, key: KeyName): Promise<void> {
    await execAsync(`DISPLAY=:${display} xdotool key --window ${windowId} ${key}`);
  }
}
