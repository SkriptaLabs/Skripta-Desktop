import { createSignal, Show } from "solid-js";
import { useRepo } from "../../data/repo.context";

export function ServerStatus() {
  const { port, ready } = useRepo();
  const [copied, setCopied] = createSignal(false);

  const mcpUrl = () => `http://localhost:${port()}/mcp`;

  const copy = () => {
    navigator.clipboard.writeText(mcpUrl()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Show
      when={ready()}
      fallback={<span class="text-xs text-foreground/40">Server startet…</span>}
    >
      <div class="flex items-center gap-2">
        <span class="inline-block w-2 h-2 rounded-full bg-green-500" title="Server läuft" />
        <button
          onClick={copy}
          class="text-xs text-foreground/60 hover:text-foreground font-mono transition-colors"
          title="MCP-Endpunkt kopieren"
        >
          {copied() ? "Kopiert ✓" : mcpUrl()}
        </button>
      </div>
    </Show>
  );
}
