import { configure, defaultTextFormatter, getConsoleSink, type LogRecord } from "@logtape/logtape";
import { getLogger } from "@logtape/logtape";
import { getRotatingFileSink, getTimeRotatingFileSink } from "@logtape/file";
import { getPrettyFormatter } from "@logtape/pretty";
import { isDevelopment } from "../../config";
import * as path from "path";
import { mkdir } from "fs/promises";

const ONE_MB = 0x400 * 0x400;

const mkdirRecursiveAsync = async (dirPath: string): Promise<void> => {
  const normalizedPath = path.resolve(dirPath);
  try {
    await mkdir(normalizedPath, { recursive: true });
  } catch (err) {
    const e = err as { code: string };
    if (e.code !== "EEXIST") throw e;
  }
};

function getPretty() {
  return getPrettyFormatter({
    timestamp: timestamp => {
      return new Date(timestamp).toLocaleTimeString("ru-RU", {
        timeZone: "+11",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    },
    categoryWidth: 10,
    wordWrap: false,
    //Разворачивает json на 10 уровней. Дальше идёт [object]
    inspectOptions: { depth: 10 },
  });
}

function joinMessage(msg: readonly unknown[]) {
  const res: string[] = [];
  for (const a of msg) {
    if (typeof a === "string") {
      res.push(a);
    } else if (a instanceof Error) {
      res.push(`${a.name}: ${a.message}\n${a.stack ?? "(no stack)"}`);
    } else {
      try {
        res.push(JSON.stringify(a, getCircularReplacer()));
      } catch {
        res.push("[Unserializable]");
      }
    }
  }
  return res.join(" ");
}

function getCircularReplacer() {
  const seen = new WeakSet();
  return (_key: string, value: unknown) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) return "[Circular]";
      seen.add(value);
    }
    return value;
  };
}

function myFormatter(record: LogRecord) {
  const rec = {
    timestamp: record.timestamp,
    date: dateToISOWithTimezone(new Date(record.timestamp)),
    category: record.category,
    level: record.level,
    message: joinMessage(record.message),
    properties: record.properties,
  };

  return JSON.stringify(rec) + "\n";
}

function dateToISOWithTimezone(date: Date, timezone: string = "Asia/Sakhalin"): string {
  return (
    new Intl.DateTimeFormat("sv-SE", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
      .format(date)
      .replace(" ", "T") + getTimezoneOffset(date, timezone)
  );
}

function getTimezoneOffset(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "longOffset",
  }).formatToParts(date);

  const offset = parts.find(p => p.type === "timeZoneName")?.value;
  return offset?.replace("GMT", "") || "+00:00";
}

async function initLogger() {
  await mkdirRecursiveAsync("/logs/json");
  await mkdirRecursiveAsync("/logs/pretty");

  if (isDevelopment) {
    await configure({
      sinks: {
        // console: getConsoleSink({ formatter: ansiColorFormatter }),
        console: getConsoleSink({
          formatter: getPretty(),
        }),
      },
      loggers: [
        {
          category: "app",
          lowestLevel: "debug",
          sinks: ["console"],
        },
        {
          category: "http",
          lowestLevel: "debug",
          sinks: ["console"],
        },
        { category: ["logtape", "meta"], sinks: [] }, //Disabled meta logging
      ],
    });
  } else {
    await configure({
      sinks: {
        // console: getConsoleSink({ formatter: jsonLinesFormatter }),
        console: getConsoleSink({ formatter: myFormatter }),
        file: getTimeRotatingFileSink({
          directory: "/logs/json",
          formatter: myFormatter,
          interval: "weekly",
        }),
        filePretty: getRotatingFileSink("/logs/pretty/app.log", {
          formatter: defaultTextFormatter,
          maxFiles: 2,
          maxSize: ONE_MB * 50,
        }),
      },
      loggers: [
        {
          category: "app",
          lowestLevel: "debug",
          sinks: ["console", "file", "filePretty"],
        },
        {
          category: "http",
          lowestLevel: "debug",
          sinks: ["file", "console", "filePretty"],
        },
        { category: ["logtape", "meta"], sinks: [] }, //Disabled meta logging
      ],
    });
  }
}
await initLogger();

export const log = getLogger(["app"]);
export const httpLogger = getLogger(["http"]);
