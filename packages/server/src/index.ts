import express from "express";
import cors from "cors";
import { writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { initRepo, attachWebSocket, getRepoUrls, getSpacesHandle, getSpaceDocHandles } from "./data/repo.js";
import { registerMcpRoutes } from "./mcp/server.js";

const PORT_FILE = join(tmpdir(), "scripta-server.port");

// ── Active-Space State ──────────────────────────────────────────────
let _activeSpaceId: number | null = null;

export function getActiveSpaceId(): number | null {
  return _activeSpaceId;
}

async function main() {
  // Automerge Repo initialisieren
  await initRepo();

  const app = express();

  app.use(cors({ origin: "http://localhost:1420" }));
  app.use(express.json());

  // ── Repo-URLs für WebView ──────────────────────────────────────────
  app.get("/repo-urls", (_req, res) => res.json(getRepoUrls()));

  // ── Active-Space Endpoints ────────────────────────────────────────
  app.post("/active-space", (req, res) => {
    const { spaceId } = req.body;
    if (typeof spaceId !== "number") {
      res.status(400).json({ error: "spaceId (number) is required" });
      return;
    }
    const spaces = getSpacesHandle().docSync().spaces;
    if (!spaces[spaceId]) {
      res.status(404).json({ error: `Space '${spaceId}' not found` });
      return;
    }
    _activeSpaceId = spaceId;
    const space = spaces[spaceId];
    res.json({ id: space.id, name: space.name, description: space.description });
  });

  app.get("/active-space", (_req, res) => {
    if (_activeSpaceId === null) {
      res.json(null);
      return;
    }
    const spaces = getSpacesHandle().docSync().spaces;
    const space = spaces[_activeSpaceId];
    if (!space) {
      _activeSpaceId = null;
      res.json(null);
      return;
    }
    res.json({ id: space.id, name: space.name, description: space.description });
  });

  app.delete("/active-space", (_req, res) => {
    _activeSpaceId = null;
    res.json({ ok: true });
  });

  // ── MCP Endpunkt ────────────────────────────────────────────────────
  registerMcpRoutes(app);

  // ── Server starten: fester Dev-Port oder dynamisch ────────────────
  // DEV_PORT=3456 npm run dev:server für fixen Port (z.B. für VS Code MCP)
  const desiredPort = process.env["DEV_PORT"] ? parseInt(process.env["DEV_PORT"]) : 0;
  const server = app.listen(desiredPort, "localhost", () => {
    const addr = server.address();
    if (!addr || typeof addr === "string") return;
    const port = addr.port;

    // Port in Temp-Datei schreiben → Tauri liest ihn daraus
    writeFileSync(PORT_FILE, String(port));

    // WebSocket-Sync auf demselben HTTP-Server
    attachWebSocket(server);

    console.log(`Scripta server running on http://localhost:${port}`);
    console.log(`MCP endpoint: http://localhost:${port}/mcp`);
    console.log(`Automerge WS sync: ws://localhost:${port}`);
  });

  // Graceful shutdown
  const shutdown = () => {
    server.close(() => process.exit(0));
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((err) => {
  console.error("Server startup failed:", err);
  process.exit(1);
});
