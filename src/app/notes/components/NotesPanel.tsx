import { useState } from "react";
import { useNotes } from "../service/notes.service";
import { useRepo } from "../../data/repo.context";

export function NotesPanel() {
  const { userspaceHandle, ready } = useRepo();
  const { notes, loading, error, addNote, removeNote, search } = useNotes(
    ready ? userspaceHandle : null,
    "userspace"
  );
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    search(query);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    await addNote({ title: newTitle, content: "", space: "userspace" });
    setNewTitle("");
    setCreating(false);
  };

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-medium">Meine Notizen</h2>
        <button
          onClick={() => setCreating(true)}
          className="text-sm px-3 py-1 bg-foreground text-background rounded hover:opacity-80 transition-opacity"
        >
          + Neue Notiz
        </button>
      </div>

      {/* Suche */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="search"
          placeholder="Suchen…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="flex-1 text-sm px-3 py-1.5 border border-border rounded bg-muted focus:outline-none"
        />
        <button type="submit" className="text-sm px-3 py-1.5 border border-border rounded hover:bg-muted">
          Suchen
        </button>
      </form>

      {/* Neue Notiz */}
      {creating && (
        <form onSubmit={handleCreate} className="flex gap-2 p-3 border border-border rounded bg-muted">
          <input
            autoFocus
            type="text"
            placeholder="Titel…"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            className="flex-1 text-sm px-2 py-1 border border-border rounded bg-background focus:outline-none"
          />
          <button type="submit" className="text-sm px-3 text-foreground/70 hover:text-foreground">Erstellen</button>
          <button type="button" onClick={() => setCreating(false)} className="text-sm px-2 text-foreground/40 hover:text-foreground">✕</button>
        </form>
      )}

      {/* Liste */}
      {loading ? (
        <p className="text-sm text-foreground/50">Lade…</p>
      ) : error ? (
        <p className="text-sm text-red-500">{error}</p>
      ) : notes.length === 0 ? (
        <p className="text-sm text-foreground/40">Noch keine Notizen.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {notes.map(note => (
            <li key={note.id} className="flex items-center justify-between px-3 py-2 rounded border border-border hover:bg-muted group">
              <div className="cursor-pointer flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{note.title || "(Ohne Titel)"}</p>
                <p className="text-xs text-foreground/50 mt-0.5">
                  {new Date(note.updatedAt).toLocaleDateString("de-DE")}
                </p>
              </div>
              <button
                onClick={() => removeNote(note.id)}
                className="text-xs text-foreground/30 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0"
                title="Löschen"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
