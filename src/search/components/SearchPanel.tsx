import { useState } from "react";
import { useRepo } from "../../data/repo.context";
import { useSearch } from "../service/search.service";
import { useSources } from "../../sources/service/sources.service";
import type { SearchResult, AcademicEngine } from "../search.types";

type SearchMode = "academic" | "web";

const ENGINE_LABELS: Record<AcademicEngine, string> = {
  openalex: "OpenAlex",
  semanticscholar: "Semantic Scholar",
  arxiv: "arXiv",
};

export function SearchPanel() {
  const { port, sourcesHandle, ready } = useRepo();
  const { config, results, loading, error, searchAcademic, searchWeb, clearResults } = useSearch(port);
  const { addSource } = useSources(ready ? sourcesHandle : null);

  const [mode, setMode] = useState<SearchMode>("academic");
  const [engine, setEngine] = useState<AcademicEngine>("openalex");
  const [query, setQuery] = useState("");
  const [added, setAdded] = useState<Set<string>>(new Set());

  const [addError, setAddError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setAdded(new Set());
    if (mode === "academic") {
      searchAcademic(query, engine);
    } else {
      searchWeb(query);
    }
  };

  const handleAddSource = async (result: SearchResult) => {
    const key = result.url ?? result.title;
    try {
      await addSource({
        title: result.title,
        authors: result.authors ?? [],
        year: result.year,
        url: result.url,
      });
      setAdded((prev) => new Set([...prev, key]));
    } catch (err) {
      setAddError(`Quelle konnte nicht gespeichert werden: ${String(err)}`);
    }
  };

  return (
    <div className="p-4 flex flex-col gap-4">
      <h2 className="text-base font-medium">Online-Suche</h2>

      {/* Mode tabs */}
      <div className="flex gap-1 border border-border rounded overflow-hidden text-sm">
        <button
          type="button"
          onClick={() => { setMode("academic"); clearResults(); }}
          className={`flex-1 py-1.5 transition-colors ${mode === "academic" ? "bg-foreground text-background" : "hover:bg-muted"}`}
        >
          Wissenschaftlich
        </button>
        <button
          type="button"
          onClick={() => { setMode("web"); clearResults(); }}
          className={`flex-1 py-1.5 transition-colors ${mode === "web" ? "bg-foreground text-background" : "hover:bg-muted"}`}
          title={config.web ? undefined : "BRAVE_SEARCH_API_KEY nicht konfiguriert"}
        >
          Web {!config.web && "🔒"}
        </button>
      </div>

      {/* Engine selector for academic mode */}
      {mode === "academic" && (
        <div className="flex gap-1 text-xs">
          {(["openalex", "semanticscholar", "arxiv"] as AcademicEngine[]).map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEngine(e)}
              className={`px-2 py-0.5 rounded border border-border transition-colors ${engine === e ? "bg-muted font-medium" : "hover:bg-muted"}`}
            >
              {ENGINE_LABELS[e]}
            </button>
          ))}
        </div>
      )}

      {/* Brave API key hint */}
      {mode === "web" && !config.web && (
        <p className="text-xs text-foreground/50 bg-muted rounded px-3 py-2">
          Web-Suche benötigt einen{" "}
          <a
            href="https://brave.com/search/api/"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            Brave Search API Key
          </a>
          . Setze die Umgebungsvariable{" "}
          <code className="font-mono">BRAVE_SEARCH_API_KEY</code> und starte den Server neu.
        </p>
      )}

      {/* Search form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="search"
          placeholder={mode === "academic" ? "Suchbegriff, Autor, DOI…" : "Suchbegriff…"}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={mode === "web" && !config.web}
          className="flex-1 text-sm px-3 py-1.5 border border-border rounded bg-muted focus:outline-none disabled:opacity-40"
        />
        <button
          type="submit"
          disabled={loading || !query.trim() || (mode === "web" && !config.web)}
          className="text-sm px-3 py-1.5 border border-border rounded hover:bg-muted disabled:opacity-40 transition-colors"
        >
          {loading ? "…" : "Suchen"}
        </button>
      </form>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
      {addError && (
        <p className="text-xs text-red-500">{addError}</p>
      )}

      {/* Results */}
      {results.length > 0 && (
        <ul className="flex flex-col gap-2">
          {results.map((result, i) => {
            const key = result.url ?? result.title;
            const isAdded = added.has(key);
            return (
              <li
                key={`${result.source}-${i}`}
                className="flex flex-col gap-1 px-3 py-2 rounded border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {result.url ? (
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-medium hover:underline line-clamp-2"
                      >
                        {result.title}
                      </a>
                    ) : (
                      <p className="text-sm font-medium line-clamp-2">{result.title}</p>
                    )}
                    <p className="text-xs text-foreground/50 mt-0.5">
                      {[
                        result.authors?.slice(0, 3).join(", "),
                        result.year,
                        ENGINE_LABELS[result.source as AcademicEngine] ?? result.source,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddSource(result)}
                    disabled={isAdded}
                    className="shrink-0 text-xs px-2 py-0.5 border border-border rounded hover:bg-muted disabled:opacity-50 transition-colors"
                    title="Als Quelle speichern"
                  >
                    {isAdded ? "✓" : "+ Quelle"}
                  </button>
                </div>
                {result.abstract && (
                  <p className="text-xs text-foreground/60 line-clamp-3">{result.abstract}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {!loading && results.length === 0 && !error && query && (
        <p className="text-sm text-foreground/40">Keine Ergebnisse.</p>
      )}
    </div>
  );
}
