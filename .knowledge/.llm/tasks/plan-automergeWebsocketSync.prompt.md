# Plan: Automerge WebSocket Sync (WebView ↔ Express)

## Ziel
Aktuell kommuniziert der WebView mit dem Express-Server über REST (`fetch()`). Der neue Ansatz
ersetzt das durch ein direkt synchronisiertes Automerge-Repo im WebView. Beide Repos (WebView +
Express) tauschen über einen WebSocket-Adapter automatisch CRDT-Diffs aus — kein REST-Polling,
kein manuelles Laden.

## Endarchitektur

```
WebView (Tauri / Vite)                Express Server (Node.js)
┌──────────────────────────┐         ┌───────────────────────────┐
│ Repo                     │         │ Repo                      │
│   storage: IndexedDB     │◄── WS ─►│   storage: NodeFS         │
│   network: WsClientAdapter│        │   network: WsServerAdapter│
│                          │         │                           │
│ React liest Handles      │         │ MCP /mcp (HTTP)           │
│ direkt — kein fetch()    │         │   liest/schreibt Handles  │
│ live via handle.on()     │         │                           │
└──────────────────────────┘         └───────────────────────────┘
                                             ▲
                                     Agents (Copilot etc.)
```

- **Eine Datenquelle**: Das NodeFS-Repo des Servers ist kanonisch und persistent.
- **WebView-Repo**: IndexedDB cachet lokal — App funktioniert auch kurz offline, synct beim
  Reconnect automatisch nach.
- **MCP**: unverändert, greift weiter auf die Server-Handles zu.

---

## Phasen

### Phase 1 — Server: WebSocket-Adapter hinzufügen

**Dateien**: `packages/server/src/data/repo.ts`, `packages/server/src/index.ts`

1. Pakete installieren:
   ```
   npm install ws @automerge/automerge-repo-network-websocket --workspace=packages/server
   npm install @types/ws --workspace=packages/server --save-dev
   ```

2. In `repo.ts` den `WebSocketServer`-Adapter an das bestehende `Repo` anhängen:
   ```ts
   import { WebSocketServerAdapter } from "@automerge/automerge-repo-network-websocket";
   import { WebSocketServer } from "ws";

   // Nach app.listen():
   const wss = new WebSocketServer({ server });   // teilt sich den HTTP-Server
   _repo.networkSubsystem.addNetworkAdapter(new WebSocketServerAdapter(wss));
   ```

3. Der `wss` muss auf denselben `http.Server` aufgesetzt werden der Express nutzt → `server`
   aus dem `app.listen()`-Rückgabewert weitergeben.

4. Die Document-URLs (`userspaceUrl`, `aispaceUrl`, `sourcesUrl`) müssen für den WebView
   abrufbar sein → neuer Endpunkt:
   ```
   GET /repo-urls  →  { userspaceUrl, aispaceUrl, sourcesUrl, wsPort }
   ```

**Kein Breaking Change**: REST-Routen und MCP bleiben vorerst unverändert.

---

### Phase 2 — WebView: Automerge-Repo einrichten

**Neue Dateien**: `src/app/data/repo.ts`, `src/app/data/repo.context.tsx`

1. Pakete installieren (root, da Vite-Bundle):
   ```
   npm install @automerge/automerge-repo \
               @automerge/automerge-repo-storage-indexeddb \
               @automerge/automerge-repo-network-websocket
   ```

2. `src/app/data/repo.ts` — Repo-Initialisierung:
   ```ts
   import { Repo } from "@automerge/automerge-repo";
   import { IndexedDBStorageAdapter } from "@automerge/automerge-repo-storage-indexeddb";
   import { WebSocketClientAdapter } from "@automerge/automerge-repo-network-websocket";

   export function createClientRepo(wsUrl: string) {
     return new Repo({
       storage: new IndexedDBStorageAdapter("scripta"),
       network: [new WebSocketClientAdapter(wsUrl)],
     });
   }
   ```

3. `src/app/data/repo.context.tsx` — React Context der das Repo und die Handles bereitstellt:
   - Holt via `GET /repo-urls` die Document-URLs und den WS-Port
   - Erstellt das Repo und ruft `repo.find(url)` für jedes Dokument auf
   - Stellt `{ userspaceHandle, aispaceHandle, sourcesHandle, ready }` per Context bereit
   - `ready` wird `true` sobald alle drei Handles in State `"ready"` sind

4. `src/main.tsx` — `<RepoProvider>` um `<App>` wrappen (ersetzt `<ServerProvider>`)

---

### Phase 3 — React-Services auf Handles umstellen

Aktuell: `fetch()` → REST → React-State
Neu: `handle.docSync()` → direkt aus lokalem Repo, `handle.on("change")` für live Updates

**Muster für jeden Service** (Beispiel Notes):

```ts
// notes.service.ts — neu
export function useNotes(handle: DocHandle<NotesCollection>, space) {
  const [notes, setNotes] = useState(() => getFromHandle(handle, space));

  useEffect(() => {
    const listener = ({ doc }) => setNotes(getFromHandle({ docSync: () => doc }, space));
    handle.on("change", listener);
    return () => handle.off("change", listener);
  }, [handle, space]);

  const addNote = (dto) => {
    handle.change(doc => { doc.notes[uuid()] = buildNote(dto); });
  };

  return { notes, addNote, ... };
}
```

**Dateien betroffen**:
- `src/app/notes/service/notes.service.ts` — auf Handle umstellen
- `src/app/notes/components/NotesPanel.tsx` — Handle aus Context
- `src/app/aispace/components/AiSpacePanel.tsx` — Handle aus Context
- `src/app/sources/service/sources.service.ts` — auf Handle umstellen

---

### Phase 4 — Aufräumen (nach Verifikation)

Sobald alle Features über Handles laufen:

- `src/app/notes/data-access/notes.api.ts` — löschen
- `src/app/sources/data-access/sources.api.ts` — löschen
- `src/app/settings/` — `server.api.ts`, `server.service.ts`, `server.context.tsx` löschen
  (Port-Discovery wird durch `GET /repo-urls` ersetzt, dann entfällt auch das)
- REST-Routen `/notes`, `/sources` aus `packages/server/src/index.ts` entfernen
- `ServerStatus.tsx` umbauen: zeigt WS-Verbindungsstatus statt Port

---

## Abhängigkeiten zwischen Phasen

```
Phase 1 (Server WS)
    └─► Phase 2 (Client Repo)
            └─► Phase 3 (Services umstellen) — kann feature-weise inkrementell erfolgen
                    └─► Phase 4 (Aufräumen)
```

Phase 3 kann inkrementell feature-weise umgestellt werden — Notes zuerst, Sources danach —
während REST-Routen noch parallel laufen.

---

## Verifikation

1. Server startet, WS-Endpunkt erreichbar (`ws://localhost:<PORT>`)
2. `GET /repo-urls` liefert die drei Automerge-URLs
3. WebView verbindet sich, Repo-State wird `"ready"`
4. Notiz im WebView erstellen → erscheint in Server-Repo (via MCP `list_notes` prüfbar)
5. Agent schreibt via MCP in aispace → erscheint live im WebView ohne Reload
6. App offline starten → Daten aus IndexedDB vorhanden → WS-Reconnect synct Delta

---

## Risiken / Offene Fragen

- **Tauri CSP**: `connect-src` in `tauri.conf.json` muss `ws://localhost:*` erlauben (aktuell
  nur `http://localhost:*`).
- **Port-Discovery**: Der WebView muss den dynamischen Port noch kennen. Entweder bleibt die
  Tauri-IPC-Methode `get_server_port` erhalten, oder der WS läuft auf einem fixen Dev-Port.
- **IndexedDB in Tauri WebView**: Funktioniert in Webkit-basierten WebViews (Linux GTK WebKit2,
  macOS WebKit). Auf Linux mit älteren GTK-Versionen nachprüfen.
- **automerge-repo v2 WS-Adapter API**: Die Adapter-Pakete haben sich zwischen v1 und v2
  geändert. Vor Implementierung die exakte API aus den `.d.ts`-Dateien prüfen.
