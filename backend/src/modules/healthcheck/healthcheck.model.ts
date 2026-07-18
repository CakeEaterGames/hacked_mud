import { t } from "elysia";

export const healthResponseT = t.Object({
  status: t.Literal("ok"),
  timestamp: t.String({ format: "date-time" }),
});
export type HealthResponse = typeof healthResponseT.static;
