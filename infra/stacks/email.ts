import { userPool } from "./auth"
import { getEmail } from "../config";

export const UserApprovalEmail = new sst.aws.Email("UserApprovalEmail", {
    sender: getEmail($app.stage),
  }); 


 // Lambda for PostConfirmation Trigger
 const postConfirmationFunction = new sst.aws.Function("PostConfirmationFunction", {
    handler: "packages/brainsOS/functions/email/postConfirmation.handler",
    environment: {
      APPROVER_EMAIL: "your-approver-email@example.com",
    },
    link: [UserApprovalEmail]

  });

  
  const emailBucket = new sst.aws.Bucket("EmailBucket");
  emailBucket.subscribe({
    handler: "packages/brainsOS/functions/email/emailResponse.handler",
    timeout: "60 seconds",
    environment: {
      COGNITO_USER_POOL_ID: userPool.id,
    },
    permissions: [{
        actions: ["cognito-idp:AdminConfirmSignUp", "s3:GetObject"],
        resources: ["*"],
      },
    ],
  },
    {
      events: ["s3:ObjectCreated:*"],
    }
  );