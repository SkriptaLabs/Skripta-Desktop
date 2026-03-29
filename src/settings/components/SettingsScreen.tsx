import { useI18n } from "solid-compose";
import { ServersList } from "./ServersList";
import { useServers } from "../service/servers.service";
import { useRepo } from "../../data/repo.context";

interface SettingsScreenProps {
  onBack: () => void;
}

export function SettingsScreen(props: SettingsScreenProps) {
  const { port } = useRepo();
  const { servers, testStatus, addServer, removeServer, testServer } = useServers(port);
  const t = useI18n();

  return (
    <div class="flex flex-col h-full bg-background text-foreground">
      <header class="flex items-center gap-3 px-4 py-3 border-b border-border">
        <button
          onClick={props.onBack}
          class="text-sm px-2 py-1 rounded border border-border hover:bg-muted transition-colors"
          title={t("settings.back")}
        >
          ←
        </button>
        <h2 class="text-base font-semibold">{t("settings.title")}</h2>
      </header>

      <main class="flex-1 overflow-auto p-6">
        <div class="max-w-2xl mx-auto">
          <ServersList
            servers={servers}
            testStatus={testStatus}
            onAdd={addServer}
            onRemove={removeServer}
            onTest={testServer}
          />
        </div>
      </main>
    </div>
  );
}
