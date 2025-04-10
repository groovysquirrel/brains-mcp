
export const brainsOS_bucket_logs = new sst.aws.Bucket("brainsOS_bucket_logs");
  
export const brainsOS_bucket_email = new sst.aws.Bucket("brainsOS_bucket_email");
brainsOS_bucket_email.notify({
  notifications: [
    {
      name: "EmailBucketNotifications",
      function: "packages/brainsOS/functions/email/emailResponse.handler",
      events: ["s3:ObjectCreated:*", "s3:ObjectRemoved:*"]
    }
  ]
});