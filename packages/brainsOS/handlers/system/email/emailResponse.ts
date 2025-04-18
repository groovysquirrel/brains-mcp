import { S3, CognitoIdentityServiceProvider } from "aws-sdk";

const s3 = new S3();
const cognito = new CognitoIdentityServiceProvider();

export async function handler(event: any) {
  const bucketName = event.Records[0].s3.bucket.name;
  const objectKey = event.Records[0].s3.object.key;

  // Fetch the email content
  const emailObject = await s3.getObject({ Bucket: bucketName, Key: objectKey }).promise();
  const emailContent = emailObject.Body?.toString("utf-8") || "";

  if (emailContent.includes("approved")) {
    const username = extractUsernameFromEmail(emailContent); // Custom logic to parse the email content

    // Confirm the user in Cognito
    await cognito
      .adminConfirmSignUp({
        UserPoolId: process.env.COGNITO_USER_POOL_ID!,
        Username: username,
      })
      .promise();

    console.log(`User ${username} approved successfully.`);
  } else {
    console.log("Approval not received or invalid response.");
  }
}

function extractUsernameFromEmail(emailContent: string): string {
  const match = emailContent.match(/Username: (\w+)/);
  return match ? match[1] : "";
}
