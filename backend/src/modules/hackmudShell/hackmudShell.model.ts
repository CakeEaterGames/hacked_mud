import { t } from "elysia";

export const getShellContentsRequestT = t.Object({
  pid: t.Number(),
});
export type getShellContentsRequest = typeof getShellContentsRequestT.static;

export const getShellContentsResponseT = t.Object({
  data: t.Array(t.String()),
});
export type getShellContentsResponse = typeof getShellContentsResponseT.static;

export const SendCmdRequestT = t.Object({
  pid: t.Number(),
  cmd: t.String(),
});
export type SendCmdRequest = typeof SendCmdRequestT.static;

export const SendCmdResponseT = t.Object({
  response: t.Array(t.String()),
  fullShell: t.Array(t.String()),
});
export type SendCmdResponse = typeof SendCmdResponseT.static;
