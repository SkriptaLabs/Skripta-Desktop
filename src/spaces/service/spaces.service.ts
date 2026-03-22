import { createSignal, createEffect, onCleanup, type Accessor } from "solid-js";
import type { Space, SpacesCollection } from "../spaces.types";
import type { DocHandle, Repo } from "@automerge/automerge-repo";
import type { NotesCollection, SourcesCollection } from "../../data/repo.context";

function spacesFromHandle(handle: DocHandle<SpacesCollection>): Space[] {
  const doc = handle.docSync();
  if (!doc) return [];
  return Object.values(doc.spaces);
}

function nextId(handle: DocHandle<SpacesCollection>): number {
  const spaces = spacesFromHandle(handle);
  if (spaces.length === 0) return 1;
  return Math.max(...spaces.map((s) => s.id)) + 1;
}

export function useSpaces(
  handle: Accessor<DocHandle<SpacesCollection> | null>,
  repo?: Accessor<Repo | null>
) {
  const [spaces, setSpaces] = createSignal<Space[]>([]);
  const [loading, setLoading] = createSignal(true);

  createEffect(() => {
    const h = handle();
    if (!h) return;

    const refresh = () => setSpaces(spacesFromHandle(h));

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
      id: nextId(h),
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

    return space;
  };

  const editSpace = (id: number, patch: Partial<Pick<Space, "name" | "description">>) => {
    const h = handle();
    if (!h) return;

    h.change((doc) => {
      const space = doc.spaces[String(id)];
      if (!space) return;
      if (patch.name !== undefined) space.name = patch.name;
      if (patch.description !== undefined) space.description = patch.description;
      space.updatedAt = new Date().toISOString();
    });
  };

  const removeSpace = (id: number) => {
    const h = handle();
    if (!h) return;
    h.change((doc) => {
      delete doc.spaces[String(id)];
    });
  };

  const refresh = () => {
    const h = handle();
    if (h) setSpaces(spacesFromHandle(h));
  };

  return { spaces, loading, addSpace, editSpace, removeSpace, refresh };
}
