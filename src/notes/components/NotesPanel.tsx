import { createSignal, For, Show } from "solid-js";
import { useNotes } from "../service/notes.service";
import { useRepo } from "../../data/repo.context";
import { useI18n } from "solid-compose";

export function NotesPanel() {
  const { userspaceHandle } = useRepo();
  const { notes, loading, error, addNote, removeNote, search } = useNotes(
    userspaceHandle,
    "userspace"
  );
  const [query, setQuery] = createSignal("");
  const [creating, setCreating] = createSignal(false);
  const [newTitle, setNewTitle] = createSignal("");
  const t = useI18n();

  const handleSearch = (e: Event & { currentTarget: HTMLFormElement }) => {
    e.preventDefault();
    search(query());
  };

  const handleCreate = async (e: Event & { currentTarget: HTMLFormElement }) => {
    e.preventDefault();
    if (!newTitle().trim()) return;
    await addNote({ title: newTitle(), content: "", space: "userspace" });
    setNewTitle("");
    setCreating(false);
  };

  return (
    <div class="p-4 flex flex-col gap-4">
      {/* Header */}
      <div class="flex items-center justify-between">
        <h2 class="text-base font-medium">{t('notes.title')}</h2>
        <button
          onClick={() => setCreating(true)}
          class="text-sm px-3 py-1 bg-foreground text-background rounded hover:opacity-80 transition-opacity"
        >
          {t('notes.newNote')}
        </button>
      </div>

      {/* Suche */}
      <form onSubmit={handleSearch} class="flex gap-2">
        <input
          type="search"
          placeholder={t('notes.searchPlaceholder')}
          value={query()}
          onInput={(e) => setQuery(e.currentTarget.value)}
          class="flex-1 text-sm px-3 py-1.5 border border-border rounded bg-muted focus:outline-none"
        />
        <button type="submit" class="text-sm px-3 py-1.5 border border-border rounded hover:bg-muted">
          {t('notes.searchButton')}
        </button>
      </form>

      {/* Neue Notiz */}
      <Show when={creating()}>
        <form onSubmit={handleCreate} class="flex gap-2 p-3 border border-border rounded bg-muted">
          <input
            autofocus
            type="text"
            placeholder={t('notes.titlePlaceholder')}
            value={newTitle()}
            onInput={(e) => setNewTitle(e.currentTarget.value)}
            class="flex-1 text-sm px-2 py-1 border border-border rounded bg-background focus:outline-none"
          />
          <button type="submit" class="text-sm px-3 text-foreground/70 hover:text-foreground">{t('notes.create')}</button>
          <button type="button" onClick={() => setCreating(false)} class="text-sm px-2 text-foreground/40 hover:text-foreground">✕</button>
        </form>
      </Show>

      {/* Liste */}
      <Show when={!loading()} fallback={<p class="text-sm text-foreground/50">{t('notes.loading')}</p>}>
        <Show when={error()}>
          {(err) => <p class="text-sm text-red-500">{err()}</p>}
        </Show>
        <Show
          when={notes().length > 0}
          fallback={<p class="text-sm text-foreground/40">{t('notes.empty')}</p>}
        >
          <ul class="flex flex-col gap-1">
            <For each={notes()}>{(note) => (
              <li class="flex items-center justify-between px-3 py-2 rounded border border-border hover:bg-muted group">
                <div class="cursor-pointer flex-1 min-w-0">
                  <p class="text-sm font-medium truncate">{note.title || t('notes.untitled')}</p>
                  <p class="text-xs text-foreground/50 mt-0.5">
                    {new Date(note.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => removeNote(note.id)}
                  class="text-xs text-foreground/30 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0"
                  title={t('notes.delete')}
                >
                  ✕
                </button>
              </li>
            )}</For>
          </ul>
        </Show>
      </Show>
    </div>
  );
}
