import type { HackmudUpdateEvent } from "@shared/types/HackmudUpdateEvent.model";

//weird how Elysia doesn't have a type for that
export type wsConnection = {
  send: (data: HackmudUpdateEvent) => number;
};
