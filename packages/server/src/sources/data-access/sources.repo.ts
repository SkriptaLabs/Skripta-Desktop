import { randomUUID } from "crypto";
import { getSpaceDocHandles, type Source } from "../../data/repo.js";
import { getActiveSpaceId } from "../../index.js";

async function getSourcesHandle() {
  const spaceId = getActiveSpaceId();
  if (!spaceId) throw new Error("No active space. Select a space first.");
  return (await getSpaceDocHandles(spaceId)).sources;
}

export async function listSources(): Promise<Source[]> {
  return Object.values((await getSourcesHandle()).docSync().sources);
}

export async function getSource(id: string): Promise<Source | undefined> {
  return (await getSourcesHandle()).docSync().sources[id];
}

export async function createSource(dto: {
  title: string;
  authors?: string[];
  year?: number;
  url?: string;
}): Promise<Source> {
  const source: Source = {
    id: randomUUID(),
    title: dto.title,
    authors: dto.authors ?? [],
    year: dto.year,
    url: dto.url,
    quotes: [],
    createdAt: new Date().toISOString(),
  };

  (await getSourcesHandle()).change((doc) => {
    doc.sources[source.id] = source;
  });

  return source;
}

export async function addQuote(
  sourceId: string,
  quote: { text: string; page?: string; note?: string }
): Promise<Source | undefined> {
  const handle = await getSourcesHandle();
  if (!handle.docSync().sources[sourceId]) return undefined;

  handle.change((doc) => {
    doc.sources[sourceId].quotes.push({
      id: randomUUID(),
      text: quote.text,
      page: quote.page,
      note: quote.note,
    });
  });

  return getSource(sourceId);
}

export async function searchSources(query: string): Promise<Source[]> {
  const lower = query.toLowerCase();
  const sources = await listSources();
  return sources.filter(
    (s) =>
      s.title.toLowerCase().includes(lower) ||
      s.authors.some((a) => a.toLowerCase().includes(lower)) ||
      s.quotes.some(
        (q) =>
          q.text.toLowerCase().includes(lower) ||
          (q.note ?? "").toLowerCase().includes(lower)
      )
  );
}
