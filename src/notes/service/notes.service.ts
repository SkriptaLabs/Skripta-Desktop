import { createSignal, createEffect, onCleanup, type Accessor } from "solid-js";
import { v4 as uuid } from "uuid";
import type { Note, CreateNoteDto } from "../notes.types";
import type { DocHandle } from "@automerge/automerge-repo";
import type { NotesCollection } from "../../data/repo.context";

function notesFromHandle(
  handle: DocHandle<NotesCollection>,
  space?: "userspace" | "aispace"
): Note[] {
  const doc = handle.docSync();
  if (!doc) return [];
  return Object.values(doc.notes).filter(
    (n) => !space || n.space === space
  );
}

export function useNotes(
  handle: Accessor<DocHandle<NotesCollection> | null>,
  space?: "userspace" | "aispace"
) {
  const [notes, setNotes] = createSignal<Note[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  createEffect(() => {
    const h = handle();
    if (!h) return;

    const refresh = () => setNotes(notesFromHandle(h, space));

    // Initial load once handle is ready
    h.whenReady().then(() => {
      refresh();
      setLoading(false);
    });

    // Live-Updates
    h.on("change", refresh);
    onCleanup(() => h.off("change", refresh));
  });

  const addNote = (dto: CreateNoteDto) => {
    const h = handle();
    if (!h) return;
    const now = new Date().toISOString();
    const note: Note = {
      id: uuid(),
      title: dto.title,
      content: dto.content,
      space: dto.space,
      tags: dto.tags ?? [],
      createdAt: now,
      updatedAt: now,
    };
    h.change((doc) => {
      doc.notes[note.id] = note;
    });
    return note;
  };

  const editNote = (id: string, patch: Partial<Pick<Note, "title" | "content" | "tags">>) => {
    const h = handle();
    if (!h) return;
    h.change((doc) => {
      const note = doc.notes[id];
      if (!note) return;
      if (patch.title !== undefined) note.title = patch.title;
      if (patch.content !== undefined) note.content = patch.content;
      if (patch.tags !== undefined) note.tags = patch.tags;
      note.updatedAt = new Date().toISOString();
    });
  };

  const removeNote = (id: string) => {
    const h = handle();
    if (!h) return;
    h.change((doc) => {
      delete doc.notes[id];
    });
  };

  const search = (query: string) => {
    const h = handle();
    if (!h) return;
    if (!query.trim()) {
      setNotes(notesFromHandle(h, space));
      return;
    }
    const lower = query.toLowerCase();
    const all = notesFromHandle(h, space);
    setNotes(
      all.filter(
        (n) =>
          n.title.toLowerCase().includes(lower) ||
          n.content.toLowerCase().includes(lower) ||
          (n.tags ?? []).some((t) => t.toLowerCase().includes(lower))
      )
    );
  };

  const reload = () => {
    const h = handle();
    if (h) setNotes(notesFromHandle(h, space));
  };

  return { notes, loading, error, addNote, editNote, removeNote, search, reload };
}

/** Verschiebt eine Notiz zwischen Handles (z.B. aispace → userspace) */
export function adoptToUserspace(
  note: Note,
  sourceHandle: DocHandle<NotesCollection>,
  targetHandle: DocHandle<NotesCollection>
) {
  targetHandle.change((doc) => {
    doc.notes[note.id] = { ...note, space: "userspace", updatedAt: new Date().toISOString() };
  });
  sourceHandle.change((doc) => {
    delete doc.notes[note.id];
  });
}
