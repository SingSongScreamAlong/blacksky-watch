export type WsEnvelope<TPayload = unknown> = {
  type: string;
  ts: number;
  payload: TPayload;
};

type Handler = (env: WsEnvelope) => void;

type WsClientOpts = {
  rooms: string[];
  onEnvelope: Handler;
};

export function connectWs(opts: WsClientOpts) {
  const proto = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss" : "ws";
  const host = typeof window !== "undefined" ? window.location.host : "localhost:3000";
  const url = `${proto}://${host}/ws`;

  const ws = new WebSocket(url);

  ws.addEventListener("open", () => {
    for (const room of opts.rooms) {
      ws.send(JSON.stringify({ type: "sub", room }));
    }
  });

  ws.addEventListener("message", (ev) => {
    try {
      const env = JSON.parse(ev.data) as WsEnvelope;
      if (env && typeof env.type === "string" && typeof env.ts === "number") {
        opts.onEnvelope(env);
      }
    } catch {
      // ignore
    }
  });

  return {
    ws,
    close: () => ws.close(),
    send: (msg: unknown) => ws.readyState === ws.OPEN && ws.send(JSON.stringify(msg)),
  };
}
