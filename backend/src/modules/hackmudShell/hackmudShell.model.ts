import { t } from "elysia";

export const getShellContentsRequestT = t.Object({});
export type getShellContentsRequest = typeof getShellContentsRequestT.static;

export const getShellContentsResponseT = t.Object({
  data: t.Array(t.String()),
});
export type getShellContentsResponse = typeof getShellContentsResponseT.static;
