import { useState, useEffect, useCallback } from "react";
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
  handle: DocHandle<NotesCollection> | null,
  space?: "userspace" | "aispace"
) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!handle) return;
    setNotes(notesFromHandle(handle, space));
  }, [handle, space]);

  useEffect(() => {
    if (!handle) return;

    // Initial load once handle is ready
    handle.whenReady().then(() => {
      refresh();
      setLoading(false);
    });

    // Live-Updates
    const onChange = () => refresh();
    handle.on("change", onChange);
    return () => { handle.off("change", onChange); };
  }, [handle, refresh]);

  const addNote = useCallback(
    (dto: CreateNoteDto) => {
      if (!handle) return;
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
      handle.change((doc) => {
        doc.notes[note.id] = note;
      });
      return note;
    },
    [handle]
  );

  const editNote = useCallback(
    (id: string, patch: Partial<Pick<Note, "title" | "content" | "tags">>) => {
      if (!handle) return;
      handle.change((doc) => {
        const note = doc.notes[id];
        if (!note) return;
        if (patch.title !== undefined) note.title = patch.title;
        if (patch.content !== undefined) note.content = patch.content;
        if (patch.tags !== undefined) note.tags = patch.tags;
        note.updatedAt = new Date().toISOString();
      });
    },
    [handle]
  );

  const removeNote = useCallback(
    (id: string) => {
      if (!handle) return;
      handle.change((doc) => {
        delete doc.notes[id];
      });
    },
    [handle]
  );

  const search = useCallback(
    (query: string) => {
      if (!handle) return;
      if (!query.trim()) {
        refresh();
        return;
      }
      const lower = query.toLowerCase();
      const all = notesFromHandle(handle, space);
      setNotes(
        all.filter(
          (n) =>
            n.title.toLowerCase().includes(lower) ||
            n.content.toLowerCase().includes(lower) ||
            (n.tags ?? []).some((t) => t.toLowerCase().includes(lower))
        )
      );
    },
    [handle, space, refresh]
  );

  return { notes, loading, error, addNote, editNote, removeNote, search, reload: refresh };
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
