import { WebSocketServer, type RawData, type WebSocket } from "ws";

export type WsEnvelope<TPayload = unknown> = {
  type: string;
  ts: number;
  payload: TPayload;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

type ClientState = {
  rooms: Set<string>;
};

class WsHubImpl {
  private roomMembers = new Map<string, Set<WebSocket>>();
  private clientState = new WeakMap<WebSocket, ClientState>();

  createServer() {
    const wss = new WebSocketServer({ noServer: true });

    wss.on("connection", (ws: WebSocket) => {
      this.clientState.set(ws, { rooms: new Set() });

      this.send(ws, {
        type: "hello",
        ts: Date.now(),
        payload: { protocol: 1 },
      });

      ws.on("message", (raw: RawData) => {
        let msg: unknown;
        try {
          msg = JSON.parse(raw.toString());
        } catch {
          this.send(ws, {
            type: "error",
            ts: Date.now(),
            payload: { code: "BAD_JSON" },
          });
          return;
        }

        if (isRecord(msg) && msg.type === "sub" && typeof msg.room === "string") {
          this.joinRoom(ws, msg.room);
          this.send(ws, {
            type: "subscribed",
            ts: Date.now(),
            payload: { room: msg.room },
          });
          return;
        }

        if (isRecord(msg) && msg.type === "unsub" && typeof msg.room === "string") {
          this.leaveRoom(ws, msg.room);
          this.send(ws, {
            type: "unsubscribed",
            ts: Date.now(),
            payload: { room: msg.room },
          });
          return;
        }

        this.send(ws, {
          type: "error",
          ts: Date.now(),
          payload: { code: "UNKNOWN_MESSAGE" },
        });
      });

      ws.on("close", () => {
        this.leaveAllRooms(ws);
      });
    });

    return wss;
  }

  broadcast(room: string, envelope: WsEnvelope) {
    const members = this.roomMembers.get(room);
    if (!members) return;
    for (const ws of members) this.send(ws, envelope);
  }

  private send(ws: WebSocket, msg: unknown) {
    if (ws.readyState !== ws.OPEN) return;
    ws.send(JSON.stringify(msg));
  }

  private joinRoom(ws: WebSocket, room: string) {
    const state = this.clientState.get(ws);
    if (!state) return;

    if (!this.roomMembers.has(room)) this.roomMembers.set(room, new Set());
    this.roomMembers.get(room)!.add(ws);
    state.rooms.add(room);
  }

  private leaveRoom(ws: WebSocket, room: string) {
    const state = this.clientState.get(ws);
    const members = this.roomMembers.get(room);
    if (!state || !members) return;

    members.delete(ws);
    state.rooms.delete(room);
    if (members.size === 0) this.roomMembers.delete(room);
  }

  private leaveAllRooms(ws: WebSocket) {
    const state = this.clientState.get(ws);
    if (!state) return;

    for (const room of state.rooms) {
      const members = this.roomMembers.get(room);
      if (!members) continue;
      members.delete(ws);
      if (members.size === 0) this.roomMembers.delete(room);
    }

    state.rooms.clear();
  }
}

export const WsHub = new WsHubImpl();
