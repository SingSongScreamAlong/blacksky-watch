import http from "http";
import next from "next";
import { WebSocketServer, type RawData, type WebSocket } from "ws";

type WsEnvelope<TPayload = unknown> = {
  type: string;
  ts: number;
  payload: TPayload;
};

type ClientState = {
  rooms: Set<string>;
};

const port = parseInt(process.env.PORT ?? "3000", 10);
const dev = process.env.NODE_ENV !== "production";

const app = next({ dev, port });
const handle = app.getRequestHandler();

const roomMembers = new Map<string, Set<WebSocket>>();
const clientState = new WeakMap<WebSocket, ClientState>();

function wsSend(ws: WebSocket, msg: unknown) {
  if (ws.readyState !== ws.OPEN) return;
  ws.send(JSON.stringify(msg));
}

function joinRoom(ws: WebSocket, room: string) {
  const state = clientState.get(ws);
  if (!state) return;

  if (!roomMembers.has(room)) roomMembers.set(room, new Set());
  roomMembers.get(room)!.add(ws);
  state.rooms.add(room);
}

function leaveAllRooms(ws: WebSocket) {
  const state = clientState.get(ws);
  if (!state) return;
  for (const room of state.rooms) {
    const set = roomMembers.get(room);
    if (!set) continue;
    set.delete(ws);
    if (set.size === 0) roomMembers.delete(room);
  }
  state.rooms.clear();
}

export function broadcast(room: string, envelope: WsEnvelope) {
  const members = roomMembers.get(room);
  if (!members) return;
  for (const ws of members) wsSend(ws, envelope);
}

app
  .prepare()
  .then(() => {
    const server = http.createServer((req, res) => handle(req, res));

    const wss = new WebSocketServer({ noServer: true });

    server.on("upgrade", (req, socket, head) => {
      try {
        const url = new URL(req.url ?? "", `http://${req.headers.host}`);
        if (url.pathname !== "/ws") {
          socket.destroy();
          return;
        }

        wss.handleUpgrade(req, socket, head, (ws: WebSocket) => {
          wss.emit("connection", ws, req);
        });
      } catch {
        socket.destroy();
      }
    });

    wss.on("connection", (ws: WebSocket) => {
      clientState.set(ws, { rooms: new Set() });

      wsSend(ws, {
        type: "hello",
        ts: Date.now(),
        payload: { protocol: 1 },
      } satisfies WsEnvelope);

      ws.on("message", (raw: RawData) => {
        let msg: any;
        try {
          msg = JSON.parse(raw.toString());
        } catch {
          wsSend(ws, {
            type: "error",
            ts: Date.now(),
            payload: { code: "BAD_JSON" },
          } satisfies WsEnvelope);
          return;
        }

        if (msg?.type === "sub" && typeof msg.room === "string") {
          joinRoom(ws, msg.room);
          wsSend(ws, {
            type: "subscribed",
            ts: Date.now(),
            payload: { room: msg.room },
          } satisfies WsEnvelope);
          return;
        }

        if (msg?.type === "unsub" && typeof msg.room === "string") {
          const state = clientState.get(ws);
          const set = roomMembers.get(msg.room);
          if (state && set) {
            set.delete(ws);
            state.rooms.delete(msg.room);
            if (set.size === 0) roomMembers.delete(msg.room);
          }
          wsSend(ws, {
            type: "unsubscribed",
            ts: Date.now(),
            payload: { room: msg.room },
          } satisfies WsEnvelope);
          return;
        }

        wsSend(ws, {
          type: "error",
          ts: Date.now(),
          payload: { code: "UNKNOWN_MESSAGE" },
        } satisfies WsEnvelope);
      });

      ws.on("close", () => {
        leaveAllRooms(ws);
      });
    });

    server.listen(port, () => {
      // Intentionally no console noise besides this line.
      // eslint-disable-next-line no-console
      console.log(`dev server listening on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
