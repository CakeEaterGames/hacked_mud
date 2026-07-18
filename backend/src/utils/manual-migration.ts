import original_config from "../../drizzle.config";
import { type MigrationConfig, readMigrationFiles } from "drizzle-orm/migrator";

const config = {
  ...original_config,
  migrationsFolder: original_config.out,
  migrationsTable: original_config.migrations?.table ?? "__drizzle_migrations",
  migrationsSchema: original_config.migrations?.schema ?? "drizzle",
} as MigrationConfig;

export function listMigrations() {
  const migrations = readMigrationFiles(config);
  const res = [];
  for (const m of migrations) {
    res.push({ hash: m.hash, folderMillis: m.folderMillis });
  }
  return res;
}
//13
