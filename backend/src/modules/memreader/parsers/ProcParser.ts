import { exec } from "child_process";

export type ModuleInfo = {
  start: bigint;
  end: bigint;
  size: bigint;
  path: string;
};

export class ProcParser {
  modules: ModuleInfo[] = [];
  constructor(private pid: number) {}

  async init() {
    await this.loadModules();
  }

  private async loadModules() {
    try {
      const { stdout } = await this.execWithTimeout(`cat /proc/${this.pid}/maps`, 1000);
      const lines = stdout.trim().split("\n");

      this.modules = lines.map(line => {
        const [range, , , , , path] = line.split(/\s+/);
        const [start, end] = range!.split("-").map(addr => BigInt("0x" + addr));
        return { start: start!, end: end!, path: path || "", size: end! - start! };
      });
    } catch (error) {
      throw error;
    }
  }

  private async execWithTimeout(command: string, timeoutMs = 5000) {
    return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
      const child = exec(command, (error, stdout, stderr) => {
        if (error) reject(error);
        else resolve({ stdout, stderr });
      });

      const timeout = setTimeout(() => {
        child.kill("SIGKILL"); // Force kill
        reject(new Error(`Command timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      // Clean up timeout if process completes
      child.on("exit", () => clearTimeout(timeout));
    });
  }
}
