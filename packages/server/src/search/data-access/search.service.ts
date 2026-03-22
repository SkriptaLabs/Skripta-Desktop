import type { SearchResult, AcademicSearchOptions, WebSearchOptions } from "../search.types.js";

// ── OpenAlex ──────────────────────────────────────────────────────────────────
// Completely free, no API key required. https://openalex.org/

interface OpenAlexWork {
  id: string;
  title: string;
  doi?: string;
  publication_year?: number;
  primary_location?: { landing_page_url?: string };
  authorships?: { author?: { display_name?: string } }[];
  abstract_inverted_index?: Record<string, number[]> | null;
}

function invertedIndexToAbstract(
  index: Record<string, number[]> | null | undefined
): string | undefined {
  if (!index) return undefined;
  const entries = Object.entries(index).flatMap(([word, positions]) =>
    positions.map((pos) => [pos, word] as [number, string])
  );
  entries.sort((a, b) => a[0] - b[0]);
  return entries.map(([, word]) => word).join(" ");
}

export async function searchOpenAlex(
  query: string,
  limit = 10
): Promise<SearchResult[]> {
  const params = new URLSearchParams({
    search: query,
    "per-page": String(Math.min(limit, 25)),
    select: "id,title,doi,publication_year,primary_location,authorships,abstract_inverted_index",
  });
  const mailto = process.env["OPENALEX_MAILTO"] ?? "scripta-app@users.noreply";
  const url = `https://api.openalex.org/works?${params}&mailto=${encodeURIComponent(mailto)}`;

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`OpenAlex error: ${res.status}`);

  const data: { results: OpenAlexWork[] } = await res.json();

  return (data.results ?? []).map((w) => ({
    title: w.title ?? "(Kein Titel)",
    authors: (w.authorships ?? [])
      .map((a) => a.author?.display_name)
      .filter((n): n is string => !!n),
    year: w.publication_year ?? undefined,
    url: w.primary_location?.landing_page_url ?? (w.doi ? `https://doi.org/${w.doi}` : undefined),
    abstract: invertedIndexToAbstract(w.abstract_inverted_index),
    doi: w.doi ?? undefined,
    source: "openalex" as const,
  }));
}

// ── Semantic Scholar ──────────────────────────────────────────────────────────
// Free, optional API key via SEMANTIC_SCHOLAR_API_KEY env var for higher rate limits.
// https://api.semanticscholar.org/

interface SemanticScholarPaper {
  paperId: string;
  title: string;
  year?: number;
  externalIds?: { DOI?: string };
  openAccessPdf?: { url?: string };
  url?: string;
  authors?: { name: string }[];
  abstract?: string;
}

export async function searchSemanticScholar(
  query: string,
  limit = 10
): Promise<SearchResult[]> {
  const params = new URLSearchParams({
    query,
    limit: String(Math.min(limit, 100)),
    fields: "title,year,authors,abstract,url,openAccessPdf,externalIds",
  });
  const apiUrl = `https://api.semanticscholar.org/graph/v1/paper/search?${params}`;

  const headers: Record<string, string> = { Accept: "application/json" };
  const apiKey = process.env["SEMANTIC_SCHOLAR_API_KEY"];
  if (apiKey) headers["x-api-key"] = apiKey;

  const res = await fetch(apiUrl, { headers });
  if (!res.ok) throw new Error(`Semantic Scholar error: ${res.status}`);

  const data: { data: SemanticScholarPaper[] } = await res.json();

  return (data.data ?? []).map((p) => ({
    title: p.title ?? "(Kein Titel)",
    authors: (p.authors ?? []).map((a) => a.name),
    year: p.year ?? undefined,
    url: p.openAccessPdf?.url ?? p.url ?? (p.externalIds?.DOI ? `https://doi.org/${p.externalIds.DOI}` : undefined),
    abstract: p.abstract ?? undefined,
    doi: p.externalIds?.DOI ?? undefined,
    source: "semanticscholar" as const,
  }));
}

// ── arXiv ─────────────────────────────────────────────────────────────────────
// Completely free, no API key required. https://arxiv.org/help/api/

function parseXmlText(xml: string, tag: string): string[] {
  const results: string[] = [];
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    results.push(m[1].trim());
  }
  return results;
}

export async function searchArxiv(
  query: string,
  limit = 10
): Promise<SearchResult[]> {
  const params = new URLSearchParams({
    search_query: `all:${query}`,
    start: "0",
    max_results: String(Math.min(limit, 50)),
  });
  const url = `https://export.arxiv.org/api/query?${params}`;

  const res = await fetch(url, { headers: { Accept: "application/xml" } });
  if (!res.ok) throw new Error(`arXiv error: ${res.status}`);

  const xml = await res.text();
  const entries = xml.split("<entry>").slice(1);

  return entries.map((entry) => {
    const titleMatch = /<title>([\s\S]*?)<\/title>/.exec(entry);
    const title = titleMatch ? titleMatch[1].replace(/\s+/g, " ").trim() : "(Kein Titel)";

    const abstractMatch = /<summary>([\s\S]*?)<\/summary>/.exec(entry);
    const abstract = abstractMatch ? abstractMatch[1].replace(/\s+/g, " ").trim() : undefined;

    const authors = parseXmlText(entry, "name");

    const yearMatch = /<published>(\d{4})/.exec(entry);
    const year = yearMatch ? parseInt(yearMatch[1]) : undefined;

    const idMatch = /<id>(https?:\/\/arxiv\.org\/abs\/[^<]+)<\/id>/.exec(entry);
    const url = idMatch ? idMatch[1].trim() : undefined;

    const doiMatch = /<arxiv:doi[^>]*>([\s\S]*?)<\/arxiv:doi>/.exec(entry);
    const doi = doiMatch ? doiMatch[1].trim() : undefined;

    return { title, authors, year, url, abstract, doi, source: "arxiv" as const };
  });
}

// ── Brave Search ──────────────────────────────────────────────────────────────
// Free tier: 2,000 queries/month. API key via BRAVE_SEARCH_API_KEY env var.
// https://brave.com/search/api/

interface BraveWebResult {
  title: string;
  url: string;
  description?: string;
  age?: string;
}

export async function searchBrave(
  query: string,
  limit = 10
): Promise<SearchResult[]> {
  const apiKey = process.env["BRAVE_SEARCH_API_KEY"];
  if (!apiKey) throw new Error("BRAVE_SEARCH_API_KEY is not configured");

  const params = new URLSearchParams({
    q: query,
    count: String(Math.min(limit, 20)),
  });
  const url = `https://api.search.brave.com/res/v1/web/search?${params}`;

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip",
      "X-Subscription-Token": apiKey,
    },
  });
  if (!res.ok) throw new Error(`Brave Search error: ${res.status}`);

  const data: { web?: { results?: BraveWebResult[] } } = await res.json();

  return (data.web?.results ?? []).map((r) => {
    // Try to extract a year from the "age" field (e.g. "2024-01-15")
    const yearMatch = r.age ? /(\d{4})/.exec(r.age) : null;
    const year = yearMatch ? parseInt(yearMatch[1]) : undefined;

    return {
      title: r.title,
      url: r.url,
      abstract: r.description,
      year,
      source: "brave" as const,
    };
  });
}

// ── Public facade ─────────────────────────────────────────────────────────────

export async function searchAcademic(
  query: string,
  options: AcademicSearchOptions = {}
): Promise<SearchResult[]> {
  const { engine = "openalex", limit = 10 } = options;
  switch (engine) {
    case "semanticscholar":
      return searchSemanticScholar(query, limit);
    case "arxiv":
      return searchArxiv(query, limit);
    case "openalex":
    default:
      return searchOpenAlex(query, limit);
  }
}

export async function searchWeb(
  query: string,
  options: WebSearchOptions = {}
): Promise<SearchResult[]> {
  const { limit = 10 } = options;
  return searchBrave(query, limit);
}
