type LogLevel = 'info' | 'warn' | 'error';

export function logRequest(
  requestId: string,
  type: string,
  userId: string,
  level: LogLevel = 'info'
) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    requestId,
    type,
    userId,
    level
  };

  // Log to CloudWatch
  console.log(JSON.stringify(logEntry));

  // Could be extended to:
  // - Write to DynamoDB audit table
  // - Send to external logging service
  // - Emit metrics
}
