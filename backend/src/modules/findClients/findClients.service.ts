import { exec } from "child_process";
import { promisify } from "util";
import { log } from "@backend/plugins/logger/logger";
import { getProcMaps } from "../procParser/procParser.service";
import { err, errAsync, ok, okAsync, Result, ResultAsync } from "neverthrow";
import { toResultAsync, type ExecError } from "@backend/utils/neverthrow";
import { socketServerService } from "../socketServer/socketServer.service";
import { HackmudClient } from "../hackmudClient/hackmudClient.service";
import type { ClientNotFoundError } from "./findClients.models";
import { OOG } from "../OOG/oog.service";
// import { HackmudClient } from "../hackmudClient/hackmudClient.service";

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
export const HackmudOOGs = new Map<number, OOG>();

export abstract class findClientsService {
  static isRepopulating: boolean = false;
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
        switch (e.type) {
          case "EXEC_ERROR":
            log.warn(e);
            return ok(false);
          case "PROC_NOT_FOUND_ERROR":
            return ok(false);
        }
      });
  }

  static repopulateMemReaders() {
    if (this.isRepopulating) return;
    this.isRepopulating = true;
    log.info("Starting to look for clients");

    return findClientsService
      .findClients()
      .andThen(clients => {
        const toRemove = HackmudClients.entries()
          .toArray()
          .filter(k => !clients.find(c => c.pid == k[0]));
        for (const expired of toRemove) {
          this.deleteClient(expired[0]);
        }

        return ok(clients);
      })
      .andThen(clients => {
        async function temp(): Promise<Result<HackmudClient[], never>> {
          const res: HackmudClient[] = [];
          for (const c of clients) {
            if (HackmudClients.keys().find(a => a == c.pid)) continue;

            const listener = await HackmudClient.create(
              c,
              socketServerService.onHackmudEvent.bind(socketServerService)
            );

            if (listener.isErr()) {
              log.error({ error: listener.error });
              continue;
            }

            const oog = await OOG.create(listener.value);
            if (oog.isErr()) {
              log.error({ error: oog.error });
              continue;
            }
            HackmudOOGs.set(c.pid, oog.value);

            HackmudClients.set(c.pid, listener.value);
            res.push(listener.value);
          }
          return ok(res);
        }

        return toResultAsync(temp());
      })
      .andTee(clients => {
        log.info("Finished looking for clients");
        log.info({ pids: HackmudClients.keys().toArray() });
        if (clients.length > 0) {
          socketServerService.broadcastClientList();
        }
        this.isRepopulating = false;
      })
      .orTee(e => {
        log.error("Error while looking for clients", { e });
        log.info({ pids: HackmudClients.keys().toArray() });
        this.isRepopulating = false;
      });
  }

  static getClient(pid: number): ResultAsync<HackmudClient, ClientNotFoundError> {
    const hm = HackmudClients.get(pid);
    if (!hm) {
      return errAsync({
        type: "CLIENT_NOT_FOUND",
        pid,
      } satisfies ClientNotFoundError);
    }
    return okAsync(hm);
  }

  static getOOG(pid: number): ResultAsync<OOG, ClientNotFoundError> {
    const hm = HackmudOOGs.get(pid);
    if (!hm) {
      return errAsync({
        type: "CLIENT_NOT_FOUND",
        pid,
      } satisfies ClientNotFoundError);
    }
    return okAsync(hm);
  }

  static deleteClient(pid: number) {
    if (HackmudClients.has(pid)) {
      HackmudClients.get(pid)!.stop();
      HackmudClients.delete(pid);
      socketServerService.broadcastClientList();
      log.info(`Deleting client ${pid}`);
    }
    if (HackmudOOGs.has(pid)) {
      HackmudOOGs.get(pid)!.stop();
      HackmudOOGs.delete(pid);
      log.info(`Deleting OOG ${pid}`);
    }
  }
}

try {
  void findClientsService.repopulateMemReaders();
} catch (e) {
  log.error({ e });
}

setInterval(() => {
  try {
    void findClientsService.repopulateMemReaders();
  } catch (e) {
    log.error({ e });
  }
}, 1000 * 60);
