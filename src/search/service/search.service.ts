import { useState, useCallback, useEffect } from "react";
import type { SearchResult, AcademicEngine, SearchConfig } from "../search.types";

export function useSearch(port: number | null) {
  const [config, setConfig] = useState<SearchConfig>({ academic: ["openalex", "semanticscholar", "arxiv"], web: false });
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load search config (which engines are available)
  useEffect(() => {
    if (!port) return;
    fetch(`http://localhost:${port}/search/config`)
      .then((r) => r.json())
      .then((cfg: SearchConfig) => setConfig(cfg))
      .catch(() => {});
  }, [port]);

  const searchAcademic = useCallback(
    async (query: string, engine: AcademicEngine = "openalex", limit = 10) => {
      if (!port || !query.trim()) return;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ q: query, engine, limit: String(limit) });
        const res = await fetch(`http://localhost:${port}/search/academic?${params}`);
        if (!res.ok) {
          const body: { error?: string } = await res.json();
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        const data: SearchResult[] = await res.json();
        setResults(data);
      } catch (err) {
        setError(String(err));
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [port]
  );

  const searchWeb = useCallback(
    async (query: string, limit = 10) => {
      if (!port || !query.trim()) return;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ q: query, limit: String(limit) });
        const res = await fetch(`http://localhost:${port}/search/web?${params}`);
        if (!res.ok) {
          const body: { error?: string } = await res.json();
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        const data: SearchResult[] = await res.json();
        setResults(data);
      } catch (err) {
        setError(String(err));
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [port]
  );

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return { config, results, loading, error, searchAcademic, searchWeb, clearResults };
}
