import { getDomainName } from "../config";
import { authFunction} from "./auth";

export const brainsOS_wss = new sst.aws.ApiGatewayWebSocket("brainsOS_wss", {
  domain: {
    name: getDomainName('websocket', 'latest', $app.stage)
  },
});

const wss_defaultHandlerFunction = new sst.aws.Function("wss_defaultHandlerFunction", {
  handler: "packages/brainsOS/handlers/system/websocket/default.handler",
});

const wss_connectHandlerFunction = new sst.aws.Function("wss_connectHandlerFunction", {
  handler: "packages/brainsOS/handlers/system/websocket/connect.handler",
});

const wss_disconnectHandlerFunction = new sst.aws.Function("wss_disconnectHandlerFunction", {
  handler: "packages/brainsOS/handlers/system/websocket/disconnect.handler",
});

//Add a Lambda authorizer for the WebSocket API
const wss_authorizer = brainsOS_wss.addAuthorizer("wss_authorizer", {
    lambda: {
      function: authFunction.arn,
      identitySources: ["route.request.querystring.token"]
    },

});

// Common routes
brainsOS_wss.route("$connect", wss_connectHandlerFunction.arn,  {
  auth: {lambda: wss_authorizer.id },
});

brainsOS_wss.route("$disconnect", wss_disconnectHandlerFunction.arn, {});

brainsOS_wss.route("$default", wss_defaultHandlerFunction.arn);


