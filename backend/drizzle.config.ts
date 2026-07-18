import "dotenv/config";
import { defineConfig } from "drizzle-kit";
import { env } from "./src/config";
export default defineConfig({
  out: "./drizzle",
  schema: "./src/database/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
  migrations: {},
});
