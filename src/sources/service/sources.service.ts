import { useState, useEffect, useCallback } from "react";
import type { Source } from "../sources.types";
import type { DocHandle } from "@automerge/automerge-repo";
import type { SourcesCollection } from "../../data/repo.context";

function sourcesFromHandle(handle: DocHandle<SourcesCollection>): Source[] {
  const doc = handle.docSync();
  if (!doc) return [];
  return Object.values(doc.sources);
}

export function useSources(handle: DocHandle<SourcesCollection> | null) {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    if (!handle) return;
    setSources(sourcesFromHandle(handle));
  }, [handle]);

  useEffect(() => {
    if (!handle) return;

    handle.whenReady().then(() => {
      refresh();
      setLoading(false);
    });

    const onChange = () => refresh();
    handle.on("change", onChange);
    return () => { handle.off("change", onChange); };
  }, [handle, refresh]);

  const search = useCallback(
    (query: string) => {
      if (!handle) return;
      if (!query.trim()) {
        refresh();
        return;
      }
      const lower = query.toLowerCase();
      const all = sourcesFromHandle(handle);
      setSources(
        all.filter(
          (s) =>
            s.title.toLowerCase().includes(lower) ||
            (s.authors ?? []).some((a) => a.toLowerCase().includes(lower)) ||
            s.quotes.some(
              (q) =>
                q.text.toLowerCase().includes(lower) ||
                (q.note ?? "").toLowerCase().includes(lower)
            )
        )
      );
    },
    [handle, refresh]
  );

  return { sources, loading, search };
}
