
export const BrainsOSBucket = new sst.aws.Bucket("BrainsOSBucket");
  
export const emailBucket = new sst.aws.Bucket("EmailBucket");
emailBucket.notify({
  notifications: [
    {
      name: "EmailBucketNotifications",
      function: "packages/brainsOS/functions/email/emailResponse.handler",
      events: ["s3:ObjectCreated:*", "s3:ObjectRemoved:*"]
    }
  ]
});