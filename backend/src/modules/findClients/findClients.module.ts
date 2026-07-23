import { t } from "elysia";

export const HackmudValidPidT = t.Object({
  pid: t.Number(),
  windowId: t.Number(),
  display: t.Number(),
});

export const findClientsRequestT = t.Object({});
export const findClientsResponseT = t.Object({
  clients: t.Array(HackmudValidPidT),
});
