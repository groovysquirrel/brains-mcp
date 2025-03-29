import { userData, systemData, loadDefaultData } from "./database";
import { getDomainName, getCorsOrigins } from "../config";
import { Bedrock } from "aws-sdk";

const bedrockPermissions = {
  actions: [
    'bedrock:ListFoundationModels',
    'bedrock:InvokeModel',
    'bedrock:GetFoundationModel'
  ],
  resources: ['*']
};


export const brainsOS_API = new sst.aws.ApiGatewayV2("brains_api_latest", {
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

// For user data
brainsOS_API.route("GET /latest/resources/{dataStore}/{object}", {
  link: [userData, loadDefaultData],
  handler: "packages/brainsOS/functions/api/resources/resourcesHandler.handler",
});

brainsOS_API.route("GET /latest/resources/{dataStore}/{object}/{name}", {
  link: [userData, loadDefaultData],
  handler: "packages/brainsOS/functions/api/resources/resourcesHandler.handler",
});

brainsOS_API.route("GET /latest/resources/{dataStore}/{object}/{name}/{version}", {
  link: [userData, loadDefaultData],
  handler: "packages/brainsOS/functions/api/resources/resourcesHandler.handler",
});

brainsOS_API.route("POST /latest/resources/{dataStore}/{object}", {
  link: [userData],
  handler: "packages/brainsOS/functions/api/resources/resourcesHandler.handler",
});

