import { invoke } from "@tauri-apps/api/core";
import type { SyncServer } from "../settings.types";

// Fragt den Tauri-Core nach dem laufenden Server-Port
export async function getServerPort(): Promise<number> {
  return invoke<number>("get_server_port");
}

export async function getServers(port: number): Promise<SyncServer[]> {
  const res = await fetch(`http://localhost:${port}/servers`);
  if (!res.ok) throw new Error("Failed to fetch servers");
  return res.json();
}

export async function createServer(
  port: number,
  dto: { name: string; url: string }
): Promise<SyncServer> {
  const res = await fetch(`http://localhost:${port}/servers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error("Failed to create server");
  return res.json();
}

export async function updateServer(
  port: number,
  id: string,
  patch: { name?: string; url?: string }
): Promise<SyncServer> {
  const res = await fetch(`http://localhost:${port}/servers/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error("Failed to update server");
  return res.json();
}

export async function deleteServer(port: number, id: string): Promise<void> {
  const res = await fetch(`http://localhost:${port}/servers/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete server");
}

export async function testConnection(url: string): Promise<{ ok: boolean; latency?: number }> {
  const start = Date.now();
  try {
    const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return { ok: false };
    const data = await res.json();
    return { ok: data.ok === true, latency: Date.now() - start };
  } catch {
    return { ok: false };
  }
}

