import { log } from "@backend/plugins/logger/logger";
import type { wsConnection } from "./socketServer.model";
import type {
  FullClientListUpdate,
  HackmudUpdateEvent,
} from "@shared/types/HackmudUpdateEvent.model";
import { HackmudClients } from "../findClients/findClients.service";

export abstract class socketServerService {
  static connections = new Map<string, wsConnection>();

  static onHackmudEvent(event: HackmudUpdateEvent) {
    log.debug("Updated " + event.type);
    for (const con of this.connections.values()) {
      con.send(event);
    }
  }

  static async sendClientList(ws: wsConnection) {
    const clients = [];
    for (const reader of HackmudClients.entries()) {
      clients.push({
        pid: reader[0],
        gameState: await reader[1].memoryReader.readGameState(),
        shellState: await reader[1].memoryReader.readShell(),
      });
    }

    ws.send({
      type: "FullClientListUpdate",
      clients,
    } satisfies FullClientListUpdate);
  }
}
