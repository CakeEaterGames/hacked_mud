import { log } from "@backend/plugins/logger/logger";
import { findHackmudProcess } from "./findGame";
import { HackmudMemoryReader } from "./HackmudMemoryReader";
import { exec } from "child_process";
import { promisify } from "util";

let hackmudClient: HackmudMemoryReader | null = null;

const pids = await findHackmudProcess();
const pid = pids[0];
log.debug({ pid });
log.debug({ pids });

const execAsync = promisify(exec);
// const displays = [":0", ":95"];

for (const p of pids) {
  try {
    const r1 = await execAsync(`cat /proc/${p}/environ | tr '\\0' '\n' | grep DISPLAY`);
    const r2 = await execAsync(`${r1.stdout} xdotool search --classname hackmud_lin.x86_64`);
    log.debug({ p, r1: r1.stdout, r2: r2.stdout });
  } catch (e) {
    log.error({ e });
  }
}

//Task for the next time
// You now have the map of PID-WindowID-DISPLAY
// Now you need to create e memory reader for each client and update your ws to send info about all clients
// Good luck!

export async function getHackmudMemoryReader() {
  if (hackmudClient) return hackmudClient;

  if (pid) {
    hackmudClient = new HackmudMemoryReader(pid);
    await hackmudClient.initialize();
    return hackmudClient;
  }
  return null;
}
