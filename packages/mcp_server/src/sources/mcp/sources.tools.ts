import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  listSources,
  searchSources,
  createSource,
  addQuote,
} from "../data-access/sources.repo.js";

/**
 * Registriert MCP-Tools für das Sources-Feature.
 * Agents können Quellen und Zitate suchen sowie neue Quellen/Zitate hinzufügen.
 * Alle Operationen beziehen sich auf den aktiven Space.
 */
export function registerSourcesTools(server: McpServer) {
  // Quellen suchen
  server.tool(
    "search_sources",
    "Search through saved sources and quotes in the currently active space. Returns sources matching the query in title, authors or quote text. Requires an active space.",
    {
      query: z.string().describe("Search term"),
    },
    async ({ query }) => {
      const sources = await searchSources(query);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(sources, null, 2),
          },
        ],
      };
    }
  );

  // Alle Quellen auflisten
  server.tool(
    "list_sources",
    "List all sources saved in the currently active space. Requires an active space.",
    {},
    async () => {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(await listSources(), null, 2),
          },
        ],
      };
    }
  );

  // Neue Quelle hinzufügen
  server.tool(
    "add_source",
    "Add a new source (book, article, website) to the currently active space's source library. Requires an active space.",
    {
      title: z.string().describe("Title of the source"),
      authors: z.array(z.string()).optional().default([]).describe("List of authors"),
      year: z.number().optional().describe("Publication year"),
      url: z.string().optional().describe("URL if applicable"),
    },
    async ({ title, authors, year, url }) => {
      const source = await createSource({ title, authors, year, url });
      return {
        content: [
          {
            type: "text",
            text: `Source added: ${JSON.stringify(source, null, 2)}`,
          },
        ],
      };
    }
  );

  // Zitat zu einer Quelle hinzufügen
  server.tool(
    "add_quote",
    "Add a quote or excerpt to an existing source in the currently active space. Requires an active space.",
    {
      sourceId: z.string().describe("ID of the source to add the quote to"),
      text: z.string().describe("The quote text"),
      page: z.string().optional().describe("Page number or range"),
      note: z.string().optional().describe("Optional note or comment about the quote"),
    },
    async ({ sourceId, text, page, note }) => {
      const source = await addQuote(sourceId, { text, page, note });
      if (!source) {
        return {
          content: [{ type: "text", text: `Error: Source '${sourceId}' not found` }],
          isError: true,
        };
      }
      return {
        content: [
          {
            type: "text",
            text: `Quote added to source: ${JSON.stringify(source, null, 2)}`,
          },
        ],
      };
    }
  );
}
