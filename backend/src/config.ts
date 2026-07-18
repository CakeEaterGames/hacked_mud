type ConnectionConfig = {
  user: string | undefined;
  // password: string | undefined;
  host: string | undefined;
  port: string | undefined;
  database: string | undefined;
  schema: string | undefined;
};

function parsePostgresUrl(url: string): ConnectionConfig {
  //Магия, Deepseek написал.
  const match = url?.match(
    /^postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)\?schema=([^&]+)$/
  );
  if (!match)
    return {
      user: undefined,
      // password:undefined,
      host: undefined,
      port: undefined,
      database: undefined,
      schema: undefined,
    };
  return {
    user: match[1],
    // password: match[2],
    host: match[3],
    port: match[4],
    database: match[5],
    schema: match[6],
  };
}

function notNull<T>(name: string, a: T) {
  if (a === null || a === undefined) throw new Error("Пустая переменная среды! " + name);
  return a as Exclude<T, null | undefined>;
}

export namespace env {
  export const NODE_ENV = notNull("NODE_ENV", process.env.NODE_ENV);
  export const DATABASE_URL = notNull("DATABASE_URL", process.env.DATABASE_URL);
  export const API_BASE_URL = notNull("API_BASE_URL", process.env.API_BASE_URL);
  export const API_FULL_URL = notNull("API_FULL_URL", process.env.API_FULL_URL);
  export const DEPLOY = process.env.DEPLOY === "true" ? true : false;
  export const JWT_SECRET = notNull("JWT_SECRET", process.env.JWT_SECRET);
  export const DASHBOARD_DEFAULT_USER = notNull(
    "DASHBOARD_DEFAULT_USER",
    process.env.DASHBOARD_DEFAULT_USER
  );
  export const DASHBOARD_DEFAULT_PASS = notNull(
    "DASHBOARD_DEFAULT_PASS",
    process.env.DASHBOARD_DEFAULT_PASS
  );
}

export const dbUrlParse = parsePostgresUrl(env.DATABASE_URL);
export const isDevelopment = env.NODE_ENV === "development";
