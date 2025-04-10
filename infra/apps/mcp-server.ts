import { brainsOS_API } from "../stacks/api";
import { brainsOS_systemData } from "../stacks/database";
import { brainsOS_wss } from "../stacks/websocket";

// MCP Endpoints
brainsOS_API.route("POST /latest/mcp/{type}/{name}", {
    handler: "packages/brainsOS/mcp/mcpHandler.handler",
    link: [brainsOS_systemData],
  });
  
  brainsOS_API.route("POST /latest/mcp/index", {
    handler: "packages/brainsOS/mcp/mcpHandler.handler",
    link: [brainsOS_systemData],
  });
  
  brainsOS_API.route("POST /latest/mcp/index/{type}", {
    handler: "packages/brainsOS/mcp/mcpHandler.handler",
    link: [brainsOS_systemData],
  });

  const controllerPromptFunction = new sst.aws.Function("controllerPromptFunction", {
    handler: "packages/brainsOS/handlers/websocket/controller/prompt.handler",
  });
  
const controllerMcpFunction = new sst.aws.Function("controllerMcpFunction", {
    handler: "packages/brainsOS/handlers/websocket/controller/mcp.handler",
  });

  // Controller routes
brainsOS_wss.route("controller/prompt", controllerPromptFunction.arn, {});
brainsOS_wss.route("controller/mcp", controllerMcpFunction.arn, {}); 
