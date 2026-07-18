import { db } from "@backend/database/index";
import { sql } from "drizzle-orm";
import Elysia from "elysia";
import { healthResponseT, type HealthResponse } from "./healthcheck.model";
import { loggerConfigPlugin } from "@backend/plugins/logger/logger.plugin";

export const healthHandler = new Elysia().use(loggerConfigPlugin).get(
  "healthcheck",
  async () => {
    //Пытаемся постучаться в базу
    await db.execute(sql`SELECT 1`);
    return { status: "ok", timestamp: new Date().toISOString() } satisfies HealthResponse;
  },
  {
    loggerConfig: {
      toLog: false,
    },
    response: {
      200: healthResponseT,
    },
    detail: {
      summary: "Healthcheck",
      description: "Проверка работоспособности сервиса.",
    },
    tags: ["System"],
  }
);
