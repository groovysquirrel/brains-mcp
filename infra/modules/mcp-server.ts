import { brainsOS_API } from "../stacks/api";
import { brainsOS_systemData, brainsOS_userData } from "../stacks/database";
import { brainsOS_bucket_logs } from "../stacks/storage";
import { brainsOS_queue_metrics, brainsOS_mcpServerRequestQueue } from "../stacks/queues";
import { brainsOS_wss } from "../stacks/websocket";
import { localConfigs } from "./_configs";
// MCP Endpoints
brainsOS_API.route("POST /latest/mcp/{type}/{name}", {
    handler: "packages/brainsOS/handlers/api/mcp-server/mcp.handler",
    link: [brainsOS_systemData],
  });
  
  brainsOS_API.route("POST /latest/mcp/index", {
    handler: "packages/brainsOS/handlers/api/mcp-server/mcp.handler",
    link: [brainsOS_systemData],
  });
  
  brainsOS_API.route("POST /latest/mcp/index/{type}", {
    handler: "packages/brainsOS/handlers/api/mcp-server/mcp.handler",
    link: [brainsOS_systemData],
  });

  
const mcpServerWebSocketFunction = new sst.aws.Function("mcpServerWebSocketFunction", {
    handler: "packages/brainsOS/handlers/websocket/mcp-server/mcp.handler",
    link: [brainsOS_wss, brainsOS_userData, brainsOS_bucket_logs, brainsOS_queue_metrics, brainsOS_mcpServerRequestQueue],
    copyFiles: localConfigs
  });

const mcpServerRequestQueueFunction = new sst.aws.Function("mcpServerRequestQueueFunction", {
    handler: "packages/brainsOS/handlers/sqs/mcp-server/mcpRequestHandler.handler",
    link: [brainsOS_wss, brainsOS_userData, brainsOS_bucket_logs, brainsOS_queue_metrics, brainsOS_mcpServerRequestQueue],
    copyFiles: localConfigs
});


// Websocket routes
brainsOS_wss.route("mcp/request", mcpServerWebSocketFunction.arn); 

// Queue routes
brainsOS_mcpServerRequestQueue.subscribe(mcpServerRequestQueueFunction.arn);
