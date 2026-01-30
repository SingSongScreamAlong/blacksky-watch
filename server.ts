import http from "http";
import next from "next";
import { WsHub } from "./src/server/ws/WsHub";

const port = parseInt(process.env.PORT ?? "3000", 10);
const dev = process.env.NODE_ENV !== "production";

const app = next({ dev, port });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    const server = http.createServer((req, res) => handle(req, res));

    const wss = WsHub.createServer();

    server.on("upgrade", (req, socket, head) => {
      try {
        const url = new URL(req.url ?? "", `http://${req.headers.host}`);
        if (url.pathname !== "/ws") {
          socket.destroy();
          return;
        }

        wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
      } catch {
        socket.destroy();
      }
    });

    server.listen(port, () => {
      // Intentionally no console noise besides this line.
      console.log(`dev server listening on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
