import { getDomainName } from "../config";
import { userPool, userPoolClient} from "./auth";

export const brainsOS_wss = new sst.aws.ApiGatewayWebSocket("brainsos_wss", {
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


//Add a Lambda authorizer for the WebSocket API
const authorizer = brainsOS_wss.addAuthorizer("llm-gateway-authorizer", {
    lambda: {
      function: authFunction.arn,
    },
    
});

// Common routes
brainsOS_wss.route("$connect", connectHandlerFunction.arn,  {
  auth: {
      lambda: authorizer.id
  }
});
brainsOS_wss.route("$disconnect", disconnectHandlerFunction.arn, {});
brainsOS_wss.route("$default", defaultHandlerFunction.arn, {});
