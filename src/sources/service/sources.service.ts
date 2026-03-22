import { createSignal, createEffect, onCleanup, type Accessor } from "solid-js";
import type { Source } from "../sources.types";
import type { DocHandle } from "@automerge/automerge-repo";
import type { SourcesCollection } from "../../data/repo.context";

function sourcesFromHandle(handle: DocHandle<SourcesCollection>): Source[] {
  const doc = handle.docSync();
  if (!doc) return [];
  return Object.values(doc.sources);
}

export function useSources(handle: Accessor<DocHandle<SourcesCollection> | null>) {
  const [sources, setSources] = createSignal<Source[]>([]);
  const [loading, setLoading] = createSignal(true);

  createEffect(() => {
    const h = handle();
    if (!h) return;

    const refresh = () => setSources(sourcesFromHandle(h));

    h.whenReady().then(() => {
      refresh();
      setLoading(false);
    });

    h.on("change", refresh);
    onCleanup(() => h.off("change", refresh));
  });

  const search = (query: string) => {
    const h = handle();
    if (!h) return;
    if (!query.trim()) {
      setSources(sourcesFromHandle(h));
      return;
    }
    const lower = query.toLowerCase();
    const all = sourcesFromHandle(h);
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
  };

  return { sources, loading, search };
}
