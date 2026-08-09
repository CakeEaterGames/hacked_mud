import { log } from "@backend/plugins/logger/logger";
import type { wsConnection } from "./socketServer.model";
import {
  type FullClientListUpdate,
  type HackmudUpdateEvent,
  type FullClient,
} from "@shared/types/HackmudUpdateEvent.model";
import { HackmudClients } from "../findClients/findClients.service";

export abstract class socketServerService {
  static connections = new Map<string, wsConnection>();

  static onHackmudEvent(event: HackmudUpdateEvent) {
    // log.debug("Updated " + event.type);
    for (const con of this.connections.values()) {
      con.send(event);
    }
  }

  static sendClientList(ws: wsConnection) {
    const clients = [];
    for (const reader of HackmudClients.entries()) {
      if (!reader[1].gameState) continue;
      if (!reader[1].shellState) continue;
      clients.push({
        pid: reader[0],
        gameState: reader[1].gameState,
        shellState: reader[1].shellState,
        gameStats: reader[1].gameStats,
      } satisfies FullClient);
    }

    ws.send({
      type: "FullClientListUpdate",
      clients,
    } satisfies FullClientListUpdate);
  }

  static broadcastClientList() {
    for (const connection of this.connections) {
      this.sendClientList(connection[1]);
    }
  }
}
