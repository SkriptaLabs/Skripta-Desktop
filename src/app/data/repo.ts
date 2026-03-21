import { Repo } from "@automerge/automerge-repo";
import { IndexedDBStorageAdapter } from "@automerge/automerge-repo-storage-indexeddb";
import { BrowserWebSocketClientAdapter } from "@automerge/automerge-repo-network-websocket";

let _repo: Repo | null = null;

export function getOrCreateClientRepo(wsUrl: string): Repo {
  if (_repo) return _repo;
  _repo = new Repo({
    storage: new IndexedDBStorageAdapter("scripta"),
    network: [new BrowserWebSocketClientAdapter(wsUrl)],
  });
  return _repo;
}
