import { bedrockPermissions } from "../stacks/auth";
import { brainsOS_userData } from "../stacks/database";
import { brainsOS_bucket_logs } from "../stacks/storage";
import { brainsOS_wss } from "../stacks/websocket";
import { brainsOS_queue_metrics , brainsOS_mcp_server_requestQueue, brainsOS_mcp_server_responseQueue} from "../stacks/queues";
import { localConfigs } from "./_configs";
import { brainsOS_API } from "../stacks/api";


const brain_wss_terminalHandler = new sst.aws.Function("brain_wss_terminalHandler", {
    handler: "packages/brainsOS/handlers/brain-controller/websocket/brainTerminalHandler.handler",
    link: [brainsOS_wss, brainsOS_userData, brainsOS_bucket_logs, brainsOS_queue_metrics, brainsOS_mcp_server_requestQueue],
    permissions: [bedrockPermissions],
    copyFiles: localConfigs
  });

  brainsOS_wss.route("brain/terminal", brain_wss_terminalHandler.arn);


  const brain_sqs_mcp_responseHandler  = new sst.aws.Function("brain_sqs_mcp_responseHandler", {
    handler: "packages/brainsOS/handlers/brain-controller/sqs/brainMcpResponseQueueHandler.handler",
  });  

  brainsOS_mcp_server_responseQueue.subscribe(brain_sqs_mcp_responseHandler.arn);
  


  //mostly for testing...
  brainsOS_API.route("POST /brain/{name}/{action}/{noun}", {
    handler: "packages/brainsOS/handlers/brain-controller/api/brainApiHandler.handler",
    link: [brainsOS_wss, brainsOS_userData, brainsOS_bucket_logs, brainsOS_queue_metrics, brainsOS_mcp_server_requestQueue],
    permissions: [bedrockPermissions],
    copyFiles: localConfigs
  });