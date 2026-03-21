# Architecture: Scripta

## Stack
| Layer | Tech |
|---|---|
| Desktop shell | Tauri v2 (Rust) |
| UI | Vite + React 19 + Tailwind v4 |
| Backend | Node.js sidecar — Express 5, ESM, TypeScript |
| Data | Automerge CRDTs (`@automerge/automerge-repo`) — synced via WebSocket |
| UI Storage | IndexedDB (`@automerge/automerge-repo-storage-indexeddb`) |
| Server Storage | NodeFS (`@automerge/automerge-repo-storage-nodefs`) |
| Sync | WebSocket (`@automerge/automerge-repo-network-websocket`) |
| Agent API | MCP Streamable HTTP (`@modelcontextprotocol/sdk`) |

## Process Model
```
Tauri (Rust)
├── WebView → Vite dev server (port 1420) / dist/
│     └── Automerge Repo (IndexedDB + BrowserWebSocketClientAdapter)
│           └── connects to ws://localhost:<PORT>
└── spawns: packages/server (Node.js, dynamic port)
              ├── Automerge Repo (NodeFS + NodeWSServerAdapter)
              ├── WebSocket sync on same HTTP server
              ├── MCP /mcp (Streamable HTTP)
              └── writes port to $TMPDIR/scripta-server.port
Tauri lib.rs polls port file → exposes via IPC: get_server_port
UI fetches GET /repo-urls → creates client Repo → syncs via WS
```

## Data Sync Architecture
```
WebView (Tauri / Vite)                Express Server (Node.js)
┌──────────────────────────┐         ┌───────────────────────────┐
│ Repo                     │         │ Repo                      │
│   storage: IndexedDB     │◄── WS ─►│   storage: NodeFS         │
│   network: WsClient      │         │   network: WsServer       │
│                          │         │                           │
│ React reads Handles      │         │ MCP /mcp (HTTP)           │
│ directly — no fetch()    │         │   reads/writes Handles    │
│ live via handle.on()     │         │                           │
└──────────────────────────┘         └───────────────────────────┘
                                             ▲
                                     Agents (Copilot etc.)
```

- **Server Repo** is canonical and persistent (NodeFS at `~/.scripta/automerge/`).
- **WebView Repo** caches locally in IndexedDB — works briefly offline, auto-syncs on reconnect.
- **MCP** is unchanged — accesses server-side handles directly.
- **No REST API** for data — all CRUD happens via Automerge handle.change() / docSync().

## Directory Layout
```
src/                     # UI only — no Node.js APIs
  app/data/
    repo.ts              # Client Automerge Repo (IndexedDB + WS)
    repo.context.tsx     # React Context: RepoProvider + useRepo() — space-aware
  app/spaces/
    spaces.types.ts      # Space, SpacesCollection interfaces
    service/             # useSpaces() hook — CRUD for spaces
    components/          # SpacesList, SpaceForm
  app/<feature>/
    components/
    service/             # Hooks using DocHandle (no fetch)
src-tauri/src/lib.rs     # IPC: get_server_port
packages/server/src/     # Node.js sidecar (ESM, own package.json)
  index.ts               # Express, /repo-urls, /active-space, MCP, WS attach
  data/repo.ts           # Automerge init + WS adapter + getRepoUrls() + getSpaceDocHandles()
  spaces/
    spaces.types.ts      # Space, SpacesCollection interfaces
    data-access/         # CRUD for spaces
    mcp/                 # list_spaces, get_active_space
  <feature>/data-access/ # Automerge CRUD (used by MCP tools, space-scoped)
  <feature>/mcp/         # MCP tool definitions
  mcp/server.ts          # McpServer + /mcp routes
```

## Data Model
```ts
Space  { id, name (unique), description, userspaceUrl, aispaceUrl, sourcesUrl, createdAt, updatedAt }
Note   { id, title, content, space:"userspace"|"aispace", tags, createdAt, updatedAt }
Source { id, title, authors, year?, url?, quotes: Quote[], createdAt }
Quote  { id, text, page?, note? }
```
- `SpacesCollection { spaces: Record<string, Space> }` — one Automerge doc holding all spaces
- Each Space references 3 own Automerge docs (userspace notes, aispace notes, sources)
- `~/.scripta/state.json` stores `{ spacesUrl }` pointing to the SpacesCollection doc

## Server HTTP Endpoints
```
GET /repo-urls              → { spacesUrl }
POST /active-space          → sets active space (body: { spaceId })
GET /active-space           → returns active space { id, name, description } or null
DELETE /active-space         → clears active space
POST|GET|DELETE /mcp        → MCP Streamable HTTP transport
```

WebSocket upgrade on the same port for Automerge sync.

## MCP Tools
| Tool | Writes | Notes |
|---|---|---|
| `list_spaces` | — | all spaces (id, name, description) |
| `get_active_space` | — | name + description of active space |
| `search_notes` | — | both spaces readable, requires active space |
| `list_notes` | — | filter by space, requires active space |
| `write_to_aispace` | aispace | only write agents get, requires active space |
| `search_sources` | — | requires active space |
| `list_sources` | — | requires active space |
| `add_source` | sources | requires active space |
| `add_quote` | sources | requires active space |

Agents NEVER write to userspace directly.
All note/source tools operate on the currently active space.

## Spaces
- A **Space** is the top-level unit of organization — one per research project
- Each space has a unique name and a description (purpose of the research)
- Spaces contain their own isolated userspace notes, aispace notes, and sources
- At app start, the user sees a list of all spaces and can create/edit/delete them
- Entering a space loads its 3 Automerge docs and notifies the server via `POST /active-space`
- Leaving a space returns to the list and calls `DELETE /active-space`
- MCP tools for notes/sources require an active space; error if none is set

## Space Separation
- **Userspace**: human-authored only
- **AI-Space**: agent drafts; user adopts via UI → handle.change() moves note

## Ports
- Vite: `localhost:1420` (strict)
- Express + WS: OS-assigned, written to `$TMPDIR/scripta-server.port`
- CORS: `http://localhost:1420` only
- CSP: allows `ws://localhost:*` for WebSocket sync
- MCP URL shown in header with copy button

## Startup Flow
1. `npm run dev` → `tauri dev` → runs `dev:all` (Vite + Express)
2. Express starts, initializes Automerge Repo (NodeFS), loads/creates SpacesCollection doc
3. Writes port to temp file
4. Tauri polls port file → exposes via IPC
5. WebView `RepoProvider` gets port → fetches `/repo-urls` → gets `{ spacesUrl }`
6. Client Repo connects via WebSocket → syncs SpacesCollection doc
7. App shows SpacesList — user picks or creates a space
8. On space selection: client loads 3 space-specific docs via `repo.find()`, calls `POST /active-space`
9. NotesPanel/AiSpacePanel read/write via space-scoped DocHandles
10. On leaving space: `DELETE /active-space`, back to SpacesList

## Dev Commands
```
npm run dev       # tauri dev → starts dev:all
npm run dev:all   # vite + tsx watch packages/server/src/index.ts
npm run build     # tauri build
```
