import { brainsOS_userData, brainsOS_systemData} from "../stacks/database";
import { brainsOS_API} from "../stacks/api";
import { bedrockPermissions } from "../stacks/auth";
import { brainsOS_wss } from "../stacks/websocket";
import { brainsOS_bucket_logs } from "../stacks/storage";
import { brainsOS_queue_metrics } from "../stacks/queues";
import { localConfigs } from "./_configs";

const llm_gateway_wss_chatFunction = new sst.aws.Function("llm_gateway_wss_chatFunction", {
    handler: "packages/brainsOS/handlers/llm-gateway/websocket/gatewayWssChatHandler.handler",
    link: [brainsOS_wss, brainsOS_userData, brainsOS_bucket_logs, brainsOS_queue_metrics],
    permissions: [bedrockPermissions],
    copyFiles: localConfigs
  });
// LLM Gateway routes
brainsOS_wss.route("llm/chat", llm_gateway_wss_chatFunction.arn, {});
brainsOS_wss.route("llm/prompt", llm_gateway_wss_chatFunction.arn, {});
brainsOS_wss.route("llm/conversation", llm_gateway_wss_chatFunction.arn, {});


// LLM Gateway API routes
brainsOS_API.route("POST /llm-gateway/{action}", {
    permissions: [ bedrockPermissions ],
    link: [brainsOS_userData, brainsOS_bucket_logs, brainsOS_queue_metrics],
    handler: "packages/brainsOS/handlers/llm-gateway/api/gatewayApiHandler.handler",
    copyFiles: localConfigs
  });





  