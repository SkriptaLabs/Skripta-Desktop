import { randomUUID } from "crypto";
import { getSpacesHandle, getRepo, type Space } from "../../data/repo.js";
import type { NotesCollection, SourcesCollection } from "../../data/repo.js";

export function listSpaces(): Space[] {
  return Object.values(getSpacesHandle().docSync().spaces);
}

export function getSpace(id: string): Space | undefined {
  return getSpacesHandle().docSync().spaces[id];
}

export function createSpace(dto: { name: string; description: string }): Space {
  const existing = listSpaces();
  if (existing.some((s) => s.name === dto.name)) {
    throw new Error(`Space with name '${dto.name}' already exists`);
  }

  const repo = getRepo();
  const userspace = repo.create<NotesCollection>({ notes: {} });
  const aispace = repo.create<NotesCollection>({ notes: {} });
  const sources = repo.create<SourcesCollection>({ sources: {} });

  const now = new Date().toISOString();
  const space: Space = {
    id: randomUUID(),
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
  id: string,
  patch: Partial<Pick<Space, "name" | "description">>
): Space | undefined {
  const handle = getSpacesHandle();
  const space = handle.docSync().spaces[id];
  if (!space) return undefined;

  if (patch.name !== undefined && patch.name !== space.name) {
    const existing = listSpaces();
    if (existing.some((s) => s.name === patch.name && s.id !== id)) {
      throw new Error(`Space with name '${patch.name}' already exists`);
    }
  }

  handle.change((doc) => {
    const s = doc.spaces[id];
    if (patch.name !== undefined) s.name = patch.name;
    if (patch.description !== undefined) s.description = patch.description;
    s.updatedAt = new Date().toISOString();
  });

  return handle.docSync().spaces[id];
}

export function deleteSpace(id: string): boolean {
  const handle = getSpacesHandle();
  if (!handle.docSync().spaces[id]) return false;

  handle.change((doc) => {
    delete doc.spaces[id];
  });

  return true;
}
