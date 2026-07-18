import { exec } from "child_process";
import { promisify } from "util";
import { ProcParser } from "./parsers/ProcParser";
import { log } from "console";

const execAsync = promisify(exec);

export async function findHackmudProcess(): Promise<number[]> {
  try {
    const { stdout } = await execAsync("pgrep -f hackmud");
    const pids = stdout
      .trim()
      .split("\n")
      .map(pid => parseInt(pid, 10));
    const monoPids = [];

    for (const a of pids) {
      if (await hasMono(a)) {
        monoPids.push(a);
      }
    }

    return monoPids;
  } catch {
    return [];
  }
}

async function hasMono(pid: number) {
  try {
    const procs = new ProcParser(pid);
    await procs.init();
    const monoModule = procs.modules.find(m => m.path.includes("libmonobdwgc"));
    return !!monoModule;
  } catch (_) {
    return false;
  }
}
