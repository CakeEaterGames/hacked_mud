import { HackmudClients } from "../findClients/findClients.service";

export abstract class hackmudShellService {
  public static getContents(pid: number) {
    const hm = HackmudClients.get(pid)?.shellState;
    if (!hm) throw Error();
    return hm;
  }
  public static getGameState(pid: number) {
    const hm = HackmudClients.get(pid)?.gameState;
    if (!hm) throw Error();
    return hm;
  }
  public static async sendCmd(pid: number, cmd: string) {
    const hm = HackmudClients.get(pid);
    if (!hm) throw Error();

    const res = await hm.cmd(cmd);
    return res;
  }
}
