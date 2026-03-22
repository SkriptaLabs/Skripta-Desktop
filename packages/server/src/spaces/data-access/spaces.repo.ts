import { randomUUID } from "crypto";
import { getSpacesHandle, getRepo, type Space } from "../../data/repo.js";
import type { NotesCollection, SourcesCollection } from "../../data/repo.js";

export function listSpaces(): Space[] {
  return Object.values(getSpacesHandle().docSync().spaces);
}

export function getSpace(id: string): Space | undefined {
  const spaces = getSpacesHandle().docSync().spaces;
  return spaces[id] ?? spaces[Number(id)];
}

export function createSpace(dto: { name: string; description: string }): Space {
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
  const spaces = handle.docSync().spaces;
  const space = spaces[id] ?? spaces[Number(id)];
  if (!space) return undefined;

  handle.change((doc) => {
    const s = doc.spaces[id] ?? doc.spaces[Number(id)];
    if (!s) return;
    if (patch.name !== undefined) s.name = patch.name;
    if (patch.description !== undefined) s.description = patch.description;
    s.updatedAt = new Date().toISOString();
  });

  return handle.docSync().spaces[id] ?? handle.docSync().spaces[Number(id)];
}

export function deleteSpace(id: string): boolean {
  const handle = getSpacesHandle();
  const spaces = handle.docSync().spaces;
  const hasString = !!spaces[id];
  const hasNumeric = !!spaces[Number(id)];
  if (!hasString && !hasNumeric) return false;

  handle.change((doc) => {
    if (doc.spaces[id]) {
      delete doc.spaces[id];
    } else if (doc.spaces[Number(id)]) {
      delete (doc.spaces as any)[Number(id)];
    }
  });

  return true;
}
