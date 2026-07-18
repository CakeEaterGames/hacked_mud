import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { env } from "../config";
import { Pool } from "pg";
import { log } from "@backend/plugins/logger/logger";

let pool: Pool;

function createPoolWithRetry() {
  log.info("Attempting to connect to database...");

  pool = new Pool({
    connectionString: env.DATABASE_URL,
    keepAlive: true,
    min: 0,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    maxUses: 7500,
  });

  pool.on("error", (err, client) => {
    log.error("Unexpected error on idle client {err}", { err });
    if (client) {
      client.release(true);
    }
  });

  const connectWithRetry = (retries = 5, delay = 5000) => {
    pool.connect((err, client, release) => {
      if (err) {
        log.error(`Failed to connect to database (${retries} retries left): ${err.message}`);

        if (retries > 0) {
          setTimeout(() => {
            connectWithRetry(retries - 1, delay);
          }, delay);
        } else {
          log.error("Max retries reached. Will continue trying in background...");
          setInterval(() => {
            pool.connect(connectErr => {
              if (!connectErr) {
                log.info("Database connection restored!");
              }
            });
          }, 30000);
        }
      } else {
        log.info("Database connected successfully");
        release();
      }
    });
  };

  connectWithRetry();

  return pool;
}

// Initialize pool with retry
pool = createPoolWithRetry();
const db = drizzle({ client: pool, schema });
export { db, pool };
