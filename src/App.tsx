import { createSignal, createEffect, Show } from "solid-js";
import { NotesPanel } from "./notes/components/NotesPanel";
import { AiSpacePanel } from "./aispace/components/AiSpacePanel";
import { SourcesPanel } from "./sources/components/SourcesPanel";
import { ServerStatus } from "./settings/components/ServerStatus";
import { SettingsScreen } from "./settings/components/SettingsScreen";
import { SpaceServerStatus } from "./settings/components/SpaceServerStatus";
import { RepoProvider, useRepo } from "./data/repo.context";
import { SpacesList } from "./spaces/components/SpacesList";
import { useSpaces } from "./spaces/service/spaces.service";
import { MenuLevel } from "./menu/MenuLevel";
import type { MenuItem } from "./menu/menu.types";
import { createThemeEffect, useTheme, useI18n, useLocale } from 'solid-compose';

function LanguageSwitcher() {
  const [locale, { setLanguageTag }] = useLocale();
  return <select
    class="text-sm px-2 py-1 rounded border border-border bg-background text-foreground"
    value={locale.languageTag}
    onChange={(e) => setLanguageTag(e.currentTarget.value)}
  >
    {locale.supportedLanguageTags.map((tag: string) => (
      <option value={tag}>{tag.toUpperCase()}</option>
    ))}
  </select>;
}

function ThemeSwitcher() {
  const [theme, setTheme] = useTheme();
  const t = useI18n();
  return <select
    class="text-sm px-2 py-1 rounded border border-border bg-background text-foreground"
    value={theme()}
    onChange={(e) => setTheme(e.currentTarget.value)}
  >
    <option value="light">{t('theme.light')}</option>
    <option value="dark">{t('theme.dark')}</option>
    <option value="high_contrast">{t('theme.highContrast')}</option>
  </select>
};

function StartupScreen() {
  const [showSettings, setShowSettings] = createSignal(false);
  const t = useI18n();
  return <div class="flex flex-col h-screen bg-background text-foreground">
    <Show when={showSettings()} fallback={
      <>
        <header class="flex items-center justify-between px-4 py-2 border-b border-border">
          <h1 class="text-lg font-semibold tracking-tight">{t('app.title')}</h1>
          <div class="flex items-center gap-3">
            <LanguageSwitcher />
            <ThemeSwitcher />
            <button
              onClick={() => setShowSettings(true)}
              class="text-sm px-2 py-1 rounded border border-border hover:bg-muted transition-colors"
              title={t('settings.title')}
            >
              ⚙
            </button>
            <ServerStatus />
          </div>
        </header>
        <main class="flex-1 overflow-auto">
          <SpacesList />
        </main>
      </>
    }>
      <SettingsScreen onBack={() => setShowSettings(false)} />
    </Show>
  </div>
};

function AppContent() {
  const { activeSpace, leaveSpace, spacesHandle } = useRepo();
  const { editSpace } = useSpaces(spacesHandle);
  const [showAiSpace, setShowAiSpace] = createSignal(false);
  const [editingName, setEditingName] = createSignal(false);
  const [nameValue, setNameValue] = createSignal("");
  const t = useI18n();
  let nameInputRef: HTMLInputElement | undefined;

  createThemeEffect();

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
    { id: "notes", label: () => t('menu.notes'), component: NotesPanel },
    { id: "sources", label: () => t('menu.sources'), component: SourcesPanel },
  ];

  return (
    <Show
      when={activeSpace()}
      fallback={<StartupScreen />}
    >
      {(space) => (
        <div class="flex flex-col h-screen bg-background text-foreground">
          <header class="flex items-center justify-between px-4 py-2 border-b border-border">
            <div class="flex items-center gap-3">
              <button
                onClick={leaveSpace}
                class="text-sm px-2 py-1 rounded border border-border hover:bg-muted transition-colors"
                title={t('nav.backToSpaces')}
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
                      title={t('nav.clickToRename')}
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
              <LanguageSwitcher />
              <ThemeSwitcher />
              <SpaceServerStatus />
              <button
                onClick={() => setShowAiSpace(!showAiSpace())}
                class="text-sm px-3 py-1 rounded border border-border hover:bg-muted transition-colors"
              >
                {showAiSpace() ? t('nav.hideAiSpace') : t('nav.showAiSpace')}
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
