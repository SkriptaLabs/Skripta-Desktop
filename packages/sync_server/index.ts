import express from "express";
import cors from "cors";
import { writeFileSync, mkdirSync } from "fs";
import { tmpdir, homedir } from "os";
import { join } from "path";
import { Repo } from "@automerge/automerge-repo";
import { NodeFSStorageAdapter } from "@automerge/automerge-repo-storage-nodefs";
import { NodeWSServerAdapter } from "@automerge/automerge-repo-network-websocket";
import { WebSocketServer } from "ws";

const PORT_FILE = join(tmpdir(), "scripta-fileserver.port");
const DATA_DIR = join(homedir(), ".scripta", "fileserver");

async function main() {
  mkdirSync(DATA_DIR, { recursive: true });

  const repo = new Repo({
    storage: new NodeFSStorageAdapter(DATA_DIR),
  });

  const app = express();

  // Health endpoint — CORS * for browser connection testing
  app.get("/health", cors(), (_req, res) => {
    res.json({ ok: true, version: "1.0.0" });
  });

  const desiredPort = process.env["FILE_SERVER_PORT"]
    ? parseInt(process.env["FILE_SERVER_PORT"])
    : 0;

  const server = app.listen(desiredPort, () => {
    const addr = server.address();
    if (!addr || typeof addr === "string") return;
    const port = addr.port;

    writeFileSync(PORT_FILE, String(port));

    const wss = new WebSocketServer({ server });
    repo.networkSubsystem.addNetworkAdapter(new NodeWSServerAdapter(wss as any));

    console.log(`Scripta file-server running on http://localhost:${port}`);
    console.log(`Automerge WS sync: ws://localhost:${port}`);
  });

  const shutdown = () => {
    server.close(() => process.exit(0));
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((err) => {
  console.error("File server startup failed:", err);
  process.exit(1);
});
