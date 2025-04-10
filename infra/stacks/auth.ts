import { brainsOS_API } from "./api";

export const bedrockPermissions = {
  actions: [
    'bedrock:ListFoundationModels',
    'bedrock:InvokeModel',
    'bedrock:GetFoundationModel',
    'bedrock:InvokeModelWithResponseStream'
  ],
  resources: ['*']
};

const region = aws.getRegionOutput().name;



export const brainsOS_userPool = new sst.aws.CognitoUserPool("brainsOS_userPool", {
  usernames: ["email"],
});

export const brainsOS_userPoolClient = brainsOS_userPool.addClient("brainsOS_userPoolClient", {
  transform: {
    client: (args) => {
      args.explicitAuthFlows = [
        "ALLOW_USER_PASSWORD_AUTH",
        "ALLOW_REFRESH_TOKEN_AUTH",
        "ALLOW_USER_SRP_AUTH"
      ];
      
      // Set explicit token validity periods (in minutes)
      args.accessTokenValidity = 1; // 1 hour
      args.idTokenValidity = 1;     // 1 hour
      args.refreshTokenValidity = 1440; // 1 day
      
      // Or if you need to remove token validity settings completely
      // delete args.accessTokenValidity;
      // delete args.idTokenValidity;
      // delete args.refreshTokenValidity;
    }
  }
});

export const brainsOS_identityPool = new sst.aws.CognitoIdentityPool("brainsOS_identityPool", {
  userPools: [
    {
      
      userPool: brainsOS_userPool.id,
      client: brainsOS_userPoolClient.id,
    },
  ],
  permissions: {
    authenticated: [

      {
        actions: [
          "execute-api:*",
        ],
        resources: [
          $concat(
            "arn:aws:execute-api:",
            region,
            ":",
            aws.getCallerIdentityOutput({}).accountId,
            ":",
            brainsOS_API.nodes.api.id,
            "/*/*/*"
          ),
        ],


      },

    ],
  },
});


export const authFunction = new sst.aws.Function("authFunction", {
  handler: "packages/brainsOS/handlers/auth/authorizer.handler",
  link: [brainsOS_userPool, brainsOS_userPoolClient],
});

