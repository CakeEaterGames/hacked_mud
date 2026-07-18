import { Elysia } from "elysia";
import { httpLogger, log } from "./logger";
import { isDevelopment } from "../../config";

type loggerConfig = {
  toLog?: boolean;
  toLogBody?: boolean;
};

const loggerConfigState: Record<string, loggerConfig> = {};

export const loggerConfigPlugin = new Elysia({ name: "loggerConfig" })
  .macro({
    loggerConfig: (config: loggerConfig) => ({
      beforeHandle({ path }) {
        loggerConfigState[path] = config;
      },
    }),
  })
  .as("scoped");

export const logtapePlugin = new Elysia({ name: "logger" })
  .onBeforeHandle(({ request }) => {
    const correlationId = request.headers.get("x-correlation-id") || crypto.randomUUID();
    request.headers.set("x-correlation-id", correlationId);
  })
  .onError(({ request, set, error, code, body }) => {
    const e = error as unknown as { code: number; stack: string };
    if (e.code) {
      set.status = e.code;
    }
    // log.error({a:body});
    if (e.stack && code != "NOT_FOUND") {
      log.error("Exception {e} \n {stack}", { stack: e.stack, e });
    }
    // log.error(e);

    const req = request.clone();
    const logObj: LogRequestResponseArgs = {
      id: String(request.headers.get("x-correlation-id")) ?? "",
      method: req.method,
      url: req.url,
      reqBody: body,
      resBody: {},
      status: Number(set.status),
      isError: false,
    };

    if (code == "VALIDATION" || code == "PARSE") {
      set.status = 422;
      const body = {
        code: "VALIDATION_ERROR",
        message: "Ошибка валидации",
      };
      logObj.resBody = body;
      logRequestResponse(logObj);
      //Мы можем выкидывать ошибку валидации по API а можем скрыть её вернув свой объект
      return; // Не скрывать
      return body; // Скрывать
    }

    if (typeof set.status == "number" && set.status >= 500) {
      const body = {
        code: "INTERNAL_SERVER_ERROR",
        message: "Внутренняя ошибка сервера",
      };
      logObj.resBody = body;
      logObj.isError = true;

      logRequestResponse(logObj);
      return body;
    }
    return;
  })
  .onAfterResponse(({ responseValue, request, body, set, path }) => {
    const config = loggerConfigState[path] ?? {};
    config.toLog = config.toLog ?? true;
    config.toLogBody = config.toLogBody ?? true;

    if (!config.toLog) return;

    const req = request.clone();
    logRequestResponse({
      id: String(request.headers.get("x-correlation-id")) ?? "",
      method: req.method,
      url: req.url,
      reqBody: body,
      resBody: config.toLogBody ? responseValue : { bodyIsHiddenFromLog: true },
      status: Number(set.status),
      isError: false,
    });
  })
  .as("global");

type LogRequestResponseArgs = {
  id: string;
  method: string;
  url: string;
  reqBody: unknown;
  status: number;
  resBody: unknown;
  isError: boolean;
};
function logRequestResponse(args: LogRequestResponseArgs) {
  let logMask = "<-> REQUEST: ";
  const log = {
    id: args.id,
    request: {
      method: args.method,
      url: args.url,
      body: args.reqBody,
    },
    response: {
      status: args.status,
      body: args.resBody,
    },
  };

  if (isDevelopment) logMask += "{*}";

  if (args.isError) {
    httpLogger.error(logMask, log);
  } else {
    httpLogger.info(logMask, log);
  }
}
