import Elysia from "elysia";

import { loggerConfigPlugin } from "@backend/plugins/logger/logger.plugin";
import {
  getShellContentsRequestT,
  getShellContentsResponseT,
  type getShellContentsResponse,
} from "./hackmudShell.model";
import { hackmudShell } from "./hackmudShell.service";

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
  );
