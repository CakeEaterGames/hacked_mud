import { exec } from "child_process";
import { promisify } from "util";
import { log } from "@backend/plugins/logger/logger";
import { getProcMaps } from "../procParser/procParser.service";
import { err, ok, ResultAsync } from "neverthrow";
import { toResultAsync, type ExecError } from "@backend/utils/neverthrow";
import { socketServerService } from "../socketServer/socketServer.service";
import { HackmudClient } from "../hackmudClient/hackmudClient.service";

const execAsync = ResultAsync.fromThrowable(
  async (a: string) => promisify(exec)(a),
  e => {
    return {
      cause: e as Error,
      type: "EXEC_ERROR",
    } satisfies ExecError;
  }
);

export type UselessPidError = {
  type: "USELESS_PID";
  pid: number;
};

export type HackmudValidPid = { pid: number; windowId: number; display: number };
export const HackmudClients = new Map<number, HackmudClient>();

export abstract class findClientsService {
  static findClients(): ResultAsync<HackmudValidPid[], ExecError> {
    return execAsync("pgrep -f hackmud").andThen(resp => {
      const t = resp.stdout.trim();
      if (!t) {
        return ok([]);
      }
      const pids = t
        .split("\n")
        .map(pid => Number(pid))
        .filter(pid => !isNaN(pid));

      const results: ResultAsync<HackmudValidPid | undefined, never>[] = [];
      for (const pid of pids) {
        results.push(this.validatePid(pid).orElse(_ => ok(undefined)));
      }

      return ResultAsync.combine(results).andThen(valid => {
        return ok(valid.filter(a => !!a));
      });
    });
  }

  static validatePid(pid: number): ResultAsync<HackmudValidPid, UselessPidError> {
    const ue = err({
      type: "USELESS_PID",
      pid,
    } satisfies UselessPidError);

    return this.hasMono(pid)
      .andThen(has => {
        if (!has) return ue;
        return ok();
      })
      .andThen(_ => execAsync(`cat /proc/${pid}/environ | tr '\\0' '\n' | grep DISPLAY`))
      .map(envs => {
        return Number(envs.stdout.replaceAll("DISPLAY=:", "").trim());
      })
      .andThen(display =>
        execAsync(`DISPLAY=:${display} xdotool search --classname hackmud_lin.x86_64`).map(
          winId => {
            return {
              pid,
              windowId: Number(winId.stdout),
              display,
            } satisfies HackmudValidPid;
          }
        )
      )
      .orElse(e => {
        if (e.type == "EXEC_ERROR") {
          log.warn(e);
          return ue;
        }
        return err(e);
      });
  }

  static hasMono(pid: number): ResultAsync<boolean, never> {
    return getProcMaps(pid)
      .andThen(modules => {
        const mono = modules.find(m => m.path.includes("libmonobdwgc"));
        return ok(!!mono);
      })
      .orElse(e => {
        log.warn(e);
        return ok(false);
      });
  }

  static repopulateMemReaders() {
    return findClientsService
      .findClients()
      .andThen(clients => {
        const toRemove = HackmudClients.entries()
          .toArray()
          .filter(k => !clients.find(c => c.pid == k[0]));
        for (const expired of toRemove) {
          expired[1].stop();
          HackmudClients.delete(expired[0]);
        }
        return ok(clients);
      })
      .andThen(clients => {
        async function temp(): Promise<ResultAsync<void, never>> {
          for (const c of clients) {
            if (HackmudClients.keys().find(a => a == c.pid)) continue;

            const listener = new HackmudClient(
              c,
              socketServerService.onHackmudEvent.bind(socketServerService)
            );
            await listener.initialize();
            HackmudClients.set(c.pid, listener);
          }
          return ok();
        }

        return toResultAsync(temp());
      });
  }
}

try {
  void findClientsService.repopulateMemReaders();
} catch (e) {
  log.error({ e });
}
