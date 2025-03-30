import { getDomainName } from "../config";
import { userData, systemData, loadDefaultData } from "./database";
import { userPool, userPoolClient } from "./auth";

export const brainsOS_websocket_API = new sst.aws.ApiGatewayWebSocket("brains_websocket_api_latest", {
  transform: {
    route: {
      handler: {
        link: [userData, systemData, loadDefaultData],
      },
    }
  },
  domain: {
    name: getDomainName('websocket', 'latest', $app.stage)
  },
});

// Add Cognito authorizer for WebSocket API
brainsOS_websocket_API.addAuthorizer("cognito-authorizer", {
  jwt: {
    audiences: [userPoolClient.id],
    issuer: $interpolate`https://cognito-idp.${aws.getRegionOutput().name}.amazonaws.com/${userPool.id}`,
  }
});

// Add WebSocket routes
brainsOS_websocket_API.route("$connect", "packages/brainsOS/functions/api/services/llm-gateway/connect.handler");
brainsOS_websocket_API.route("$disconnect", "packages/brainsOS/functions/api/services/llm-gateway/disconnect.handler");
brainsOS_websocket_API.route("$default", "packages/brainsOS/functions/api/services/llm-gateway/default.handler");
brainsOS_websocket_API.route("chat", "packages/brainsOS/functions/api/services/llm-gateway/chat.handler"); 