import { brainsOS_API } from "../stacks/api";
import { systemData } from "../stacks/database";

// MCP Endpoints
brainsOS_API.route("POST /latest/mcp/{type}/{name}", {
    handler: "packages/brainsOS/mcp/mcpHandler.handler",
    link: [systemData],
  });
  
  brainsOS_API.route("POST /latest/mcp/index", {
    handler: "packages/brainsOS/mcp/mcpHandler.handler",
    link: [systemData],
  });
  
  brainsOS_API.route("POST /latest/mcp/index/{type}", {
    handler: "packages/brainsOS/mcp/mcpHandler.handler",
    link: [systemData],
  });