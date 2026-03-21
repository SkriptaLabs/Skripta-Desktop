import { useNotes, adoptToUserspace } from "../../notes/service/notes.service";
import type { Note } from "../../notes/notes.types";
import { useRepo } from "../../data/repo.context";

export function AiSpacePanel() {
  const { aispaceHandle, userspaceHandle, ready } = useRepo();
  const { notes, loading, error } = useNotes(
    ready ? aispaceHandle : null,
    "aispace"
  );

  const adopt = (note: Note) => {
    if (!aispaceHandle || !userspaceHandle) return;
    adoptToUserspace(note, aispaceHandle, userspaceHandle);
  };

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-medium text-foreground/70">KI-Space</h2>
        <span className="text-xs text-foreground/40">Nur lesend</span>
      </div>

      <p className="text-xs text-foreground/50">
        Inhalte die ein Agent hier angelegt hat. Prüfe und übernimm in deinen Userspace.
      </p>

      {loading ? (
        <p className="text-sm text-foreground/50">Lade…</p>
      ) : error ? (
        <p className="text-sm text-red-500">{error}</p>
      ) : notes.length === 0 ? (
        <p className="text-sm text-foreground/40">Keine Entwürfe vorhanden.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {notes.map(note => (
            <li key={note.id} className="p-3 rounded border border-border bg-muted/50">
              <p className="text-sm font-medium">{note.title || "(Ohne Titel)"}</p>
              {note.content && (
                <p className="text-xs text-foreground/60 mt-1 line-clamp-3 whitespace-pre-wrap">
                  {note.content}
                </p>
              )}
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => adopt(note)}
                  className="text-xs px-2 py-1 bg-foreground text-background rounded hover:opacity-80"
                >
                  ↑ Übernehmen
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
