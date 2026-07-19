import { log } from "@backend/plugins/logger/logger";
import { findHackmudProcess } from "./findGame";
import { HackmudMemoryReader } from "./HackmudMemoryReader";

let hackmudClient: HackmudMemoryReader | null = null;

const p = await findHackmudProcess();
const pid = p[0];
log.debug({ pid });

export async function getHackmudMemoryReader() {
  if (hackmudClient) return hackmudClient;

  if (pid) {
    hackmudClient = new HackmudMemoryReader(pid);
    await hackmudClient.initialize();
    return hackmudClient;
  }
  return null;
}
