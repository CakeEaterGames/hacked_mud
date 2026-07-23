import { exec } from "child_process";
import { promisify } from "util";
import { log } from "@backend/plugins/logger/logger";
import { getProcMaps } from "../memreader/parsers/ProcParser";
import { err, ok, ResultAsync } from "neverthrow";
import { type ExecError } from "@backend/utils/neverthrow";

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
}
