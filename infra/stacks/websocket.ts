import { getDomainName } from "../config";
import { authFunction} from "./auth";
import { brainsOS_userData } from "./database";

export const brainsOS_wss = new sst.aws.ApiGatewayWebSocket("brainsOS_wss", {
  domain: {
    name: getDomainName('websocket', 'latest', $app.stage)
  },
});



const connectHandlerFunction = new sst.aws.Function("connectHandlerFunction", {
  handler: "packages/brainsOS/handlers/websocket/util/connect.handler",
});

const disconnectHandlerFunction = new sst.aws.Function("disconnectHandlerFunction", {
  handler: "packages/brainsOS/handlers/websocket/util/disconnect.handler",
});

//Add a Lambda authorizer for the WebSocket API
const authorizer = brainsOS_wss.addAuthorizer("llm-gateway-authorizer", {
    lambda: {
      function: authFunction.arn,
      identitySources: ["route.request.querystring.token"]
    },

});

// Common routes
brainsOS_wss.route("$connect", connectHandlerFunction.arn,  {
  auth: {
      lambda: authorizer.id
  },

});
brainsOS_wss.route("$disconnect", disconnectHandlerFunction.arn, {});


