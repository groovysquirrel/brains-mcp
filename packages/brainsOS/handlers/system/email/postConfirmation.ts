import { SES } from "aws-sdk";

const ses = new SES();

export async function handler(event: any) {
  const userEmail = event.request.userAttributes.email;
  const username = event.userName;

  const approverEmail = process.env.APPROVER_EMAIL;

  const emailBody = `
    A new user has signed up and requires approval:

    Username: ${username}
    Email: ${userEmail}

    To approve, reply to this email with the word "approved".
  `;

  const params = {
    Destination: { ToAddresses: [approverEmail] },
    Message: {
      Body: { Text: { Data: emailBody } },
      Subject: { Data: "User Approval Required" },
    },
    Source: approverEmail,
  };

  await ses.sendEmail(params).promise();

  return event;
}
