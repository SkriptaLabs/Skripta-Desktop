import { createSignal, createEffect, Show } from "solid-js";
import { useRepo } from "../../data/repo.context";
import { getServers } from "../data-access/server.api";
import { useI18n } from "solid-compose";

/**
 * Shows the MCP server status and — if the active space has a syncServerId —
 * the connected remote file server, all in one compact status bar.
 */
export function SpaceServerStatus() {
  const { port, ready, activeSpace } = useRepo();
  const [copiedMcp, setCopiedMcp] = createSignal(false);
  const [syncServerName, setSyncServerName] = createSignal<string | null>(null);
  const [syncServerUrl, setSyncServerUrl] = createSignal<string | null>(null);
  const t = useI18n();

  const mcpUrl = () => `http://localhost:${port()}/mcp`;

  const copyMcp = () => {
    navigator.clipboard.writeText(mcpUrl()).then(() => {
      setCopiedMcp(true);
      setTimeout(() => setCopiedMcp(false), 2000);
    });
  };

  // Resolve syncServerId → name + url whenever the active space changes
  createEffect(() => {
    const space = activeSpace();
    const p = port();
    if (!space?.syncServerId || !p) {
      setSyncServerName(null);
      setSyncServerUrl(null);
      return;
    }
    getServers(p).then((servers) => {
      const server = servers.find((s) => s.id === space.syncServerId);
      setSyncServerName(server?.name ?? null);
      setSyncServerUrl(server?.url ?? null);
    }).catch(() => {
      setSyncServerName(null);
      setSyncServerUrl(null);
    });
  });

  return (
    <Show
      when={ready()}
      fallback={<span class="text-xs text-foreground/40">{t('server.starting')}</span>}
    >
      <div class="flex items-center gap-3">
        {/* MCP Server */}
        <div class="flex items-center gap-1.5">
          <span class="inline-block w-2 h-2 rounded-full bg-green-500 shrink-0" title={t('server.running')} />
          <button
            onClick={copyMcp}
            class="text-xs text-foreground/60 hover:text-foreground font-mono transition-colors"
            title={t('server.copyEndpoint')}
          >
            {copiedMcp() ? t('server.copied') : "MCP"}
          </button>
        </div>

        {/* Sync Server (only when space has one) */}
        <Show when={syncServerName()}>
          {(name) => (
            <div class="flex items-center gap-1.5">
              <span class="w-px h-3 bg-border" />
              <span class="inline-block w-2 h-2 rounded-full bg-blue-500 shrink-0" title={syncServerUrl() ?? ""} />
              <span class="text-xs text-foreground/60 font-mono" title={syncServerUrl() ?? ""}>
                {name()}
              </span>
            </div>
          )}
        </Show>
      </div>
    </Show>
  );
}
