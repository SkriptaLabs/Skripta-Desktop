import { getSpacesHandle, getRepo, type Space } from "../../data/repo.js";
import type { NotesCollection, SourcesCollection } from "../../data/repo.js";

function nextId(): number {
  const spaces = Object.values(getSpacesHandle().docSync().spaces);
  if (spaces.length === 0) return 1;
  return Math.max(...spaces.map((s) => s.id)) + 1;
}

export function listSpaces(): Space[] {
  return Object.values(getSpacesHandle().docSync().spaces);
}

export function getSpace(id: number): Space | undefined {
  return getSpacesHandle().docSync().spaces[id];
}

export function createSpace(dto: { name: string; description: string }): Space {
  const repo = getRepo();
  const userspace = repo.create<NotesCollection>({ notes: {} });
  const aispace = repo.create<NotesCollection>({ notes: {} });
  const sources = repo.create<SourcesCollection>({ sources: {} });

  const now = new Date().toISOString();
  const space: Space = {
    id: nextId(),
    name: dto.name,
    description: dto.description,
    userspaceUrl: userspace.url,
    aispaceUrl: aispace.url,
    sourcesUrl: sources.url,
    createdAt: now,
    updatedAt: now,
  };

  getSpacesHandle().change((doc) => {
    doc.spaces[space.id] = space;
  });

  return space;
}

export function updateSpace(
  id: number,
  patch: Partial<Pick<Space, "name" | "description">>
): Space | undefined {
  const handle = getSpacesHandle();
  const space = handle.docSync().spaces[id];
  if (!space) return undefined;

  handle.change((doc) => {
    const s = doc.spaces[id];
    if (patch.name !== undefined) s.name = patch.name;
    if (patch.description !== undefined) s.description = patch.description;
    s.updatedAt = new Date().toISOString();
  });

  return handle.docSync().spaces[id];
}

export function deleteSpace(id: number): boolean {
  const handle = getSpacesHandle();
  const space = handle.docSync().spaces[id];
  if (!space) return false;

  handle.change((doc) => {
    delete doc.spaces[id];
  });

  return true;
}
