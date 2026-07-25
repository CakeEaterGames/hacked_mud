import { env } from "./config";
import { log } from "./plugins/logger/logger";
import { apiApp } from "./apiApp";

const PORT = 3000;

const start = () => {
  log.info("===========================================================");
  log.info("Начинаем запуск приложения");

  try {
    apiApp.listen(PORT, () => {
      const hostname = apiApp.server?.hostname;
      const port = apiApp.server?.port;
      log.info("API запущенно на {host} порт {port}", { host: hostname, port: port });
      log.info("NODE_ENV: {env}", { env: env.NODE_ENV });
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

start();
