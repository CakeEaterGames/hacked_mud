import openapi from "@elysiajs/openapi";
import cors from "@elysiajs/cors";
import Elysia from "elysia";
import { env } from "./config";
import { logtapePlugin } from "@backend/plugins/logger/logger.plugin";
// import { logtapePlugin } from "./plugins/logger/logger.plugin";
import { healthHandler } from "./modules/healthcheck/healthcheck.handler";
import { hackmudShellHandler } from "./modules/hackmudShell/hackmudShell.handler";
import { findClientsHandler } from "./modules/findClients/findClients.handler";
// import { treaty } from '@elysia/eden'

const apiAppNoPrefix = new Elysia()
  .use(cors())
  .use(
    openapi({
      provider: "scalar",
      path: "/docs",
      specPath: "/openapi/json",
      documentation: {},
    })
  )
  .use(logtapePlugin)
  .use(hackmudShellHandler)
  .use(findClientsHandler)
  .use(healthHandler);

export const apiApp = new Elysia({ prefix: env.API_BASE_URL, name: "hacked-mud-api" }).use(
  apiAppNoPrefix
);

export type apiAppTypes = typeof apiAppNoPrefix;
