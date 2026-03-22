import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { searchAcademic, searchWeb } from "../data-access/search.service.js";

/**
 * Registriert MCP-Tools für die Online-Suche.
 * Agents können damit wissenschaftliche Datenbanken und das Web durchsuchen.
 */
export function registerSearchTools(server: McpServer) {
  // Wissenschaftliche Suche (OpenAlex, Semantic Scholar, arXiv)
  server.tool(
    "search_academic",
    "Search academic databases for scientific papers and publications. Returns titles, authors, year, URL, and abstract. No API key required for OpenAlex (default), Semantic Scholar, and arXiv.",
    {
      query: z.string().describe("Search query, e.g. topic, author name, or keyword"),
      engine: z
        .enum(["openalex", "semanticscholar", "arxiv"])
        .optional()
        .default("openalex")
        .describe(
          "Which academic database to search. openalex (default) covers most disciplines; semanticscholar focuses on STEM; arxiv covers physics, math, CS preprints."
        ),
      limit: z
        .number()
        .int()
        .min(1)
        .max(25)
        .optional()
        .default(10)
        .describe("Maximum number of results (1-25)"),
    },
    async ({ query, engine, limit }) => {
      try {
        const results = await searchAcademic(query, { engine, limit });
        return {
          content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Suche fehlgeschlagen: ${String(err)}` }],
          isError: true,
        };
      }
    }
  );

  // Web-Suche (Brave Search API)
  server.tool(
    "search_web",
    "Search the web using the Brave Search API. Requires the BRAVE_SEARCH_API_KEY environment variable to be set. Free tier: 2,000 queries/month.",
    {
      query: z.string().describe("Search query"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(20)
        .optional()
        .default(10)
        .describe("Maximum number of results (1-20)"),
    },
    async ({ query, limit }) => {
      try {
        const results = await searchWeb(query, { limit });
        return {
          content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
        };
      } catch (err) {
        const msg = String(err);
        const isConfig = msg.includes("BRAVE_SEARCH_API_KEY");
        return {
          content: [
            {
              type: "text",
              text: isConfig
                ? "Web-Suche nicht konfiguriert. Bitte BRAVE_SEARCH_API_KEY als Umgebungsvariable setzen."
                : `Suche fehlgeschlagen: ${msg}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
