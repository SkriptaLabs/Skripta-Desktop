# Plan: React → SolidJS Migration

## Ziel
Das Frontend von React 19 auf SolidJS umstellen. SolidJS bietet fine-grained Reactivity:
Nur die tatsächlich betroffenen DOM-Knoten werden aktualisiert, nicht ganze Komponentenbäume.
Funktionale Komponenten sind an einzelne Signals gebunden, nicht an viele States gleichzeitig.

## Endarchitektur (unverändert — nur Rendering-Layer tauscht)

```
WebView (Tauri / Vite)                Express Server (Node.js)
┌──────────────────────────┐         ┌───────────────────────────┐
│ SolidJS App              │         │ Repo (unverändert)        │
│   Signals + Stores       │◄── WS ─►│   storage: NodeFS         │
│   Automerge Repo         │         │   network: WsServerAdapter│
│   storage: IndexedDB     │         │                           │
│   network: WsClientAdapter│        │ MCP /mcp (HTTP)           │
│                          │         │   liest/schreibt Handles  │
└──────────────────────────┘         └───────────────────────────┘
```

Server-Code, MCP-Tools, Tauri-Shell und Automerge-Bibliotheken bleiben unverändert.

## Nicht betroffen

- `packages/server/**` — kein React, keine Änderungen
- `src-tauri/**` — lädt nur WebView-URL, kein Framework-Bezug
- `src/data/repo.ts` — reines Automerge-Setup, kein React
- `src/**/**.types.ts` — reine TypeScript-Interfaces
- `src/settings/data-access/server.api.ts` — reines Tauri-IPC

## API-Mapping React → SolidJS

| React                      | SolidJS                          | Hinweis                                      |
|----------------------------|----------------------------------|----------------------------------------------|
| `useState(init)`          | `createSignal(init)`             | Gibt `[getter, setter]` zurück — getter ist Funktion |
| `useEffect(fn, [deps])`  | `createEffect(fn)`               | Deps werden automatisch getrackt              |
| `useEffect(fn, [])`      | `onMount(fn)`                    | Einmaliger Init-Code                          |
| `useCallback(fn, [deps])`| Nicht nötig                      | Funktionen sind in Solid stabil               |
| `useRef(null)`            | `let ref: HTMLElement`           | Direkte Variable + `ref={el => ref = el}`     |
| `createContext`           | `createContext`                   | Fast identisch                                |
| `useContext`              | `useContext`                      | Identisch                                     |
| `ReactDOM.createRoot()`  | `render(() => <App/>, root)`    | aus `solid-js/web`                            |
| `React.StrictMode`       | Entfällt                          | Solid hat kein Äquivalent / braucht keins     |
| `ReactNode`              | `JSX.Element` / `ParentProps`    | `ParentProps` für `{ children }`              |
| `React.FormEvent`        | `Event & { currentTarget: ... }` | Native DOM-Events                             |
| `{cond && <X/>}`         | `<Show when={cond}><X/></Show>` | Solid braucht `<Show>` für Conditional Rendering |
| `{items.map(i => <X/>)}` | `<For each={items()}>{i => <X/>}</For>` | Reaktive Listen mit Key-Tracking        |
| `condition ? <A/> : <B/>`| `<Show when={cond} fallback={<B/>}><A/></Show>` |                                |

## Schritte

### Phase 0: Build-Tooling umstellen

**0.1** Dependencies tauschen:
```
# Entfernen
npm uninstall react react-dom @types/react @types/react-dom @vitejs/plugin-react

# Installieren
npm install solid-js
npm install -D vite-plugin-solid
```

**0.2** `vite.config.ts` — Plugin tauschen:
- `@vitejs/plugin-react` → `vite-plugin-solid`
- `vite-plugin-wasm` und `@tailwindcss/vite` bleiben

**0.3** `tsconfig.json` — JSX-Konfiguration:
- `"jsx": "preserve"` (statt `"react-jsx"`)
- `"jsxImportSource": "solid-js"` hinzufügen

**0.4** `index.html` — bleibt unverändert (`<div id="root">`, `<script src="/src/main.tsx">`)

**Verifizierung:** `npx tsc --noEmit` muss durchlaufen (nach Phase 1).

---

### Phase 1: Entry-Point + Provider (Kern-Infrastruktur)

**1.1** `src/main.tsx` — Root-Render umschreiben:
- `ReactDOM.createRoot(root).render(...)` → `render(() => <App/>, root)`
- `React.StrictMode` entfernen
- Import: `import { render } from "solid-js/web"`

**1.2** `src/data/repo.context.tsx` — Provider auf Signals umstellen:
- Datei: Die zentrale Infrastruktur-Datei. 8× `useState` → 8× `createSignal`
- `useEffect` (Init-Logik mit Retry) → `onMount` + manueller Retry-Loop
- `useEffect` (activeSpace-Sync) → `createEffect` mit Guard auf `activeSpace()?.id`
- `useCallback` (`selectSpace`, `leaveSpace`) → normale `async function`-Definitionen
  (Solid braucht keine Memoization, Funktionen werden nicht bei jedem Render neu erstellt)
- `createContext` + `useContext` → identische API aus `solid-js`
- `ReactNode` → `ParentProps` aus `solid-js`
- Context-Value: Getter-Funktionen statt direkte Werte
  (`repo: Accessor<Repo | null>` statt `repo: Repo | null`)

**Achtung — Solid-Falle:**
- Props dürfen NICHT destrukturiert werden (`const { children } = props` verliert Reaktivität).
  Stattdessen: `props.children` direkt verwenden, oder `splitProps()` nutzen.
- Context-Werte die Accessors sind, müssen als Funktionen aufgerufen werden: `repo()` statt `repo`.

**Verifizierung:** App startet, zeigt Spaces-Liste (nach Phase 2).

---

### Phase 2: Service-Hooks → Reactive Primitives

Die drei Service-Hooks folgen dem gleichen Muster. Jeder wird einzeln portiert.

**2.1** `src/spaces/service/spaces.service.ts` — `useSpaces()` umschreiben:
- `useState` → `createSignal`
- `useEffect` (Listener-Setup) → `createEffect` + `onCleanup`
- `useCallback` (addSpace, editSpace, removeSpace) → normale Funktionen
- Rückgabe: Accessors statt Werte → `{ spaces: Accessor<Space[]>, loading: Accessor<boolean>, ... }`
- Cleanup: `onCleanup(() => handle.off("change", onChange))` statt Return-Funktion

**2.2** `src/notes/service/notes.service.ts` — `useNotes()` umschreiben:
- Gleiches Muster wie 2.1
- `useState` (notes, loading, error) → 3× `createSignal`
- `useCallback` (refresh, addNote, editNote, removeNote, search) → normale Funktionen

**2.3** `src/sources/service/sources.service.ts` — `useSources()` umschreiben:
- Gleiches Muster wie 2.1
- `useState` (sources, loading) → 2× `createSignal`
- `useCallback` (refresh, search) → normale Funktionen

**Generisches Muster für alle drei:**
```ts
// Vorher (React)
const [items, setItems] = useState<T[]>([]);
useEffect(() => {
  handle.on("change", refresh);
  return () => handle.off("change", refresh);
}, [handle]);

// Nachher (Solid)
const [items, setItems] = createSignal<T[]>([]);
createEffect(() => {
  const h = handle(); // Accessor aufrufen
  if (!h) return;
  const refresh = () => setItems(itemsFromHandle(h));
  h.whenReady().then(refresh);
  h.on("change", refresh);
  onCleanup(() => h.off("change", refresh));
});
```

**Verifizierung:** Hooks kompilieren. `npx tsc --noEmit` sauber.

---

### Phase 3: Komponenten portieren (UI-Layer)

**3.1** `src/App.tsx` — Hauptkomponente:
- `useState` (showAiSpace, editingName, nameValue) → `createSignal`
- `useRef` (nameInputRef) → `let nameInputRef: HTMLInputElement`
- `useEffect` (focus/select) → `createEffect`
- Conditional Rendering: `&&` → `<Show when={...}>`, Ternary → `<Show when={...} fallback={...}>`
- `useRepo()` Accessor-Zugriffe: `activeSpace()`, `leaveSpace()`, etc.

**3.2** `src/spaces/components/SpacesList.tsx`:
- `useState` (creating, editing, confirmDelete) → `createSignal`
- List Rendering: `spaces.map(...)` → `<For each={spaces()}>{space => ...}</For>`
- Conditional Rendering → `<Show>`-Blöcke
- Accessor-Zugriffe für `useSpaces()` und `useRepo()` Werte

**3.3** `src/spaces/components/SpaceForm.tsx`:
- `useState` (name, description, error) → `createSignal`
- `useEffect` (existingSpace-Sync) → `createEffect`
- Props: Interface beibehalten, aber NICHT destrukturieren
- `React.FormEvent` → `Event & { currentTarget: HTMLFormElement; preventDefault(): void }`
- Controlled Inputs: `value={name()}` + `onInput` statt `onChange`
  (Solid nutzt `onInput` für Live-Updates, `onChange` feuert erst bei Blur)

**3.4** `src/notes/components/NotesPanel.tsx`:
- `useState` (query, creating, newTitle) → `createSignal`
- List Rendering → `<For>`
- Conditional Rendering → `<Show>`
- Form-Handling analog zu SpaceForm

**3.5** `src/aispace/components/AiSpacePanel.tsx`:
- Kein eigener State — nutzt nur Hooks aus Context/Service
- List Rendering → `<For>`
- Conditional Rendering → `<Show>`
- Einfachste Komponente, guter Startpunkt für Verifikation

**3.6** `src/settings/components/ServerStatus.tsx`:
- `useState` (copied) → `createSignal`
- Conditional Rendering → `<Show>`

**Verifizierung pro Komponente:** App im Browser testen — Spaces erstellen/bearbeiten/löschen,
Notizen erstellen, KI-Space anzeigen, Server-Status prüfen.

---

### Phase 4: Aufräumen & Verifizieren

**4.1** `uuid`-Package prüfen — wird es noch gebraucht?
- Wurde für Space-IDs durch Auto-Increment ersetzt
- Prüfen ob Notes/Sources noch `uuid` nutzen → wenn ja, behalten; wenn nein, entfernen

**4.2** ESLint-Config anpassen:
- `eslint.config.mjs` — React-spezifische Regeln entfernen
- Optional: `eslint-plugin-solid` installieren

**4.3** Globals/Types aufräumen:
- `src/vite-env.d.ts` — bleibt (Vite-Referenz, kein React)
- `@types/react`, `@types/react-dom` sind bereits in Phase 0 deinstalliert

**4.4** Vollständige Verifizierung:
- `npx tsc --noEmit` — keine Fehler
- `npm run build` — Vite-Build erfolgreich
- `npm run dev` — App startet im Tauri-Fenster
- Manueller Test: Space erstellen → betreten → Notiz anlegen → Space-Name inline editieren → Space verlassen → löschen
- MCP-Tools testen (unverändert, aber End-to-End sicherstellen)

---

## Betroffene Dateien (vollständig)

| Datei | Änderungsart |
|-------|-------------|
| `package.json` | Deps tauschen |
| `vite.config.ts` | Plugin tauschen |
| `tsconfig.json` | JSX-Config |
| `src/main.tsx` | Root-Render |
| `src/data/repo.context.tsx` | Provider: 8 Signals, Effects, Context |
| `src/spaces/service/spaces.service.ts` | Hook → Reactive Primitive |
| `src/notes/service/notes.service.ts` | Hook → Reactive Primitive |
| `src/sources/service/sources.service.ts` | Hook → Reactive Primitive |
| `src/App.tsx` | Signals, Show, Ref |
| `src/spaces/components/SpacesList.tsx` | Signals, For, Show |
| `src/spaces/components/SpaceForm.tsx` | Signals, Effect, onInput |
| `src/notes/components/NotesPanel.tsx` | Signals, For, Show |
| `src/aispace/components/AiSpacePanel.tsx` | For, Show |
| `src/settings/components/ServerStatus.tsx` | Signal, Show |
| `eslint.config.mjs` | React-Regeln entfernen |

## Nicht betroffen

| Datei/Ordner | Grund |
|---|---|
| `packages/server/**` | Kein React, kein Frontend |
| `src-tauri/**` | Lädt nur URL — Framework-agnostisch |
| `src/data/repo.ts` | Reines Automerge — kein React |
| `src/**/*.types.ts` | Reine Interfaces |
| `src/settings/data-access/server.api.ts` | Reines Tauri-IPC |

## Bekannte Stolperfallen

1. **Props nicht destrukturieren** — `const { name } = props` verliert Reaktivität. Immer `props.name` verwenden oder `splitProps()`.
2. **Accessors aufrufen** — `count` in React vs. `count()` in Solid. Vergessene Klammern → statischer Wert.
3. **`onChange` vs. `onInput`** — Solids `onChange` feuert wie natives DOM-Change (bei Blur). Für Live-Typing `onInput` nutzen.
4. **Kein Re-Render** — Solid-Komponenten laufen nur einmal. Code außerhalb von `createEffect` wird nicht erneut ausgeführt.
5. **`<For>` braucht Accessor** — `<For each={mySignal()}>`, nicht `<For each={myArray}>`.
6. **Conditional Rendering** — `{cond() && <X/>}` funktioniert technisch, aber `<Show>` ist idiomatischer und vermeidet unnötige DOM-Erstellung.
