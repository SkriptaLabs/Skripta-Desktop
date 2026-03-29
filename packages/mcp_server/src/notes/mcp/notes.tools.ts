import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  listNotes,
  createNote,
  searchNotes,
} from "../data-access/notes.repo.js";

/**
 * Registriert MCP-Tools für das Notes-Feature auf dem MCP-Server.
 * Agents bekommen SCHREIBRECHTE nur für den KI-Space (aispace).
 * Der Userspace ist für Agents read-only.
 * Alle Operationen beziehen sich auf den aktiven Space.
 */
export function registerNotesTools(server: McpServer) {
  // Notizen suchen (beide Spaces lesbar)
  server.tool(
    "search_notes",
    "Search through notes in the currently active space. Returns matching notes from userspace (read-only) and aispace. Requires an active space.",
    {
      query: z.string().describe("Search term to look for in titles, content and tags"),
      space: z
        .enum(["userspace", "aispace", "all"])
        .optional()
        .default("all")
        .describe("Which space to search in. Default: all"),
    },
    async ({ query, space }) => {
      const targetSpace =
        space === "all" ? undefined : (space as "userspace" | "aispace");
      const notes = await searchNotes(query, targetSpace);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(notes, null, 2),
          },
        ],
      };
    }
  );

  // Alle Notizen auflisten
  server.tool(
    "list_notes",
    "List all notes in the currently active space. Optionally filter by space. Requires an active space.",
    {
      space: z
        .enum(["userspace", "aispace", "all"])
        .optional()
        .default("all")
        .describe("Which space to list. Default: all"),
    },
    async ({ space }) => {
      const targetSpace =
        space === "all" ? undefined : (space as "userspace" | "aispace");
      const notes = await listNotes(targetSpace);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(notes, null, 2),
          },
        ],
      };
    }
  );

  // Neue Notiz in den KI-Space schreiben (agents dürfen NUR in aispace schreiben)
  server.tool(
    "write_to_aispace",
    "Write a new note or draft to the AI space of the currently active space. The user can then review and adopt it into their personal userspace. Agents MUST use this tool instead of writing directly to userspace. Requires an active space.",
    {
      title: z.string().describe("Title of the note or draft"),
      content: z.string().describe("Markdown content of the note"),
      tags: z
        .array(z.string())
        .optional()
        .default([])
        .describe("Optional tags to categorize the note"),
    },
    async ({ title, content, tags }) => {
      const note = await createNote({ title, content, space: "aispace", tags });
      return {
        content: [
          {
            type: "text",
            text: `Note created in AI space: ${JSON.stringify(note, null, 2)}`,
          },
        ],
      };
    }
  );
}
