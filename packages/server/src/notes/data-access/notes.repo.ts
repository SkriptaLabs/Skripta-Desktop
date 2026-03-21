import { randomUUID } from "crypto";
import { getSpaceDocHandles, type Note } from "../../data/repo.js";
import { getActiveSpaceId } from "../../index.js";

async function getHandles() {
  const spaceId = getActiveSpaceId();
  if (!spaceId) throw new Error("No active space. Select a space first.");
  return getSpaceDocHandles(spaceId);
}

export async function listNotes(space?: "userspace" | "aispace"): Promise<Note[]> {
  const { userspace, aispace } = await getHandles();

  if (space === "userspace") return Object.values(userspace.docSync().notes);
  if (space === "aispace") return Object.values(aispace.docSync().notes);

  return [
    ...Object.values(userspace.docSync().notes),
    ...Object.values(aispace.docSync().notes),
  ];
}

export async function getNote(id: string): Promise<Note | undefined> {
  const { userspace, aispace } = await getHandles();
  return userspace.docSync().notes[id] ?? aispace.docSync().notes[id];
}

export async function createNote(dto: {
  title: string;
  content: string;
  space: "userspace" | "aispace";
  tags?: string[];
}): Promise<Note> {
  const note: Note = {
    id: randomUUID(),
    title: dto.title,
    content: dto.content,
    space: dto.space,
    tags: dto.tags ?? [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const handles = await getHandles();
  const handle = dto.space === "aispace" ? handles.aispace : handles.userspace;
  handle.change((doc) => {
    doc.notes[note.id] = note;
  });

  return note;
}

export async function updateNote(
  id: string,
  patch: Partial<Pick<Note, "title" | "content" | "tags" | "space">>
): Promise<Note | undefined> {
  const { userspace, aispace } = await getHandles();
  let found: "userspace" | "aispace" | null = null;

  if (userspace.docSync().notes[id]) found = "userspace";
  else if (aispace.docSync().notes[id]) found = "aispace";
  if (!found) return undefined;

  const handle = found === "aispace" ? aispace : userspace;
  handle.change((doc) => {
    const note = doc.notes[id];
    if (patch.title !== undefined) note.title = patch.title;
    if (patch.content !== undefined) note.content = patch.content;
    if (patch.tags !== undefined) note.tags = patch.tags;
    note.updatedAt = new Date().toISOString();
  });

  if (patch.space && patch.space !== found) {
    const handles = await getHandles();
    const source = found === "aispace" ? handles.aispace : handles.userspace;
    const target = patch.space === "aispace" ? handles.aispace : handles.userspace;
    const noteData = source.docSync().notes[id];
    if (noteData) {
      const moved = { ...noteData, space: patch.space };
      target.change((targetDoc) => {
        targetDoc.notes[id] = moved;
      });
      source.change((doc) => {
        delete doc.notes[id];
      });
    }
  }

  return getNote(id);
}

export async function deleteNote(id: string): Promise<boolean> {
  const { userspace, aispace } = await getHandles();

  if (userspace.docSync().notes[id]) {
    userspace.change((doc) => { delete doc.notes[id]; });
    return true;
  }
  if (aispace.docSync().notes[id]) {
    aispace.change((doc) => { delete doc.notes[id]; });
    return true;
  }
  return false;
}

export async function searchNotes(query: string, space?: "userspace" | "aispace"): Promise<Note[]> {
  const lower = query.toLowerCase();
  const notes = await listNotes(space);
  return notes.filter(
    (n) =>
      n.title.toLowerCase().includes(lower) ||
      n.content.toLowerCase().includes(lower) ||
      n.tags.some((t) => t.toLowerCase().includes(lower))
  );
}
