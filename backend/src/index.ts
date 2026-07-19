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

import { exec } from "child_process";
import { promisify } from "util";
const execAsync = promisify(exec);

async function sendTextToWindow(windowId: number, text: string): Promise<void> {
  try {
    const escapedText = text.replace(/"/g, '\\"');
    await execAsync(`xdotool type --window ${windowId} --delay 0 "${escapedText}"`);
  } catch (e) {
    log.error({ e });
  }
}
async function sendKeysToWindow(windowId: number, keys: string): Promise<void> {
  await execAsync(`xdotool key --window ${windowId} ${keys}`);
}
async function sendKeyPresses(windowId: number, text: string): Promise<void> {
  if (text == "esc") {
    await sendKeysToWindow(windowId, "Escape");
    return;
  }
  await sendTextToWindow(windowId, text);
  if (text.includes("\n")) {
    await sendKeysToWindow(windowId, "Return");
  }
}

async function test() {
  try {
    const { stdout } = await execAsync("xdotool search --all --classname hackmud_lin.x86_64");
    // const { stdout } = await execAsync("xdotool search --pid 44417 --classname hackmud_lin.x86_64");
    const windowIds = stdout.trim().split("\n");
    const id = Number(windowIds[0]);
    log.debug({ id }); //[0] || null;
    log.debug({ windowIds }); //[0] || null;
    await sendKeyPresses(id, "hello\n");
  } catch (e) {
    log.error({ e });
  }
}

// void test()
