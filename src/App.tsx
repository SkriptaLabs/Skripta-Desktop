import { createSignal, createEffect, Show } from "solid-js";
import { NotesPanel } from "./notes/components/NotesPanel";
import { AiSpacePanel } from "./aispace/components/AiSpacePanel";
import { SourcesPanel } from "./sources/components/SourcesPanel";
import { ServerStatus } from "./settings/components/ServerStatus";
import { RepoProvider, useRepo } from "./data/repo.context";
import { SpacesList } from "./spaces/components/SpacesList";
import { useSpaces } from "./spaces/service/spaces.service";
import { MenuLevel } from "./menu/MenuLevel";
import type { MenuItem } from "./menu/menu.types";
import { ThemeSwitcher } from "./themes/components/ThemeSwitcher";

function AppContent() {
  const { activeSpace, leaveSpace, spacesHandle } = useRepo();
  const { editSpace } = useSpaces(spacesHandle);
  const [showAiSpace, setShowAiSpace] = createSignal(false);
  const [editingName, setEditingName] = createSignal(false);
  const [nameValue, setNameValue] = createSignal("");
  let nameInputRef: HTMLInputElement | undefined;

  createEffect(() => {
    if (editingName() && nameInputRef) {
      nameInputRef.focus();
      nameInputRef.select();
    }
  });

  const commitName = () => {
    const trimmed = nameValue().trim();
    const space = activeSpace();
    if (space && trimmed && trimmed !== space.name) {
      editSpace(space.id, { name: trimmed });
    }
    setEditingName(false);
  };

  const mainMenuItems: MenuItem[] = [
    { id: "notes", label: "Notizen", component: NotesPanel },
    { id: "sources", label: "Quellen", component: SourcesPanel },
  ];

  return (
    <Show
      when={activeSpace()}
      fallback={
        <div class="flex flex-col h-screen bg-background text-foreground">
          <header class="flex items-center justify-between px-4 py-2 border-b border-border">
            <h1 class="text-lg font-semibold tracking-tight">Scripta</h1>
            <div class="flex items-center gap-3">
              <ThemeSwitcher />
              <ServerStatus />
            </div>
          </header>
          <main class="flex-1 overflow-auto">
            <SpacesList />
          </main>
        </div>
      }
    >
      {(space) => (
        <div class="flex flex-col h-screen bg-background text-foreground">
          <header class="flex items-center justify-between px-4 py-2 border-b border-border">
            <div class="flex items-center gap-3">
              <button
                onClick={leaveSpace}
                class="text-sm px-2 py-1 rounded border border-border hover:bg-muted transition-colors"
                title="Zurück zur Space-Übersicht"
              >
                ←
              </button>
              <div>
                <Show
                  when={editingName()}
                  fallback={
                    <h1
                      class="text-lg font-semibold tracking-tight cursor-pointer hover:underline decoration-foreground/30"
                      onClick={() => {
                        setNameValue(space().name);
                        setEditingName(true);
                      }}
                      title="Klicken um umzubenennen"
                    >
                      {space().name}
                    </h1>
                  }
                >
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={nameValue()}
                    onInput={(e) => setNameValue(e.currentTarget.value)}
                    onBlur={commitName}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitName();
                      if (e.key === "Escape") setEditingName(false);
                    }}
                    class="text-lg font-semibold tracking-tight bg-background border-b border-foreground/50 focus:border-foreground outline-none w-full px-1"
                  />
                </Show>
                <p class="text-xs text-foreground/50">{space().description}</p>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <ServerStatus />
              <ThemeSwitcher />
              <button
                onClick={() => setShowAiSpace(!showAiSpace())}
                class="text-sm px-3 py-1 rounded border border-border hover:bg-muted transition-colors"
              >
                {showAiSpace() ? "KI-Space ausblenden" : "KI-Space anzeigen"}
              </button>
            </div>
          </header>

          <div class="flex flex-1 overflow-hidden">
            <main class={`flex-1 overflow-hidden ${showAiSpace() ? "border-r border-border" : ""}`}>
              <MenuLevel items={mainMenuItems} level={1} />
            </main>
            <Show when={showAiSpace()}>
              <aside class="w-96 overflow-auto">
                <AiSpacePanel />
              </aside>
            </Show>
          </div>
        </div>
      )}
    </Show>
  );
}

export default function App() {
  return (
    <RepoProvider>
      <AppContent />
    </RepoProvider>
  );
}
