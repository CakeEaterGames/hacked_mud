import Elysia, { status } from "elysia";
import { loggerConfigPlugin } from "@backend/plugins/logger/logger.plugin";
import { getShellContentsRequestT, SendCmdRequestT, SendCmdResponseT } from "./hackmudShell.model";
import { findClientsService } from "../findClients/findClients.service";
import { ok } from "neverthrow";
import { log } from "@backend/plugins/logger/logger";
import { shellToTerminalColors } from "@backend/utils/shellToTerminalColors";

export const hackmudShellHandler = new Elysia()
  .use(loggerConfigPlugin)
  .post(
    "getShellContents",
    async ({ body }) => {
      const data = await findClientsService
        .getClient(body.pid)
        .map(client => client.shellState)
        .match(
          a => a,
          e => {
            switch (e.type) {
              case "CLIENT_NOT_FOUND":
                throw status(400, e);
            }
          }
        );
      return { data };
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
    async ({ body }) => {
      const data = await findClientsService
        .getClient(body.pid)
        .map(client => client.gameState)
        .match(
          a => a,
          e => {
            switch (e.type) {
              case "CLIENT_NOT_FOUND":
                throw status(400, e);
            }
          }
        );
      return { data };
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
      const data = await findClientsService
        .getClient(body.pid)
        .andThen(client => client.cmd(body.cmd))
        .andThen(res => {
          log.info(shellToTerminalColors(res.response.join("\n").trim()));
          return ok(res);
        })
        .match(
          a => a,
          e => {
            switch (e.type) {
              case "CLIENT_NOT_FOUND":
              case "EXEC_ERROR":
                throw status(400, e);
            }
          }
        );
      return { ...data };
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
