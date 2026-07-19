type ConnectionConfig = {
  user: string | undefined;
  // password: string | undefined;
  host: string | undefined;
  port: string | undefined;
  database: string | undefined;
  schema: string | undefined;
};

function notNull<T>(name: string, a: T) {
  if (a === null || a === undefined) throw new Error("Пустая переменная среды! " + name);
  return a as Exclude<T, null | undefined>;
}

export namespace env {
  export const NODE_ENV = notNull("NODE_ENV", process.env.NODE_ENV);
  export const API_BASE_URL = notNull("API_BASE_URL", process.env.API_BASE_URL);
  export const API_FULL_URL = notNull("API_FULL_URL", process.env.API_FULL_URL);
  export const DEPLOY = process.env.DEPLOY === "true" ? true : false;
}

export const isDevelopment = env.NODE_ENV === "development";
