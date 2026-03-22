import { For, Show } from "solid-js";
import { useNotes, adoptToUserspace } from "../../notes/service/notes.service";
import type { Note } from "../../notes/notes.types";
import { useRepo } from "../../data/repo.context";

export function AiSpacePanel() {
  const { aispaceHandle, userspaceHandle } = useRepo();
  const { notes, loading, error } = useNotes(aispaceHandle, "aispace");

  const adopt = (note: Note) => {
    const ah = aispaceHandle();
    const uh = userspaceHandle();
    if (!ah || !uh) return;
    adoptToUserspace(note, ah, uh);
  };

  return (
    <div class="p-4 flex flex-col gap-4">
      <div class="flex items-center justify-between">
        <h2 class="text-base font-medium text-foreground/70">KI-Space</h2>
        <span class="text-xs text-foreground/40">Nur lesend</span>
      </div>

      <p class="text-xs text-foreground/50">
        Inhalte die ein Agent hier angelegt hat. Prüfe und übernimm in deinen Userspace.
      </p>

      <Show when={loading()} fallback={
        <Show when={error()}>
          {(err) => <p class="text-sm text-red-500">{err()}</p>}
        </Show>
      }>
        <p class="text-sm text-foreground/50">Lade…</p>
      </Show>

      <Show when={!loading() && !error()}>
        <Show
          when={notes().length > 0}
          fallback={<p class="text-sm text-foreground/40">Keine Entwürfe vorhanden.</p>}
        >
          <ul class="flex flex-col gap-2">
            <For each={notes()}>{(note) => (
              <li class="p-3 rounded border border-border bg-muted">
                <p class="text-sm font-medium">{note.title || "(Ohne Titel)"}</p>
                <Show when={note.content}>
                  <p class="text-xs text-foreground/60 mt-1 line-clamp-3 whitespace-pre-wrap">
                    {note.content}
                  </p>
                </Show>
                <div class="flex gap-2 mt-2">
                  <button
                    onClick={() => adopt(note)}
                    class="text-xs px-2 py-1 bg-foreground text-background rounded hover:opacity-80"
                  >
                    ↑ Übernehmen
                  </button>
                </div>
              </li>
            )}</For>
          </ul>
        </Show>
      </Show>
    </div>
  );
}

