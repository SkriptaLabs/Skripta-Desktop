import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { randomUUID } from "crypto";
import type { SyncServer } from "../servers.types.js";

const DATA_DIR = join(homedir(), ".scripta");
const STATE_FILE = join(DATA_DIR, "state.json");

function readState(): Record<string, unknown> {
  if (!existsSync(STATE_FILE)) return {};
  return JSON.parse(readFileSync(STATE_FILE, "utf-8"));
}

function writeState(state: Record<string, unknown>): void {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

export function listRemoteServers(): SyncServer[] {
  const state = readState();
  return (state["servers"] as SyncServer[] | undefined) ?? [];
}

export function createServer(dto: { name: string; url: string }): SyncServer {
  const server: SyncServer = {
    id: randomUUID(),
    name: dto.name,
    url: dto.url,
    createdAt: new Date().toISOString(),
  };
  const state = readState();
  const servers = (state["servers"] as SyncServer[] | undefined) ?? [];
  servers.push(server);
  state["servers"] = servers;
  writeState(state);
  return server;
}

export function updateServer(
  id: string,
  patch: Partial<Pick<SyncServer, "name" | "url">>
): SyncServer | undefined {
  const state = readState();
  const servers = (state["servers"] as SyncServer[] | undefined) ?? [];
  const idx = servers.findIndex((s) => s.id === id);
  if (idx === -1) return undefined;
  if (patch.name !== undefined) servers[idx]!.name = patch.name;
  if (patch.url !== undefined) servers[idx]!.url = patch.url;
  state["servers"] = servers;
  writeState(state);
  return servers[idx];
}

export function deleteServer(id: string): boolean {
  const state = readState();
  const servers = (state["servers"] as SyncServer[] | undefined) ?? [];
  const idx = servers.findIndex((s) => s.id === id);
  if (idx === -1) return false;
  servers.splice(idx, 1);
  state["servers"] = servers;
  writeState(state);
  return true;
}
