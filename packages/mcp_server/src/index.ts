import express from "express";
import cors from "cors";
import { writeFileSync, readFileSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { initRepo, attachWebSocket, getRepoUrls, getSpacesHandle, getSpaceDocHandles } from "./data/repo.js";
import { registerMcpRoutes } from "./mcp/server.js";
import {
  listRemoteServers,
  createServer,
  updateServer,
  deleteServer,
} from "./servers/data-access/servers.repo.js";

const PORT_FILE = join(tmpdir(), "scripta-server.port");
const FILESERVER_PORT_FILE = join(tmpdir(), "scripta-fileserver.port");

// ── Active-Space State ──────────────────────────────────────────────
let _activeSpaceId: string | null = null;

export function getActiveSpaceId(): string | null {
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
    if (typeof spaceId !== "string") {
      res.status(400).json({ error: "spaceId (string) is required" });
      return;
    }
    const spaces = getSpacesHandle().docSync().spaces;
    if (!spaces[spaceId] && !spaces[Number(spaceId)]) {
      res.status(404).json({ error: `Space '${spaceId}' not found` });
      return;
    }
    _activeSpaceId = spaceId;
    const space = spaces[spaceId] ?? spaces[Number(spaceId)];
    res.json({ id: space.id, name: space.name, description: space.description });
  });

  app.get("/active-space", (_req, res) => {
    if (_activeSpaceId === null) {
      res.json(null);
      return;
    }
    const spaces = getSpacesHandle().docSync().spaces;
    const space = spaces[_activeSpaceId] ?? spaces[Number(_activeSpaceId)];
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

  // ── Sync-Server Endpoints ──────────────────────────────────────────
  app.get("/servers", (_req, res) => {
    const remote = listRemoteServers();
    let localUrl: string | null = null;
    if (existsSync(FILESERVER_PORT_FILE)) {
      const raw = readFileSync(FILESERVER_PORT_FILE, "utf-8").trim();
      const p = parseInt(raw);
      if (!isNaN(p) && p > 0) localUrl = `http://localhost:${p}`;
    }
    const local = localUrl
      ? [{ id: "local", name: "Lokal", url: localUrl, isLocal: true, createdAt: "" }]
      : [];
    res.json([...local, ...remote.map((s) => ({ ...s, isLocal: false }))]);
  });

  app.post("/servers", (req, res) => {
    const { name, url } = req.body;
    if (typeof name !== "string" || !name.trim()) {
      res.status(400).json({ error: "name (string) is required" });
      return;
    }
    if (typeof url !== "string" || !url.trim()) {
      res.status(400).json({ error: "url (string) is required" });
      return;
    }
    const server = createServer({ name: name.trim(), url: url.trim() });
    res.status(201).json({ ...server, isLocal: false });
  });

  app.patch("/servers/:id", (req, res) => {
    const { id } = req.params;
    if (id === "local") {
      res.status(400).json({ error: "Local server cannot be modified" });
      return;
    }
    const { name, url } = req.body;
    const updated = updateServer(id, { name, url });
    if (!updated) {
      res.status(404).json({ error: `Server '${id}' not found` });
      return;
    }
    res.json({ ...updated, isLocal: false });
  });

  app.delete("/servers/:id", (req, res) => {
    const { id } = req.params;
    if (id === "local") {
      res.status(400).json({ error: "Local server cannot be deleted" });
      return;
    }
    const ok = deleteServer(id);
    if (!ok) {
      res.status(404).json({ error: `Server '${id}' not found` });
      return;
    }
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
