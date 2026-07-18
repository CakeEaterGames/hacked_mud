import { migrate } from "drizzle-orm/node-postgres/migrator";

import { dbUrlParse, env } from "./config";
import { log } from "./plugins/logger/logger";
import { db } from "./database";
import { listMigrations } from "./utils/manual-migration";
import { apiApp } from "./apiApp";

const PORT = 3000;

const start = async () => {
  log.info("===========================================================");
  log.info("Начинаем запуск приложения");

  if (env.DEPLOY) {
    try {
      //Это условие намеренно вне общего блока try catch, чтобы исключение застопорило программу, а не пошло в бесконечный цикл перезапуска
      log.debug("Начинаем миграцию бд");
      // throw new Error("wtf")
      await migrate(db, { migrationsFolder: "./drizzle" });
      log.debug("Окончили Миграцию");
    } catch (err) {
      const e = err as Error;
      log.error("Ошибка миграции базы данных {*}", { e: e.message, stack: e.stack });
      log.error(`Для решения проблемы читайте Readme.md проекта`);
      const migrations = listMigrations();
      log.error({ migrations });
      return;
    }
  }

  try {
    apiApp.listen(PORT, () => {
      const hostname = apiApp.server?.hostname;
      const port = apiApp.server?.port;
      log.info("API запущенно на {host} порт {port}", { host: hostname, port: port });
      log.info("NODE_ENV: {env}", { env: env.NODE_ENV });
      log.info("DB_NAME: {database}", dbUrlParse);
    });

    const shutdown = async () => {
      log.info("Завершение работы...");
      if (apiApp.server) await apiApp.server.stop();
      process.exit(0);
    };

    process.on("SIGINT", () => {
      void shutdown();
    });
    process.on("SIGTERM", () => {
      void shutdown();
    });
  } catch (err) {
    const e = err as Error;
    log.error("Ошибка при запуске приложения {*}", { e: e.message, stack: e.stack });
    process.exit(1);
  }
};

void start();
