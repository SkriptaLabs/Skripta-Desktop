# Feature: Online-Suche (Search)

## Überblick
Die Online-Suche ermöglicht es, direkt aus Scripta heraus in wissenschaftlichen Datenbanken und
dem Web nach Quellen zu suchen. Ergebnisse können mit einem Klick als Quelle gespeichert werden.

## Unterstützte Engines

| Engine | Typ | Kosten | API Key |
|---|---|---|---|
| OpenAlex | Wissenschaftlich | kostenlos | keiner |
| Semantic Scholar | Wissenschaftlich | kostenlos | optional (`SEMANTIC_SCHOLAR_API_KEY`) |
| arXiv | Preprints (Physik, Mathe, CS) | kostenlos | keiner |
| Brave Search | Allgemeines Web | 2.000 Anfragen/Monat gratis | `BRAVE_SEARCH_API_KEY` |

## Server-Endpunkte

```
GET /search/academic?q=<query>&engine=openalex|semanticscholar|arxiv&limit=10
GET /search/web?q=<query>&limit=10          (benötigt BRAVE_SEARCH_API_KEY)
GET /search/config                           → { academic: [...], web: boolean }
```

## MCP-Tools (für Agents)

| Tool | Beschreibung |
|---|---|
| `search_academic` | Sucht in wissenschaftlichen Datenbanken (OpenAlex, Semantic Scholar, arXiv) |
| `search_web` | Websuche via Brave Search API (benötigt API Key) |

## Datenmodell

```ts
SearchResult {
  title: string
  authors?: string[]
  year?: number
  url?: string
  abstract?: string
  source: "openalex" | "semanticscholar" | "arxiv" | "brave"
  doi?: string
}
```

## UI-Komponenten

- **SearchPanel** — Seitenleiste mit Tab-Wechsel zwischen "Wissenschaftlich" und "Web"
  - Engine-Auswahl (OpenAlex / Semantic Scholar / arXiv) für akademische Suche
  - Ergebnisliste mit Titel, Autoren, Jahr, Abstract
  - "+ Quelle"-Button speichert Ergebnis direkt als Quelle im aktiven Space
  - Hinweis auf fehlende Konfiguration (Brave API Key)

## Dateistruktur

```
packages/server/src/search/
  search.types.ts                   # SearchResult, AcademicSearchOptions, WebSearchOptions
  data-access/search.service.ts     # API-Implementierungen (OpenAlex, Semantic Scholar, arXiv, Brave)
  mcp/search.tools.ts               # MCP-Tool-Definitionen search_academic, search_web

src/search/
  search.types.ts                   # Frontend-Typen (SearchResult, SearchConfig)
  service/search.service.ts         # useSearch() Hook
  components/SearchPanel.tsx        # UI-Komponente
```

## Konfiguration

- `BRAVE_SEARCH_API_KEY`: Umgebungsvariable für Brave Search API (kostenloser Plan: 2.000/Monat)
- `SEMANTIC_SCHOLAR_API_KEY`: Optional, erhöht Rate Limits bei Semantic Scholar
- Keine anderen Abhängigkeiten nötig — OpenAlex und arXiv sind vollständig kostenlos ohne Key
