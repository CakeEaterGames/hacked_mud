/* eslint-disable @typescript-eslint/no-unused-vars */
// eslint ругается на ExternalServicesSelect и др. не смог решить эту проблему

import { boolean, index, integer, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-typebox";
import { t } from "elysia";
import { uuidv7 } from "uuidv7";

function Now() {
  return new Date();
}

const id_macro = {
  id: uuid()
    .primaryKey()
    .$defaultFn(() => uuidv7()),
};
const created_macro = {
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
};
const updated_macro = {
  updated_at: timestamp({ withTimezone: true }).notNull().defaultNow().$onUpdateFn(Now),
};
const created_updated_macro = {
  ...created_macro,
  ...updated_macro,
};

export const clients = pgTable(
  "clients",
  {
    ...id_macro,
    persId: varchar("pers_id").default(""),
    snilsHash: varchar("snils_hash", { length: 64 }).notNull().unique(),
    travelBalance: integer("travel_balance").default(144).notNull(),
    balanceGrantedAt: timestamp("balance_granted_at", { withTimezone: true }),
    isActive: boolean("is_active").default(true),
    isTest: boolean("is_test").default(false),
    ...created_updated_macro,
  },
  table => [index("clients_snils_hash_idx").on(table.snilsHash)]
);
const ClientSelectT = createSelectSchema(clients);

const _ClientInsert = createInsertSchema(clients);
const ClientInsertT = t.Omit(_ClientInsert, [
  "id",
  "created_at",
  "updated_at",
  "balance_granted_at",
]);

export namespace Tables {
  export type ClientSelect = typeof ClientSelectT.static;
  export type ClientInsert = typeof ClientInsertT.static;
}

export const Tables = {
  clients,
};
