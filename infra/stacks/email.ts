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
