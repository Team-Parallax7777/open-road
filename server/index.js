// Open Road — placeholder backend service
//
// The game is currently 100% client-side. This server exists so you have
// a deployable backend on Render for future features (multiplayer,
// save-games, leaderboards, photo sharing, etc.).
//
// Endpoints:
//   GET  /          → service info
//   GET  /health    → health check (used by Render)
//   GET  /api/ping  → simple JSON ping
//
// To extend: add WebSocket (socket.io) for multiplayer convoys, or
// connect Supabase for persistent saves.

const http = require("http");

const PORT = process.env.PORT || 10000;

const server = http.createServer((req, res) => {
  // CORS headers so the Vercel frontend can call this API.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url;

  if (url === "/" || url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "ok",
        service: "open-road-api",
        message: "Open Road backend is running. The journey continues here.",
        time: new Date().toISOString(),
      }),
    );
    return;
  }

  if (url === "/api/ping") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ pong: true, ts: Date.now() }));
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, () => {
  console.log(`Open Road API running on port ${PORT}`);
});
