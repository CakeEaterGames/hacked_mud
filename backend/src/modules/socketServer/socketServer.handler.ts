import { loggerConfigPlugin } from "@backend/plugins/logger/logger.plugin";
import { HackmudUpdateEventT } from "@shared/types/HackmudUpdateEvent.model";
import Elysia from "elysia";
import { log } from "@backend/plugins/logger/logger";
import { socketServerService } from "./socketServer.service";

export const socketServerHandler = new Elysia().use(loggerConfigPlugin).ws("ws", {
  response: HackmudUpdateEventT,
  open(ws) {
    log.debug("WS open {id}", { id: ws.id });
    socketServerService.connections.set(ws.id, ws);
    socketServerService.sendClientList(ws);
  },
  close(ws) {
    log.debug("WS close {id}", { id: ws.id });
    socketServerService.connections.delete(ws.id);
  },
});
