import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listSpaces } from "../data-access/spaces.repo.js";
import { getActiveSpaceId } from "../../index.js";
import { getSpacesHandle } from "../../data/repo.js";

export function registerSpacesTools(server: McpServer) {
  server.tool(
    "list_spaces",
    "List all research spaces in Scripta. Each space contains its own notes and sources for a specific research project.",
    {},
    async () => {
      const spaces = listSpaces().map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        createdAt: s.createdAt,
      }));
      return {
        content: [{ type: "text", text: JSON.stringify(spaces, null, 2) }],
      };
    }
  );

  server.tool(
    "get_active_space",
    "Get the currently active research space. Returns name and description so you understand the research context. All note and source operations apply to this space.",
    {},
    async () => {
      const spaceId = getActiveSpaceId();
      if (!spaceId) {
        return {
          content: [{ type: "text", text: "No active space. The user has not selected a space yet." }],
          isError: true,
        };
      }
      const space = getSpacesHandle().docSync().spaces[spaceId];
      if (!space) {
        return {
          content: [{ type: "text", text: "Active space no longer exists." }],
          isError: true,
        };
      }
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { id: space.id, name: space.name, description: space.description },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}
