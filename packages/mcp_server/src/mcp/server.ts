import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { randomUUID } from "crypto";
import type { Router } from "express";
import { registerNotesTools } from "../notes/mcp/notes.tools.js";
import { registerSourcesTools } from "../sources/mcp/sources.tools.js";
import { registerSpacesTools } from "../spaces/mcp/spaces.tools.js";

// Einer MCP-Server, aber je Client-Session ein eigener Transport
export const mcpServer = new McpServer({
  name: "scripta",
  version: "1.0.0",
});

// Tools registrieren
registerSpacesTools(mcpServer);
registerNotesTools(mcpServer);
registerSourcesTools(mcpServer);

// Session-Map für Stateful Streamable HTTP
const transports = new Map<string, StreamableHTTPServerTransport>();

/**
 * Registriert alle /mcp-Routen auf dem Express-Router.
 * Agents verbinden sich über http://localhost:<PORT>/mcp
 */
export function registerMcpRoutes(router: Router) {
  // POST /mcp — neuer Request oder initiale Verbindung
  router.post("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    if (sessionId && transports.has(sessionId)) {
      // Bestehende Session
      await transports.get(sessionId)!.handleRequest(req, res, req.body);
      return;
    }

    // Neue Session aufbauen
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
    });

    transport.onclose = () => {
      if (transport.sessionId) transports.delete(transport.sessionId);
    };

    await mcpServer.connect(transport);
    await transport.handleRequest(req, res, req.body);

    if (transport.sessionId) {
      transports.set(transport.sessionId, transport);
    }
  });

  // GET /mcp — SSE-Stream für Server-seitige Notifications
  router.get("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string;
    const transport = transports.get(sessionId);
    if (!transport) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    await transport.handleRequest(req, res);
  });

  // DELETE /mcp — Session beenden
  router.delete("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string;
    const transport = transports.get(sessionId);
    if (transport) {
      await transport.handleRequest(req, res);
      transports.delete(sessionId);
    } else {
      res.status(404).json({ error: "Session not found" });
    }
  });
}
