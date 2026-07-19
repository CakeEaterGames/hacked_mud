import Elysia from "elysia";

import { loggerConfigPlugin } from "@backend/plugins/logger/logger.plugin";
import {
  getShellContentsRequestT,
  HackmudUpdateEventT,
  type HackmudUpdateEvent,
} from "./hackmudShell.model";
import { HackmudListener, hackmudShell } from "./hackmudShell.service";
import { log } from "@backend/plugins/logger/logger";
import { getHackmudMemoryReader } from "../memreader";

const connections = new Map<string, wsConnection>();

//weird how Elysia doesn't have a type for that
type wsConnection = {
  send: (data: HackmudUpdateEvent) => number;
};

export const hackmudShellHandler = new Elysia()
  .use(loggerConfigPlugin)
  .post(
    "getShellContents",
    async ({}) => {
      return { data: await hackmudShell.getContents() }; //satisfies getShellContentsResponse;
    },
    {
      body: getShellContentsRequestT,
      response: {
        // 200: getShellContentsResponseT,
      },
      detail: {
        summary: "Get Shell Contents",
        description: "Returns the contents of the shell of a hackmud client",
      },
      tags: ["Test"],
      loggerConfig: {
        toLogBody: false,
      },
    }
  )
  .post(
    "getGameState",
    async ({}) => {
      return { data: await hackmudShell.getGameState() };
    },
    {
      body: getShellContentsRequestT,
      response: {
        // 200: getShellContentsResponseT,
      },
      detail: {
        summary: "Get Game State",
        description: "Returns the contents of the shell of a hackmud client",
      },
      tags: ["Test"],
      loggerConfig: {
        toLogBody: false,
      },
    }
  )
  .ws("ws", {
    response: HackmudUpdateEventT,
    open(ws) {
      log.debug("WS open {id}", { id: ws.id });
      connections.set(ws.id, ws);
    },
    close(ws) {
      log.debug("WS close {id}", { id: ws.id });
      connections.delete(ws.id);
    },
  });

const hm = await getHackmudMemoryReader();
const _listener = new HackmudListener(hm!, event => {
  log.debug("Updated");
  for (const con of connections.values()) {
    con.send(event);
  }
});
