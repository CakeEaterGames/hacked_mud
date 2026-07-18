import Elysia from "elysia";
import { HelloworldService } from "./helloworld.service";
import {
  helloworldRequestT,
  helloworldResponseT,
  type helloworldResponse,
} from "./helloworld.model";
import { authMiddleware } from "@backend/middlewares/auth.middleware";
import { loggerConfigPlugin } from "@backend/plugins/logger/logger.plugin";

export const helloworldHandler = new Elysia()
  .use(authMiddleware)
  .use(loggerConfigPlugin)
  .post(
    "helloworld",
    ({ body }) => {
      return { output: HelloworldService.hello(body.input) } satisfies helloworldResponse;
    },
    {
      body: helloworldRequestT,
      response: {
        200: helloworldResponseT,
      },
      detail: {
        summary: "Hello World!",
        description: "Добавляет '!' после строки",
      },
      tags: ["Test"],
      loggerConfig: {
        toLogBody: false,
      },
      authConfig: {
        requreAuth: false,
      },
    }
  );
