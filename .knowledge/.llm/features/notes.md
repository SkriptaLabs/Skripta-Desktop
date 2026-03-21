# Feature: Notizen

## Überblick
Notizen sind das Kernfeature von Scripta. Nutzer erstellen, bearbeiten, suchen und löschen
Textnotizen. KI-Agents können eigenständig Entwürfe im **KI-Space** anlegen, die der Nutzer
prüft und bei Bedarf in seinen **Userspace** übernimmt.

## Spaces
- **Userspace**: Vom Menschen geschrieben. Agents dürfen hier **nicht** direkt schreiben.
- **KI-Space (aispace)**: Agent-Entwürfe. Der Nutzer kann sie über „Übernehmen" in den
  Userspace verschieben.

Jede Notiz gehört genau einem Space an (`space: "userspace" | "aispace"`).

## Datenmodell
```ts
Note {
  id: string          // UUID
  title: string
  content: string
  space: "userspace" | "aispace"
  tags?: string[]
  createdAt: string   // ISO 8601
  updatedAt: string   // ISO 8601
}
```

Notizen werden als Automerge-Dokument gespeichert — ein Dokument pro Space
(`NotesCollection { notes: Record<string, Note> }`).

## Aktionen

| Aktion | Wer | Beschreibung |
|---|---|---|
| Erstellen | Nutzer / Agent | Titel + optionaler Inhalt, Tags |
| Bearbeiten | Nutzer / Agent | Titel, Inhalt, Tags einzeln änderbar |
| Löschen | Nutzer | Entfernt Notiz aus dem jeweiligen Space |
| Suchen | Nutzer / Agent | Volltextsuche über Titel, Inhalt, Tags |
| Übernehmen | Nutzer | Verschiebt Notiz aus KI-Space → Userspace |

## UI-Komponenten
- **NotesPanel** — Hauptansicht: Liste der Userspace-Notizen, Suche, Erstell-Dialog,
  Löschen per Hover-Button (✕)
- **AiSpacePanel** — Seitenleiste: KI-Space-Notizen mit Vorschau und „Übernehmen"-Button

## MCP-Tools (für Agents)
| Tool | Beschreibung |
|---|---|
| `list_notes` | Listet Notizen, optional nach Space gefiltert |
| `search_notes` | Sucht in beiden Spaces |
| `write_to_aispace` | Erstellt eine Notiz im KI-Space (einziger Schreibzugriff für Agents) |

## Dateistruktur
```
src/app/notes/
  notes.types.ts              # Note, CreateNoteDto
  service/notes.service.ts    # useNotes Hook, adoptToUserspace()
  components/NotesPanel.tsx   # Userspace-UI

src/app/aispace/
  components/AiSpacePanel.tsx # KI-Space-UI

packages/server/src/notes/
  data-access/notes.repo.ts   # Server-seitiges CRUD (Automerge)
  mcp/notes.tools.ts          # MCP-Tool-Definitionen
```
