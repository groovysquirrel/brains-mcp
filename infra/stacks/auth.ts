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

export const userPool = new sst.aws.CognitoUserPool("brainsOS_userPool", {
  usernames: ["email"],
});

export const userPoolClient = userPool.addClient("brainsOS_userPoolClient");

export const identityPool = new sst.aws.CognitoIdentityPool("brainsOS_identityPool", {
  userPools: [
    {
      
      userPool: userPool.id,
      client: userPoolClient.id,
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


