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
  response: t.String(),
  fullShell: t.Optional(t.String()),
});
export type SendCmdResponse = typeof SendCmdResponseT.static;

export const SetScenarioRequestT = t.Object({
  pid: t.Number(),
  scenario: t.String(),
});
export type SetScenarioRequest = typeof SetScenarioRequestT.static;

export const SetScenarioResponseT = t.Object({
  response: t.Literal("OK"),
});
export type SetScenarioResponse = typeof SetScenarioResponseT.static;
