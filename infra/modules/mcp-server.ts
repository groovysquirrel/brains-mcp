import { brainsOS_API } from "../stacks/api";
import { brainsOS_systemData, brainsOS_userData } from "../stacks/database";
import { brainsOS_bucket_logs } from "../stacks/storage";
import { brainsOS_queue_metrics, brainsOS_queue_mcp_server_request, brainsOS_queue_mcp_server_response } from "../stacks/queues";
import { brainsOS_wss } from "../stacks/websocket";
import { localConfigs } from "./_configs";
  
const mcp_server_wss_requestHandlerFunction = new sst.aws.Function("mcp_server_wss_requestHandlerFunction", {
    handler: "packages/brainsOS/handlers/mcp-server/websocket/mcp.handler",
    link: [ brainsOS_wss,
            brainsOS_userData,
            brainsOS_systemData,
            brainsOS_bucket_logs,
            brainsOS_queue_metrics,
            brainsOS_queue_mcp_server_request,
            brainsOS_queue_mcp_server_response],
    copyFiles: localConfigs
  });

  brainsOS_wss.route("mcp/request", mcp_server_wss_requestHandlerFunction.arn); 

  const mcp_server_queue_handlerFunction = new sst.aws.Function("mcp_server_queue_handlerFunction", {
    handler: "packages/brainsOS/handlers/mcp-server/sqs/mcpRequestHandler.handler",
    link: [ brainsOS_wss,
      brainsOS_userData,
      brainsOS_systemData,
      brainsOS_bucket_logs,
      brainsOS_queue_metrics,
      brainsOS_queue_mcp_server_request,
      brainsOS_queue_mcp_server_response],
    copyFiles: localConfigs
});

// Queue routes
brainsOS_queue_mcp_server_request.subscribe(mcp_server_queue_handlerFunction.arn);
