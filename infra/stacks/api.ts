import { getDomainName, getCorsOrigins } from "../config";

export const brainsOS_API = new sst.aws.ApiGatewayV2("brainsOS_API", {
  cors: {
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "X-Amz-Date",
      "X-Api-Key",
      "X-Amz-Security-Token",
      "X-Amz-User-Agent"
    ],
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowOrigins: getCorsOrigins($app.stage),
    allowCredentials: true,
    maxAge: `300 seconds`
  },
  domain: {
    name: getDomainName('api', 'latest', $app.stage)
  },
});


brainsOS_API.addAuthorizer({
  name: "api-gateway-authorizer",
  lambda: {
    function: "packages/brainsOS/handlers/auth/authorizer.handler"
  }
});



