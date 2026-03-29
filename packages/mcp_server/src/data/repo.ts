import { Repo } from "@automerge/automerge-repo";
import { NodeFSStorageAdapter } from "@automerge/automerge-repo-storage-nodefs";
import { NodeWSServerAdapter } from "@automerge/automerge-repo-network-websocket";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { WebSocketServer } from "ws";
import type { AutomergeUrl, DocHandle } from "@automerge/automerge-repo";
import type { Server as HttpServer } from "http";
import type { SpacesCollection, Space } from "../spaces/spaces.types.js";

// Re-export types used by feature repos
export type { Space, SpacesCollection };

export interface Note {
  id: string;
  title: string;
  content: string;
  space: "userspace" | "aispace";
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

export interface Source {
  id: string;
  title: string;
  authors: string[];
  year?: number;
  url?: string;
  quotes: { id: string; text: string; page?: string; note?: string }[];
  createdAt: string;
}

export interface NotesCollection {
  notes: Record<string, Note>;
}

export interface SourcesCollection {
  sources: Record<string, Source>;
}

interface RepoState {
  spacesUrl: string;
  servers?: unknown[];
}

const DATA_DIR = join(homedir(), ".scripta");
const STATE_FILE = join(DATA_DIR, "state.json");

let _repo: Repo;
let _spacesHandle: DocHandle<SpacesCollection>;

export async function initRepo() {
  mkdirSync(DATA_DIR, { recursive: true });

  _repo = new Repo({
    storage: new NodeFSStorageAdapter(join(DATA_DIR, "automerge")),
  });

  // Migrate or load state.json
  if (existsSync(STATE_FILE)) {
    const raw = JSON.parse(readFileSync(STATE_FILE, "utf-8"));

    if (raw.spacesUrl) {
      // New format
      _spacesHandle = await _repo.find<SpacesCollection>(raw.spacesUrl as AutomergeUrl);
    } else {
      // Old format (userspaceUrl/aispaceUrl/sourcesUrl) — create fresh spaces doc
      _spacesHandle = _repo.create<SpacesCollection>({ spaces: {} });
      writeFileSync(STATE_FILE, JSON.stringify({ spacesUrl: _spacesHandle.url, servers: [] }, null, 2));
    }

    // Migrate: ensure servers field exists
    if (!Array.isArray(raw.servers)) {
      raw.servers = [];
      writeFileSync(STATE_FILE, JSON.stringify(raw, null, 2));
    }
  } else {
    _spacesHandle = _repo.create<SpacesCollection>({ spaces: {} });
    writeFileSync(STATE_FILE, JSON.stringify({ spacesUrl: _spacesHandle.url, servers: [] }, null, 2));
  }

  await _spacesHandle.whenReady();
}

export function getRepo(): Repo {
  return _repo;
}

export function getSpacesHandle() {
  return _spacesHandle as unknown as {
    url: AutomergeUrl;
    docSync(): SpacesCollection;
    change(fn: (doc: SpacesCollection) => void): void;
  };
}

export async function getSpaceDocHandles(spaceId: string) {
  const spaces = getSpacesHandle().docSync().spaces;
  const space = spaces[spaceId] ?? spaces[Number(spaceId)];
  if (!space) throw new Error(`Space '${spaceId}' not found`);

  const [userspace, aispace, sources] = await Promise.all([
    _repo.find<NotesCollection>(space.userspaceUrl as AutomergeUrl),
    _repo.find<NotesCollection>(space.aispaceUrl as AutomergeUrl),
    _repo.find<SourcesCollection>(space.sourcesUrl as AutomergeUrl),
  ]);

  await Promise.all([
    userspace.whenReady(),
    aispace.whenReady(),
    sources.whenReady(),
  ]);

  return {
    userspace: userspace as unknown as {
      docSync(): NotesCollection;
      change(fn: (doc: NotesCollection) => void): void;
    },
    aispace: aispace as unknown as {
      docSync(): NotesCollection;
      change(fn: (doc: NotesCollection) => void): void;
    },
    sources: sources as unknown as {
      docSync(): SourcesCollection;
      change(fn: (doc: SourcesCollection) => void): void;
    },
  };
}

/** Hängt einen WebSocket-Adapter an das Repo — aufrufen NACH app.listen() */
export function attachWebSocket(httpServer: HttpServer) {
  const wss = new WebSocketServer({ server: httpServer });
  const adapter = new NodeWSServerAdapter(wss as any);
  _repo.networkSubsystem.addNetworkAdapter(adapter);
  console.log("Automerge WebSocket sync active (shared HTTP server)");
}

/** Gibt die Automerge-URLs zurück, damit der WebView sie per repo.find() laden kann */
export function getRepoUrls() {
  return {
    spacesUrl: _spacesHandle.url,
  };
}
