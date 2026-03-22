import { createSignal, Show } from "solid-js";
import { useRepo } from "../../data/repo.context";
import { useI18n } from "solid-compose";

export function ServerStatus() {
  const { port, ready } = useRepo();
  const [copied, setCopied] = createSignal(false);
  const t = useI18n();

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
      fallback={<span class="text-xs text-foreground/40">{t('server.starting')}</span>}
    >
      <div class="flex items-center gap-2">
        <span class="inline-block w-2 h-2 rounded-full bg-green-500" title={t('server.running')} />
        <button
          onClick={copy}
          class="text-xs text-foreground/60 hover:text-foreground font-mono transition-colors"
          title={t('server.copyEndpoint')}
        >
          {copied() ? t('server.copied') : mcpUrl()}
        </button>
      </div>
    </Show>
  );
}
