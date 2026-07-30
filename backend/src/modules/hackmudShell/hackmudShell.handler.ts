import Elysia from "elysia";

import { loggerConfigPlugin } from "@backend/plugins/logger/logger.plugin";
import { getShellContentsRequestT, SendCmdRequestT, SendCmdResponseT } from "./hackmudShell.model";
import { hackmudShellService } from "./hackmudShell.service";

export const hackmudShellHandler = new Elysia()
  .use(loggerConfigPlugin)
  .post(
    "getShellContents",
    ({ body }) => {
      return { data: hackmudShellService.getContents(body.pid) }; //satisfies getShellContentsResponse;
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
      tags: ["Shell"],
      loggerConfig: {
        toLogBody: false,
      },
    }
  )
  .post(
    "getGameState",
    ({ body }) => {
      return { data: hackmudShellService.getGameState(body.pid) };
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
      tags: ["Shell"],
      loggerConfig: {
        toLogBody: false,
      },
    }
  )
  .post(
    "sendCmd",
    async ({ body }) => {
      const res = await hackmudShellService.sendCmd(body.pid, body.cmd);
      return res;
    },
    {
      body: SendCmdRequestT,
      response: {
        200: SendCmdResponseT,
      },
      detail: {
        summary: "Send CMD",
        description: "Sends a command and returns a response",
      },
      tags: ["Shell"],
      loggerConfig: {
        toLogBody: false,
      },
    }
  );
