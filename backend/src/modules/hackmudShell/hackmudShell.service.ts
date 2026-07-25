import { HackmudClients } from "../findClients/findClients.service";

export abstract class hackmudShellService {
  public static async getContents(pid: number) {
    const hm = HackmudClients.get(pid)?.memoryReader;
    if (!hm) throw Error();
    return hm.readShell();
  }
  public static async getGameState(pid: number) {
    const hm = HackmudClients.get(pid)?.memoryReader;
    if (!hm) throw Error();
    const state = await hm.readGameState();

    return state;
  }
}
