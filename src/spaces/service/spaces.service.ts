import { useState, useEffect, useCallback } from "react";
import { v4 as uuid } from "uuid";
import type { Space, SpacesCollection } from "../spaces.types";
import type { DocHandle, Repo } from "@automerge/automerge-repo";
import type { NotesCollection, SourcesCollection } from "../../data/repo.context";

function spacesFromHandle(handle: DocHandle<SpacesCollection>): Space[] {
  const doc = handle.docSync();
  if (!doc) return [];
  return Object.values(doc.spaces);
}

export function useSpaces(
  handle: DocHandle<SpacesCollection> | null,
  repo?: Repo | null
) {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    if (!handle) return;
    setSpaces(spacesFromHandle(handle));
  }, [handle]);

  useEffect(() => {
    if (!handle) return;

    handle.whenReady().then(() => {
      refresh();
      setLoading(false);
    });

    const onChange = () => refresh();
    handle.on("change", onChange);
    return () => { handle.off("change", onChange); };
  }, [handle, refresh]);

  const addSpace = useCallback(
    (dto: { name: string; description: string }) => {
      if (!handle || !repo) return;

      const existing = spacesFromHandle(handle);
      if (existing.some((s) => s.name === dto.name)) {
        throw new Error(`Ein Space mit dem Namen „${dto.name}" existiert bereits.`);
      }

      const userspace = repo.create<NotesCollection>({ notes: {} });
      const aispace = repo.create<NotesCollection>({ notes: {} });
      const sources = repo.create<SourcesCollection>({ sources: {} });

      const now = new Date().toISOString();
      const space: Space = {
        id: uuid(),
        name: dto.name,
        description: dto.description,
        userspaceUrl: userspace.url,
        aispaceUrl: aispace.url,
        sourcesUrl: sources.url,
        createdAt: now,
        updatedAt: now,
      };

      handle.change((doc) => {
        doc.spaces[space.id] = space;
      });

      return space;
    },
    [handle, repo]
  );

  const editSpace = useCallback(
    (id: string, patch: Partial<Pick<Space, "name" | "description">>) => {
      if (!handle) return;

      if (patch.name !== undefined) {
        const existing = spacesFromHandle(handle);
        if (existing.some((s) => s.name === patch.name && s.id !== id)) {
          throw new Error(`Ein Space mit dem Namen „${patch.name}" existiert bereits.`);
        }
      }

      handle.change((doc) => {
        const space = doc.spaces[id];
        if (!space) return;
        if (patch.name !== undefined) space.name = patch.name;
        if (patch.description !== undefined) space.description = patch.description;
        space.updatedAt = new Date().toISOString();
      });
    },
    [handle]
  );

  const removeSpace = useCallback(
    (id: string) => {
      if (!handle) return;
      handle.change((doc) => {
        delete doc.spaces[id];
      });
    },
    [handle]
  );

  return { spaces, loading, addSpace, editSpace, removeSpace, refresh };
}
