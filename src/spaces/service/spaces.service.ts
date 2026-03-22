import { createSignal, createEffect, onCleanup, type Accessor } from "solid-js";
import type { Space, SpacesCollection } from "../spaces.types";
import type { DocHandle, Repo } from "@automerge/automerge-repo";
import type { NotesCollection, SourcesCollection } from "../../data/repo.context";

function spacesFromHandle(handle: DocHandle<SpacesCollection>): Space[] {
  const doc = handle.docSync();
  if (!doc) return [];
  // Normalize IDs to strings (handles legacy numeric IDs from before UUID migration)
  return Object.entries(doc.spaces).map(([key, s]) => ({
    ...s,
    id: String(s.id ?? key),
  }));
}

export function useSpaces(
  handle: Accessor<DocHandle<SpacesCollection> | null>,
  repo?: Accessor<Repo | null>
) {
  const [spaces, setSpaces] = createSignal<Space[]>([]);
  const [loading, setLoading] = createSignal(true);

  const refresh = () => {
    const h = handle();
    if (h) setSpaces(spacesFromHandle(h));
  };

  createEffect(() => {
    const h = handle();
    if (!h) return;

    h.whenReady().then(() => {
      refresh();
      setLoading(false);
    });

    h.on("change", refresh);
    onCleanup(() => h.off("change", refresh));
  });

  const addSpace = (dto: { name: string; description: string }) => {
    const h = handle();
    const r = repo?.();
    if (!h || !r) return;

    const userspace = r.create<NotesCollection>({ notes: {} });
    const aispace = r.create<NotesCollection>({ notes: {} });
    const sources = r.create<SourcesCollection>({ sources: {} });

    const now = new Date().toISOString();
    const space: Space = {
      id: crypto.randomUUID(),
      name: dto.name,
      description: dto.description,
      userspaceUrl: userspace.url,
      aispaceUrl: aispace.url,
      sourcesUrl: sources.url,
      createdAt: now,
      updatedAt: now,
    };

    h.change((doc) => {
      doc.spaces[space.id] = space;
    });
    refresh();

    return space;
  };

  const editSpace = (id: string, patch: Partial<Pick<Space, "name" | "description">>) => {
    const h = handle();
    if (!h) return;

    h.change((doc) => {
      const space = doc.spaces[id] ?? doc.spaces[Number(id)];
      if (!space) return;
      if (patch.name !== undefined) space.name = patch.name;
      if (patch.description !== undefined) space.description = patch.description;
      space.updatedAt = new Date().toISOString();
    });
    refresh();
  };

  const removeSpace = (id: string) => {
    const h = handle();
    if (!h) return;
    h.change((doc) => {
      if (doc.spaces[id]) {
        delete doc.spaces[id];
      } else if (doc.spaces[Number(id)]) {
        delete (doc.spaces as any)[Number(id)];
      }
    });
    refresh();
  };

  return { spaces, loading, addSpace, editSpace, removeSpace, refresh };
}
