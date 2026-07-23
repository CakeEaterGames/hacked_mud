import { HackmudMemoryReader } from "./HackmudMemoryReader";

let hackmudClient: HackmudMemoryReader | null = null;

export async function getHackmudMemoryReader(pid: number) {
  if (hackmudClient) return hackmudClient;

  if (pid) {
    hackmudClient = new HackmudMemoryReader(pid);
    await hackmudClient.initialize();
    return hackmudClient;
  }
  return null;
}
