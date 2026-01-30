export type WsEnvelope<TPayload = unknown> = {
  type: string;
  ts: number;
  payload: TPayload;
};

type Handler = (env: WsEnvelope) => void;

export type WsStatus = "connecting" | "live" | "reconnecting" | "offline";

type WsClientOpts = {
  rooms: string[];
  onEnvelope: Handler;
  onStatus?: (status: WsStatus) => void;
  reconnect?: {
    enabled: boolean;
    initialDelayMs?: number;
    maxDelayMs?: number;
  };
};

export function connectWs(opts: WsClientOpts) {
  const proto = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss" : "ws";
  const host = typeof window !== "undefined" ? window.location.host : "localhost:3000";
  const url = `${proto}://${host}/ws`;

  const reconnectEnabled = opts.reconnect?.enabled ?? true;
  const initialDelayMs = opts.reconnect?.initialDelayMs ?? 350;
  const maxDelayMs = opts.reconnect?.maxDelayMs ?? 5000;

  let ws: WebSocket | null = null;
  let stopped = false;
  let attempt = 0;
  let timer: number | null = null;

  const setStatus = (s: WsStatus) => opts.onStatus?.(s);

  function clearTimer() {
    if (timer) window.clearTimeout(timer);
    timer = null;
  }

  function scheduleReconnect() {
    if (stopped) return;
    if (!reconnectEnabled) {
      setStatus("offline");
      return;
    }
    attempt += 1;
    const delay = Math.min(maxDelayMs, initialDelayMs * Math.pow(1.35, attempt));
    setStatus("reconnecting");
    clearTimer();
    timer = window.setTimeout(() => {
      connect();
    }, delay);
  }

  function connect() {
    if (stopped) return;
    clearTimer();
    setStatus(attempt === 0 ? "connecting" : "reconnecting");

    ws = new WebSocket(url);

    ws.addEventListener("open", () => {
      attempt = 0;
      setStatus("live");
      for (const room of opts.rooms) {
        ws?.send(JSON.stringify({ type: "sub", room }));
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

    ws.addEventListener("close", () => {
      ws = null;
      scheduleReconnect();
    });

    ws.addEventListener("error", () => {
      // close triggers reconnect logic
      try {
        ws?.close();
      } catch {
        // ignore
      }
    });
  }

  connect();

  return {
    get ws() {
      return ws;
    },
    close: () => {
      stopped = true;
      clearTimer();
      try {
        ws?.close();
      } catch {
        // ignore
      }
      ws = null;
      setStatus("offline");
    },
    send: (msg: unknown) => {
      if (!ws) return false;
      if (ws.readyState !== ws.OPEN) return false;
      ws.send(JSON.stringify(msg));
      return true;
    },
  };
}
