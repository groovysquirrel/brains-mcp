import { userData, systemData, loadDefaultData } from "./database";
import { getDomainName, getCorsOrigins } from "../config";
//import { bedrockPermissions } from "./auth";  

export const bedrockPermissions = {
  actions: [
    'bedrock:ListFoundationModels',
    'bedrock:InvokeModel',
    'bedrock:GetFoundationModel'
  ],
  resources: ['*']
};

export const brainsOS_API = new sst.aws.ApiGatewayV2("brainsos_api", {
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
  transform: {
    route: {
      handler: {
        link: [userData, systemData, loadDefaultData],
      },
      args: {
        auth: { iam: true }
      },
    }
  },
  domain: {
    name: getDomainName('api', 'latest', $app.stage)
  },
});

// brainsOS system data API

brainsOS_API.route("POST /latest/commands", {
  link: [systemData], //add these links here... not in API area. Might be a bug.
  handler: "packages/brainsOS/functions/api/command/commandHandler.handler",
  permissions: [ bedrockPermissions ]
});

brainsOS_API.route("POST /latest/services/transform/{objectType}/{fromView}/{toView}", {
  handler: "packages/brainsOS/functions/api/services/transform/transformHandler.handler",
  link: [systemData],
});


brainsOS_API.route("POST /latest/services/prompt/{promptType}", {
  permissions: [ bedrockPermissions ],
  link: [userData],
  timeout: "3 minutes", 
  handler: "packages/brainsOS/functions/api/services/prompt/promptHandler.handler",
  nodejs: {
    loader: {
     ".md": "text"
      }
    }
});

brainsOS_API.route("GET /latest/services/prompt/{promptType}", {
  permissions: [ bedrockPermissions ],
  handler: "packages/brainsOS/functions/api/services/prompt/promptHandler.handler",
});


