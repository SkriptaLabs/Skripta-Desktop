import { createSignal, For, Show } from "solid-js";
import { useI18n } from "solid-compose";
import { ServerForm } from "./ServerForm";
import type { SyncServer } from "../settings.types";
import type { TestStatus } from "../service/servers.service";
import type { Accessor } from "solid-js";

interface ServersListProps {
  servers: Accessor<SyncServer[]>;
  testStatus: Accessor<Record<string, TestStatus>>;
  onAdd: (dto: { name: string; url: string }) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onTest: (id: string, url: string) => Promise<void>;
}

export function ServersList(props: ServersListProps) {
  const [adding, setAdding] = createSignal(false);
  const [confirmDelete, setConfirmDelete] = createSignal<string | null>(null);
  const t = useI18n();

  const handleAdd = async (data: { name: string; url: string }) => {
    await props.onAdd(data);
    setAdding(false);
  };

  const statusLabel = (id: string) => {
    const s = props.testStatus()[id] ?? "idle";
    if (s === "testing") return <span class="text-xs text-foreground/50">…</span>;
    if (s === "ok") return <span class="text-xs text-green-600">{t("servers.testOk")}</span>;
    if (s === "failed") return <span class="text-xs text-red-500">{t("servers.testFail")}</span>;
    return null;
  };

  return (
    <div class="flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-medium">{t("servers.title")}</h3>
        <Show when={!adding()}>
          <button
            onClick={() => setAdding(true)}
            class="text-sm px-3 py-1.5 bg-foreground text-background rounded hover:opacity-80 transition-opacity"
          >
            {t("servers.addServer")}
          </button>
        </Show>
      </div>

      <Show when={adding()}>
        <ServerForm onSave={handleAdd} onCancel={() => setAdding(false)} />
      </Show>

      <Show
        when={props.servers().length > 0}
        fallback={<p class="text-xs text-foreground/40">{t("servers.empty")}</p>}
      >
        <ul class="flex flex-col gap-2">
          <For each={props.servers()}>
            {(server) => (
              <li class="flex items-center justify-between p-3 rounded border border-border gap-3">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <p class="text-sm font-medium">{server.name}</p>
                    <Show when={server.isLocal}>
                      <span class="text-xs px-1.5 py-0.5 rounded bg-muted border border-border text-foreground/50">
                        {t("servers.local")}
                      </span>
                    </Show>
                  </div>
                  <p class="text-xs text-foreground/50 font-mono truncate mt-0.5">{server.url}</p>
                  <div class="mt-0.5">{statusLabel(server.id)}</div>
                </div>
                <div class="flex gap-1 shrink-0">
                  <button
                    onClick={() => props.onTest(server.id, server.url)}
                    class="text-xs px-2 py-1 border border-border rounded hover:bg-muted transition-colors"
                    title={t("servers.test")}
                  >
                    ⟳
                  </button>
                  <Show when={!server.isLocal}>
                    <Show
                      when={confirmDelete() === server.id}
                      fallback={
                        <button
                          onClick={() => setConfirmDelete(server.id)}
                          class="text-xs px-2 py-1 border border-border rounded hover:bg-muted text-foreground/40 hover:text-red-500 transition-colors"
                          title={t("servers.delete")}
                        >
                          ✕
                        </button>
                      }
                    >
                      <div class="flex gap-1">
                        <button
                          onClick={async () => {
                            await props.onRemove(server.id);
                            setConfirmDelete(null);
                          }}
                          class="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                        >
                          {t("servers.delete")}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          class="text-xs px-2 py-1 border border-border rounded hover:bg-muted transition-colors"
                        >
                          {t("spaces.confirmNo")}
                        </button>
                      </div>
                    </Show>
                  </Show>
                </div>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </div>
  );
}
