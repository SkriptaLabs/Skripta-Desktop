# Plan: Space Scope via File Server

## TL;DR
Add a dedicated `packages/file_server/` sync-only server (Automerge WS + NodeFS, no MCP).
Introduce a `SyncServer` config stored in `state.json` on the mcp_server. Users manage remote servers in a new Settings screen, test connections (browser → file_server /health), then associate a Space with a server via an optional `syncServerId` on the Space. When entering a Space with a server, the frontend adds a second `BrowserWebSocketClientAdapter` for the remote server's WS.

**Answers:**
- file_server = separate process (runs alongside mcp_server)
- Server list = server-side (state.json)
- Connection test = client-side (browser → `GET <url>/health`)
- Settings = new full-screen Settings view, accessible from header

---

## Phase 1 — file_server package

**Goal**: Standalone Automerge sync server that can run locally or remotely.

1. **`packages/file_server/package.json`** — ESM, TypeScript, same deps as mcp_server minus MCP and express-minus-cors-minus-uuid: `@automerge/automerge-repo`, `@automerge/automerge-repo-storage-nodefs`, `@automerge/automerge-repo-network-websocket`, `ws`, `cors`, `express`, `tsx` (dev). scripts: dev/build/start.
2. **`packages/file_server/tsconfig.json`** — copy from mcp_server.
3. **`packages/file_server/src/index.ts`** — 
   - Start Express server (dynamic or env PORT)
   - `GET /health` endpoint with CORS `*` → returns `{ ok: true, version: "1.0.0" }`
   - Init Automerge Repo: NodeFS storage at `~/.scripta/fileserver/`
   - Attach WebSocketServer to same HTTP server (like mcp_server)
   - Write port to `$TMPDIR/scripta-fileserver.port`

---

## Phase 2 — mcp_server: SyncServer config

**Goal**: Store and expose the remote server list.

4. **New type: `packages/mcp_server/src/servers/servers.types.ts`**:
   ```ts
   interface SyncServer { id, name, url, createdAt }
   // local server entry is synthetic (never persisted)
   ```
5. **`packages/mcp_server/src/servers/data-access/servers.repo.ts`** — reads/writes `servers` array in `state.json` (add field to existing state). Functions: `listRemoteServers()`, `createServer(dto)`, `deleteServer(id)`, `updateServer(id, patch)`. The "local" entry is always prepended dynamically using the fileserver port file.
6. **Extend `initRepo()` in `data/repo.ts`** — state.json now schema `{ spacesUrl, servers: [] }`, migrate if `servers` absent.
7. **New endpoints in `src/index.ts`**:
   - `GET /servers` — returns `[{ id: "local", name: "Lokal", url: "http://localhost:<fileserverPort>", isLocal: true }, ...remoteServers]`. Reads `scripta-fileserver.port` at runtime.
   - `POST /servers` — body `{ name, url }`, persists to state.json, returns new SyncServer
   - `PATCH /servers/:id` — body `{ name?, url? }`, returns updated
   - `DELETE /servers/:id` — removes from state.json

---

## Phase 3 — mcp_server: Space gets syncServerId

**Goal**: Associate a Space with a SyncServer.

8. **`packages/mcp_server/src/spaces/spaces.types.ts`** — add `syncServerId?: string` to Space.
9. **`packages/mcp_server/src/spaces/data-access/spaces.repo.ts`** — extend `updateSpace()` to accept `syncServerId`.

---

## Phase 4 — Frontend: types + API layer

**Goal**: Frontend can fetch/manage servers and update space.syncServerId.

10. **New type `src/settings/settings.types.ts`**:
    ```ts
    interface SyncServer { id, name, url, isLocal: boolean, createdAt: string }
    ```
11. **`src/settings/data-access/server.api.ts`** — add to existing file:
    - `getServers()` → GET /servers
    - `createServer(dto)` → POST /servers
    - `deleteServer(id)` → DELETE /servers/:id
    - `updateServer(id, patch)` → PATCH /servers/:id
    - `testConnection(url)` → direct browser fetch `GET ${url}/health`
12. **`src/spaces/spaces.types.ts`** — add `syncServerId?: string` to Space.
13. **`src/spaces/service/spaces.service.ts`** — extend `editSpace()` to patch `syncServerId`.

---

## Phase 5 — Frontend: Settings screen (Servers panel)

**Goal**: Full-screen Settings view with server management.

14. **`src/settings/service/servers.service.ts`** — `useServers()` hook:
    - Signals: `servers`, `loading`, `error`
    - Methods: `addServer(dto)`, `removeServer(id)`, `testServer(url)` → `{ ok, latency? }`; sets per-server status signal
    - `testServer()` is async, sets temporary `testing` / `ok` / `failed` state per server id
15. **`src/settings/components/ServerForm.tsx`** — Add/Edit server form:
    - Fields: name (text), url (text/url)
    - "Verbindung testen" button — runs testServer(), shows inline result (green/red)
    - Save button **disabled** until connection test passed
    - Cancel button
16. **`src/settings/components/ServersList.tsx`** — Server management panel:
    - Lists all servers (local first, non-deletable)
    - Each row: name, url, test button, delete button (not for local)
    - SpaceForm inline for adding
17. **`src/settings/components/SettingsScreen.tsx`** — Full-screen container:
    - Back button → returns to previous view
    - Header "Einstellungen"
    - Section "Sync-Server" → renders `ServersList`

---

## Phase 6 — Frontend: Settings navigation

**Goal**: User can reach the Settings screen from the header.

18. **`src/App.tsx`** — Add a `showSettings` signal. A settings icon button in the header toggles it. When true, render `<SettingsScreen />` instead of normal content.
   - Route logic: if no activeSpace → show SpacesList (or Settings); if activeSpace → show notes panels (or Settings).

---

## Phase 7 — Frontend: SpaceForm — server association

**Goal**: Associate a Space with a server in Create/Edit flow.

19. **`src/spaces/components/SpaceForm.tsx`** — Add "Sync-Server" field:
    - Dropdown (or select) showing: "Keiner" + all servers from `useServers()`
    - Selected value stored in `syncServerId` signal
    - Passed to `onSave({ name, description, syncServerId })`
20. **`src/spaces/components/SpacesList.tsx`** — pass `syncServerId` through to `addSpace()`/`editSpace()`.

---

## Phase 8 — Frontend: Repo context — connect to remote server

**Goal**: When entering a Space with syncServerId, connect to its WS.

21. **`src/data/repo.context.tsx`** — In `selectSpace()`:
    - After loading doc handles, check `space.syncServerId`
    - If set, call `getServers()` to find the matching server URL
    - Convert http URL → ws URL (replace `http://` with `ws://`, `https://` → `wss://`)
    - Call `repo.networkSubsystem.addNetworkAdapter(new BrowserWebSocketClientAdapter(wsUrl))`
    - Track added adapters in a ref so they can be disconnected in `leaveSpace()`
22. **`src/data/repo.ts`** — Export `addSyncPeer(wsUrl)` / `removeSyncPeer(wsUrl)` helpers if needed.

---

## Phase 9 — Dev tooling + Tauri

**Goal**: file_server starts alongside mcp_server in dev and production.

23. **Root `package.json`** — add file_server to `dev:all` script: `concurrently "vite" "tsx watch packages/mcp_server/src/index.ts" "tsx watch packages/file_server/src/index.ts"`.
24. **`src-tauri/tauri.conf.json`** (and `src-tauri/Cargo.toml`) — add file_server as a second sidecar (parallel to mcp_server) — `beforeDevCommand` already handled by dev:all; for release, add `externalBin` entry for file_server.

---

## Phase 10 — i18n

25. **`src/location/{en,de,ar}.json`** — Add keys: `settings.title`, `settings.back`, `servers.title`, `servers.add`, `servers.test`, `servers.testOk`, `servers.testFail`, `servers.delete`, `servers.local`, `servers.noServer`, `spaceForm.syncServer`.

---

## Relevant files

- `packages/file_server/` — new (currently empty)
- `packages/mcp_server/src/index.ts` — add /servers endpoints
- `packages/mcp_server/src/data/repo.ts` — extend state.json schema
- `packages/mcp_server/src/spaces/spaces.types.ts` — add syncServerId
- `packages/mcp_server/src/spaces/data-access/spaces.repo.ts` — updateSpace patch
- `src/spaces/spaces.types.ts` — add syncServerId
- `src/spaces/service/spaces.service.ts` — editSpace patch
- `src/spaces/components/SpaceForm.tsx` — server dropdown
- `src/spaces/components/SpacesList.tsx` — pass syncServerId
- `src/settings/data-access/server.api.ts` — new server API calls
- `src/settings/service/servers.service.ts` — new file
- `src/settings/components/ServersList.tsx` — new file
- `src/settings/components/ServerForm.tsx` — new file
- `src/settings/components/SettingsScreen.tsx` — new file
- `src/data/repo.context.tsx` — remote WS in selectSpace
- `src/data/repo.ts` — optional helpers
- `src/App.tsx` — settings navigation toggle
- `package.json` (root) — dev:all
- `src-tauri/tauri.conf.json` — sidecar config
- `src/location/*.json` — i18n keys

## Verification

1. Start `npm run dev` — both mcp_server and file_server should start
2. Check `scripta-fileserver.port` is written to `$TMPDIR`
3. Open Settings → Servers — local server entry appears with correct URL
4. Add a remote server URL pointing to a test file_server instance — test connection → green indicator → save enabled → save
5. Create a new Space, assign the remote server → save
6. Enter the Space → verify in browser DevTools Network that a WS connection to the remote URL opens
7. A second client connecting to the same remote file_server WS should sync demo changes

## Decisions

- MCP has NO access to file_server (file_server has no MCP routes; mcp_server only exposes the server list)
- Local file_server is always started (separate process), never deletable from Settings
- Remote servers require a successful `/health` check before a Space can be saved with that server
- Automerge sync peer is added at space-enter time, not globally
- Server list is device-local (state.json) — not synced via Automerge
- file_server storage: `~/.scripta/fileserver/` (separate from mcp_server's `~/.scripta/automerge/`)
- Connection test uses `GET <url>/health` with CORS `*` on file_server
