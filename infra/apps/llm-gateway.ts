import { brainsOS_userData, brainsOS_systemData} from "../stacks/database";
import { brainsOS_API} from "../stacks/api";
import { bedrockPermissions } from "../stacks/auth";
import { brainsOS_wss } from "../stacks/websocket";
import { brainsOS_bucket_logs } from "../stacks/storage";
import { brainsOS_queue_metrics } from "../stacks/queues";

const gwchatFunction = new sst.aws.Function("gwchatFunction", {
    handler: "packages/brainsOS/handlers/websocket/llm-gateway/chat.handler",
    link: [brainsOS_wss, brainsOS_userData, brainsOS_bucket_logs, brainsOS_queue_metrics],
    permissions: [bedrockPermissions],
    copyFiles: [{ from: "packages/brainsOS/modules/llm-gateway/config/", to: "config" }],
  });
// LLM Gateway routes
brainsOS_wss.route("llm/chat", gwchatFunction.arn, {});
brainsOS_wss.route("llm/prompt", gwchatFunction.arn, {});
brainsOS_wss.route("llm/conversation", gwchatFunction.arn, {});


// LLM Gateway API routes
brainsOS_API.route("POST /llm-gateway/{action}", {
    permissions: [ bedrockPermissions ],
    link: [brainsOS_userData, brainsOS_bucket_logs, brainsOS_queue_metrics],
    handler: "packages/brainsOS/handlers/api/llm-gateway/gatewayHandler.handler",
    copyFiles: [{ from: "packages/brainsOS/modules/llm-gateway/config/", to: "config" }],
  });





  