#!/usr/bin/env node
const http = require("http");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const { WebSocketServer } = require("ws");

const DEFAULT_PORT = 43819; // 0xAB2B (agent-b2b)

function parsePort() {
  const portIndex = process.argv.indexOf("--port");
  if (portIndex !== -1 && process.argv[portIndex + 1]) {
    return Number(process.argv[portIndex + 1]);
  }
  return Number(process.env.PORT) || DEFAULT_PORT;
}

const PORT = parsePort();

const htmlPath = path.join(__dirname, "index.html");

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/") {
    const html = fs.readFileSync(htmlPath, "utf-8");
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
  } else if (req.method === "POST" && req.url === "/thinking") {
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
  const url = `http://localhost:${PORT}`;
  console.log(`server listening on ${url}`);
  console.log("POST /thinking  -> set state to thinking");
  console.log("POST /idle      -> set state to idle");
  console.log("WebSocket on same port for browser clients");

  // Open browser
  const cmd =
    process.platform === "darwin" ? "open" :
    process.platform === "win32" ? "start" : "xdg-open";
  exec(`${cmd} ${url}`);
});
