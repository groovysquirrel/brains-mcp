import { userData, systemData } from "../stacks/database";
import { brainsOS_API} from "../stacks/api";
import { bedrockPermissions } from "../stacks/auth";
import { brainsOS_wss } from "../stacks/websocket";

const gwchatFunction = new sst.aws.Function("gwchatFunction", {
    handler: "packages/brainsOS/handlers/websocket/llm-gateway-v2/chat.handler",
    link: [brainsOS_wss, systemData, userData],
    permissions: [bedrockPermissions],
    environment: {
      WEBSOCKET_API_ENDPOINT: brainsOS_wss.url
    },
    copyFiles: [{ from: "packages/brainsOS/llm-gateway-v2/config/", to: "config" }]
  });


const controllerPromptFunction = new sst.aws.Function("controllerPromptFunction", {
    handler: "packages/brainsOS/handlers/websocket/controller/prompt.handler",
  });
  
const controllerMcpFunction = new sst.aws.Function("controllerMcpFunction", {
    handler: "packages/brainsOS/handlers/websocket/controller/mcp.handler",
  });


// LLM Gateway routes
brainsOS_wss.route("llm/chat", gwchatFunction.arn, {});
brainsOS_wss.route("llm/prompt", gwchatFunction.arn, {});
brainsOS_wss.route("llm/conversation", gwchatFunction.arn, {});

// Controller routes
brainsOS_wss.route("controller/prompt", controllerPromptFunction.arn, {});
brainsOS_wss.route("controller/mcp", controllerMcpFunction.arn, {}); 


brainsOS_API.route("POST /latest/services/llm-gateway/{promptType}", {
    permissions: [ bedrockPermissions ],
    handler: "packages/brainsOS/functions/api/services/llm-gateway/gatewayHandler.handler",
  });
  