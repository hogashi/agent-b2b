const http = require("http");
const { WebSocketServer } = require("ws");

const PORT = 3000;

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/thinking") {
    broadcast({ state: "thinking" });
    res.writeHead(200);
    res.end("ok");
  } else if (req.method === "POST" && req.url === "/idle") {
    broadcast({ state: "idle" });
    res.writeHead(200);
    res.end("ok");
  } else {
    res.writeHead(404);
    res.end("not found");
  }
});

const wss = new WebSocketServer({ server });

function broadcast(data) {
  const msg = JSON.stringify(data);
  for (const client of wss.clients) {
    if (client.readyState === 1) {
      client.send(msg);
    }
  }
}

wss.on("connection", (ws) => {
  console.log("client connected");
  ws.on("close", () => console.log("client disconnected"));
});

server.listen(PORT, () => {
  console.log(`server listening on http://localhost:${PORT}`);
  console.log("POST /thinking  -> set state to thinking");
  console.log("POST /idle      -> set state to idle");
  console.log("WebSocket on same port for browser clients");
});
