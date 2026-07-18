import { findHackmudProcess } from "./findGame";
import { HackmudMemoryReader } from "./HackmudMemoryReader";

const p = await findHackmudProcess();
const pid = p[2];

if (pid) {
  const r = new HackmudMemoryReader(pid);
  await r.initialize();
}
