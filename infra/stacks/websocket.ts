import { getDomainName } from "../config";
import { userData, systemData, loadDefaultData } from "./database";
import { userPool, userPoolClient} from "./auth";

export const bedrockPermissions = {
  actions: [
    'bedrock:ListFoundationModels',
    'bedrock:InvokeModel',
    'bedrock:GetFoundationModel',
    'bedrock:InvokeModelWithResponseStream'
  ],
  resources: ['*']
};

export const brainsOS_websocket_API = new sst.aws.ApiGatewayWebSocket("brains_websocket_api_latest", {
  domain: {
    name: getDomainName('websocket', 'latest', $app.stage)
  }
});

const authFunction = new sst.aws.Function("authFunction", {
    handler: "packages/brainsOS/handlers/auth/authorizer.handler",
    link: [userPool, userPoolClient],
  });


const defaultHandlerFunction = new sst.aws.Function("defaultHandlerFunction", {
  handler: "packages/brainsOS/handlers/websocket/default.handler",
});

const connectHandlerFunction = new sst.aws.Function("connectHandlerFunction", {
  handler: "packages/brainsOS/handlers/websocket/util/connect.handler",
});

const disconnectHandlerFunction = new sst.aws.Function("disconnectHandlerFunction", {
  handler: "packages/brainsOS/handlers/websocket/util/disconnect.handler",
});

const gwchatFunction = new sst.aws.Function("gwchatFunction", {
    handler: "packages/brainsOS/handlers/websocket/llm-gateway/chat.handler",
    link: [brainsOS_websocket_API, systemData],
    permissions: [bedrockPermissions],
    environment: {
      WEBSOCKET_API_ENDPOINT: brainsOS_websocket_API.url
    }
  });

const gwstreamFunction = new sst.aws.Function("gwstreamFunction", {
    handler: "packages/brainsOS/handlers/websocket/llm-gateway/stream.handler",
    link: [brainsOS_websocket_API],
    permissions: [bedrockPermissions],
    environment: {
      WEBSOCKET_API_ENDPOINT: brainsOS_websocket_API.url
    }
  });


const controllerPromptFunction = new sst.aws.Function("controllerPromptFunction", {
    handler: "packages/brainsOS/handlers/websocket/controller/prompt.handler",
  });
  
const controllerMcpFunction = new sst.aws.Function("controllerMcpFunction", {
    handler: "packages/brainsOS/handlers/websocket/controller/mcp.handler",
  });




//Add a Lambda authorizer for the WebSocket API
const authorizer = brainsOS_websocket_API.addAuthorizer("llm-gateway-authorizer", {
    lambda: {
      function: authFunction.arn,
    },
    
});





// Common routes
brainsOS_websocket_API.route("$connect", connectHandlerFunction.arn,  {
  auth: {
      lambda: authorizer.id
  }
});
brainsOS_websocket_API.route("$disconnect", disconnectHandlerFunction.arn, {});
brainsOS_websocket_API.route("$default", defaultHandlerFunction.arn, {});

// LLM Gateway routes
brainsOS_websocket_API.route("llm/chat", gwchatFunction.arn, {});
brainsOS_websocket_API.route("llm/stream", gwstreamFunction.arn, {});

// Controller routes
brainsOS_websocket_API.route("controller/prompt", controllerPromptFunction.arn, {});
brainsOS_websocket_API.route("controller/mcp", controllerMcpFunction.arn, {}); 