import {
  createContext,
  useContext,
  createSignal,
  onMount,
  onCleanup,
  type ParentProps,
  type Accessor,
} from "solid-js";
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
  repo: Accessor<Repo | null>;
  spacesHandle: Accessor<DocHandle<SpacesCollection> | null>;
  activeSpace: Accessor<Space | null>;
  userspaceHandle: Accessor<DocHandle<NotesCollection> | null>;
  aispaceHandle: Accessor<DocHandle<NotesCollection> | null>;
  sourcesHandle: Accessor<DocHandle<SourcesCollection> | null>;
  selectSpace: (spaceId: string) => Promise<void>;
  leaveSpace: () => Promise<void>;
  ready: Accessor<boolean>;
  port: Accessor<number | null>;
}

const RepoContext = createContext<RepoContextValue>({
  repo: () => null,
  spacesHandle: () => null,
  activeSpace: () => null,
  userspaceHandle: () => null,
  aispaceHandle: () => null,
  sourcesHandle: () => null,
  selectSpace: async () => {},
  leaveSpace: async () => {},
  ready: () => false,
  port: () => null,
});

export function RepoProvider(props: ParentProps) {
  const [port, setPort] = createSignal<number | null>(null);
  const [repo, setRepo] = createSignal<Repo | null>(null);
  const [spacesHandle, setSpacesHandle] = createSignal<DocHandle<SpacesCollection> | null>(null);
  const [activeSpace, setActiveSpace] = createSignal<Space | null>(null);
  const [userspaceHandle, setUserspaceHandle] = createSignal<DocHandle<NotesCollection> | null>(null);
  const [aispaceHandle, setAispaceHandle] = createSignal<DocHandle<NotesCollection> | null>(null);
  const [sourcesHandle, setSourcesHandle] = createSignal<DocHandle<SourcesCollection> | null>(null);
  const [ready, setReady] = createSignal(false);

  // Phase 1: Connect to server and load spaces doc
  onMount(() => {
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
    onCleanup(() => { cancelled = true; });
  });

  const selectSpace = async (spaceId: string) => {
    const r = repo();
    const sh = spacesHandle();
    const p = port();
    if (!r || !sh || !p) return;

    const doc = sh.docSync();
    if (!doc) return;
    const space = doc.spaces[spaceId] ?? doc.spaces[Number(spaceId)];
    if (!space) return;

    const [ush, ash, srch] = await Promise.all([
      r.find<NotesCollection>(space.userspaceUrl as any),
      r.find<NotesCollection>(space.aispaceUrl as any),
      r.find<SourcesCollection>(space.sourcesUrl as any),
    ]);

    await Promise.all([ush.whenReady(), ash.whenReady(), srch.whenReady()]);

    // Notify server of active space
    await fetch(`http://localhost:${p}/active-space`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spaceId }),
    });

    setActiveSpace(space);
    setUserspaceHandle(ush);
    setAispaceHandle(ash);
    setSourcesHandle(srch);
  };

  const leaveSpace = async () => {
    const p = port();
    if (p) {
      await fetch(`http://localhost:${p}/active-space`, { method: "DELETE" });
    }
    setActiveSpace(null);
    setUserspaceHandle(null);
    setAispaceHandle(null);
    setSourcesHandle(null);
  };

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
      {props.children}
    </RepoContext.Provider>
  );
}

export function useRepo() {
  return useContext(RepoContext);
}
