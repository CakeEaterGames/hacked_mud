import Elysia from "elysia";

import { loggerConfigPlugin } from "@backend/plugins/logger/logger.plugin";
import { getShellContentsRequestT } from "./hackmudShell.model";
import { hackmudShellService } from "./hackmudShell.service";

export const hackmudShellHandler = new Elysia()
  .use(loggerConfigPlugin)
  .post(
    "getShellContents",
    async ({ body }) => {
      return { data: await hackmudShellService.getContents(body.pid) }; //satisfies getShellContentsResponse;
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
    async ({ body }) => {
      return { data: await hackmudShellService.getGameState(body.pid) };
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
  );
