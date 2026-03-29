import { createSignal, Show } from "solid-js";
import { useI18n } from "solid-compose";
import { testConnection } from "../data-access/server.api";

interface ServerFormProps {
  onSave: (data: { name: string; url: string }) => void;
  onCancel: () => void;
}

export function ServerForm(props: ServerFormProps) {
  const [name, setName] = createSignal("");
  const [url, setUrl] = createSignal("");
  const [error, setError] = createSignal<string | null>(null);
  const [testState, setTestState] = createSignal<"idle" | "testing" | "ok" | "failed">("idle");
  const [latency, setLatency] = createSignal<number | undefined>(undefined);
  const t = useI18n();

  const handleTest = async () => {
    const u = url().trim();
    if (!u) {
      setError(t("servers.urlRequired"));
      return;
    }
    setTestState("testing");
    setError(null);
    const result = await testConnection(u);
    setTestState(result.ok ? "ok" : "failed");
    setLatency(result.latency);
  };

  const handleSubmit = (e: Event & { currentTarget: HTMLFormElement }) => {
    e.preventDefault();
    setError(null);

    const n = name().trim();
    const u = url().trim();

    if (!n) { setError(t("servers.nameRequired")); return; }
    if (!u) { setError(t("servers.urlRequired")); return; }
    if (testState() !== "ok") { setError(t("servers.testFirst")); return; }

    props.onSave({ name: n, url: u });
  };

  const urlChanged = () => {
    if (testState() !== "idle") setTestState("idle");
  };

  return (
    <form onSubmit={handleSubmit} class="flex flex-col gap-3 p-4 border border-border rounded bg-muted">
      <h3 class="text-sm font-medium">{t("servers.addServer")}</h3>

      <Show when={error()}>
        {(err) => <p class="text-xs text-red-500">{err()}</p>}
      </Show>

      <input
        autofocus
        type="text"
        placeholder={t("servers.namePlaceholder")}
        value={name()}
        onInput={(e) => setName(e.currentTarget.value)}
        class="text-sm px-3 py-1.5 border border-border rounded bg-background focus:outline-none"
      />

      <div class="flex gap-2">
        <input
          type="url"
          placeholder={t("servers.urlPlaceholder")}
          value={url()}
          onInput={(e) => { setUrl(e.currentTarget.value); urlChanged(); }}
          class="flex-1 text-sm px-3 py-1.5 border border-border rounded bg-background focus:outline-none"
        />
        <button
          type="button"
          onClick={handleTest}
          disabled={testState() === "testing"}
          class="text-sm px-3 py-1.5 border border-border rounded hover:bg-muted transition-colors disabled:opacity-50"
        >
          {testState() === "testing" ? "…" : t("servers.test")}
        </button>
      </div>

      <Show when={testState() === "ok"}>
        <p class="text-xs text-green-600">
          {t("servers.testOk")}{latency() !== undefined ? ` (${latency()}ms)` : ""}
        </p>
      </Show>
      <Show when={testState() === "failed"}>
        <p class="text-xs text-red-500">{t("servers.testFail")}</p>
      </Show>

      <div class="flex gap-2 justify-end">
        <button
          type="button"
          onClick={props.onCancel}
          class="text-sm px-3 py-1.5 border border-border rounded hover:bg-muted transition-colors"
        >
          {t("spaceForm.cancel")}
        </button>
        <button
          type="submit"
          disabled={testState() !== "ok"}
          class="text-sm px-3 py-1.5 bg-foreground text-background rounded hover:opacity-80 transition-opacity disabled:opacity-40"
        >
          {t("servers.save")}
        </button>
      </div>
    </form>
  );
}
