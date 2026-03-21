import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { getOrCreateClientRepo } from "./repo";
import { getServerPort } from "../settings/data-access/server.api";
import type { DocHandle, Repo } from "@automerge/automerge-repo";
import type { Note } from "../notes/notes.types";
import type { Source } from "../sources/sources.types";
import type { Space, SpacesCollection } from "../spaces/spaces.types";

// Automerge-Dokument-Typen (müssen mit Server übereinstimmen)
export interface NotesCollection {
  notes: Record<string, Note>;
}

export interface SourcesCollection {
  sources: Record<string, Source>;
}

interface RepoContextValue {
  repo: Repo | null;
  spacesHandle: DocHandle<SpacesCollection> | null;
  activeSpace: Space | null;
  userspaceHandle: DocHandle<NotesCollection> | null;
  aispaceHandle: DocHandle<NotesCollection> | null;
  sourcesHandle: DocHandle<SourcesCollection> | null;
  selectSpace: (spaceId: string) => Promise<void>;
  leaveSpace: () => Promise<void>;
  ready: boolean;
  port: number | null;
}

const RepoContext = createContext<RepoContextValue>({
  repo: null,
  spacesHandle: null,
  activeSpace: null,
  userspaceHandle: null,
  aispaceHandle: null,
  sourcesHandle: null,
  selectSpace: async () => {},
  leaveSpace: async () => {},
  ready: false,
  port: null,
});

export function RepoProvider({ children }: { children: ReactNode }) {
  const [port, setPort] = useState<number | null>(null);
  const [repo, setRepo] = useState<Repo | null>(null);
  const [spacesHandle, setSpacesHandle] = useState<DocHandle<SpacesCollection> | null>(null);
  const [activeSpace, setActiveSpace] = useState<Space | null>(null);
  const [userspaceHandle, setUserspaceHandle] = useState<DocHandle<NotesCollection> | null>(null);
  const [aispaceHandle, setAispaceHandle] = useState<DocHandle<NotesCollection> | null>(null);
  const [sourcesHandle, setSourcesHandle] = useState<DocHandle<SourcesCollection> | null>(null);
  const [ready, setReady] = useState(false);

  // Phase 1: Connect to server and load spaces doc
  useEffect(() => {
    let cancelled = false;
    let tries = 0;

    const init = async () => {
      try {
        const p = await getServerPort();
        if (p <= 0) throw new Error("No port yet");

        const res = await fetch(`http://localhost:${p}/repo-urls`);
        if (!res.ok) throw new Error("repo-urls not ready");
        const urls: { spacesUrl: string } = await res.json();

        if (cancelled) return;

        const r = getOrCreateClientRepo(`ws://localhost:${p}`);
        const handle = await r.find<SpacesCollection>(urls.spacesUrl as any);
        await handle.whenReady();

        if (cancelled) return;

        setPort(p);
        setRepo(r);
        setSpacesHandle(handle);
        setReady(true);
      } catch {
        if (!cancelled && ++tries < 30) {
          setTimeout(init, 500);
        }
      }
    };

    init();
    return () => { cancelled = true; };
  }, []);

  const selectSpace = useCallback(async (spaceId: string) => {
    if (!repo || !spacesHandle || !port) return;

    const doc = spacesHandle.docSync();
    if (!doc) return;
    const space = doc.spaces[spaceId];
    if (!space) return;

    const [ush, ash, sh] = await Promise.all([
      repo.find<NotesCollection>(space.userspaceUrl as any),
      repo.find<NotesCollection>(space.aispaceUrl as any),
      repo.find<SourcesCollection>(space.sourcesUrl as any),
    ]);

    await Promise.all([ush.whenReady(), ash.whenReady(), sh.whenReady()]);

    // Notify server of active space
    await fetch(`http://localhost:${port}/active-space`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spaceId }),
    });

    setActiveSpace(space);
    setUserspaceHandle(ush);
    setAispaceHandle(ash);
    setSourcesHandle(sh);
  }, [repo, spacesHandle, port]);

  const leaveSpace = useCallback(async () => {
    if (port) {
      await fetch(`http://localhost:${port}/active-space`, { method: "DELETE" });
    }
    setActiveSpace(null);
    setUserspaceHandle(null);
    setAispaceHandle(null);
    setSourcesHandle(null);
  }, [port]);

  return (
    <RepoContext.Provider
      value={{
        repo,
        spacesHandle,
        activeSpace,
        userspaceHandle,
        aispaceHandle,
        sourcesHandle,
        selectSpace,
        leaveSpace,
        ready,
        port,
      }}
    >
      {children}
    </RepoContext.Provider>
  );
}

export function useRepo() {
  return useContext(RepoContext);
}
