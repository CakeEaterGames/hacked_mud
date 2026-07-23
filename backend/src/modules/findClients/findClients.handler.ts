import Elysia, { status } from "elysia";
import { loggerConfigPlugin } from "@backend/plugins/logger/logger.plugin";
import { log } from "@backend/plugins/logger/logger";
import { findClientsService } from "./findClients.service";
import { findClientsRequestT, findClientsResponseT } from "./findClients.module";

export const findClientsHandler = new Elysia().use(loggerConfigPlugin).post(
  "findClients",
  async () => {
    return {
      clients: await findClientsService.findClients().match(
        a => a,
        e => {
          throw status(400, e);
        }
      ),
    }; //satisfies getShellContentsResponse;
  },
  {
    body: findClientsRequestT,
    response: {
      200: findClientsResponseT,
    },
    detail: {
      summary: "Find Clients",
      description: "",
    },
    tags: ["Test"],
    loggerConfig: {
      toLogBody: false,
    },
  }
);
