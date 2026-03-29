import { createSignal, createEffect } from "solid-js";
import type { Accessor } from "solid-js";
import type { SyncServer } from "../settings.types";
import {
  getServers,
  createServer,
  deleteServer,
  testConnection,
} from "../data-access/server.api";

export type TestStatus = "idle" | "testing" | "ok" | "failed";

export function useServers(port: Accessor<number | null>) {
  const [servers, setServers] = createSignal<SyncServer[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [testStatus, setTestStatus] = createSignal<Record<string, TestStatus>>({});

  const load = async () => {
    const p = port();
    if (!p) return;
    setLoading(true);
    try {
      const list = await getServers(p);
      setServers(list);
    } finally {
      setLoading(false);
    }
  };

  createEffect(() => {
    if (port()) load();
  });

  const addServer = async (dto: { name: string; url: string }) => {
    const p = port();
    if (!p) return;
    const server = await createServer(p, dto);
    setServers((prev) => [...prev, server]);
    return server;
  };

  const removeServer = async (id: string) => {
    const p = port();
    if (!p) return;
    await deleteServer(p, id);
    setServers((prev) => prev.filter((s) => s.id !== id));
  };

  const testServer = async (id: string, url: string): Promise<{ ok: boolean; latency?: number }> => {
    setTestStatus((prev) => ({ ...prev, [id]: "testing" }));
    const result = await testConnection(url);
    setTestStatus((prev) => ({ ...prev, [id]: result.ok ? "ok" : "failed" }));
    return result;
  };

  const clearTestStatus = (id: string) => {
    setTestStatus((prev) => ({ ...prev, [id]: "idle" }));
  };

  return { servers, loading, testStatus, addServer, removeServer, testServer, clearTestStatus, reload: load };
}
