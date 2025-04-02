import { APIGatewayProxyWebsocketEventV2WithRequestContext } from 'aws-lambda';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { Resource } from "sst";
/**
 * Types for the WebSocket API Gateway event
 * These types help TypeScript understand the shape of the data we receive
 */

// The request context contains information about the WebSocket connection
interface CustomRequestContext {
  connectionId: string;      // Unique ID for this WebSocket connection
  routeKey: string;         // The route being accessed (e.g., "$connect", "chat")
  messageId: string;        // Unique ID for each message
  eventType: string;        // Type of event (e.g., "CONNECT", "MESSAGE")
  extendedRequestId: string;
  requestTime: string;
  messageDirection: string; // "IN" for incoming messages, "OUT" for outgoing
  stage: string;           // API Gateway stage (e.g., "dev", "prod")
  connectedAt: number;     // Timestamp when connection was established
  requestTimeEpoch: number;
  identity: {
    sourceIp: string;      // IP address of the client
  };
  requestId: string;
  domainName: string;
  apiId: string;
}

// The full event object includes both the request context and query parameters
interface CustomWebsocketEvent extends APIGatewayProxyWebsocketEventV2WithRequestContext<CustomRequestContext> {
  queryStringParameters?: {
    [key: string]: string;  // Query parameters from the URL (e.g., ?token=xyz)
  };
  methodArn: string;       // The ARN of the API Gateway method being called
}

/**
 * Cognito Configuration
 * This client is used to verify ID tokens
 */
const jwtVerifier = CognitoJwtVerifier.create({
  userPoolId: Resource.brainsOS_userPool.id,
  tokenUse: 'id',          // We're using ID tokens for authentication
  clientId: Resource.brainsOS_userPoolClient.id
});

/**
 * IAM Policy Generation
 * These functions create the IAM policies that API Gateway uses to authorize requests
 */

interface PolicyDocument {
  Version: string;
  Statement: Array<{
    Action: string | string[];
    Effect: string;
    Resource: string;
  }>;
}

interface AuthResponse {
  principalId: string;
  policyDocument?: PolicyDocument;
  context: {
    userId: string;
    email: string;
  };
}

/**
 * Generates an IAM policy document for API Gateway
 * @param principalId - The ID of the user making the request
 * @param effect - Whether to allow or deny the request
 * @param resource - The API Gateway resource being accessed
 * @param email - The user's email address
 * @returns An IAM policy document
 */
const generatePolicy = (principalId: string, effect: string, resource: string, email: string): AuthResponse => {
  const authResponse: AuthResponse = {
    principalId,
    context: { 
      userId: principalId,
      email
    }
  };
  
  if (effect && resource) {
    authResponse.policyDocument = {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: resource
        },
        {
          Action: [
            'bedrock:ListFoundationModels',
            'bedrock:InvokeModel',
            'bedrock:GetFoundationModel'
          ],
          Effect: effect,
          Resource: '*'
        },
        {
          Action: [
            'execute-api:*'
          ],
          Effect: effect,
          Resource: resource.replace(/\/@connections\/.*$/, '/*/*/*')
        }
      ]
    };
  }

  return authResponse;
};

// Helper functions to generate allow/deny policies
const generateAllow = (principalId: string, resource: string, email: string) => 
  generatePolicy(principalId, 'Allow', resource, email);

const generateDeny = (principalId: string, resource: string, email: string) => 
  generatePolicy(principalId, 'Deny', resource, email);

/**
 * Main handler function for the Lambda authorizer
 * This function:
 * 1. Extracts the token from the request
 * 2. Verifies the ID token with Cognito
 * 3. Extracts user information from the token
 * 4. Generates an IAM policy allowing/denying access
 */
export const handler = async (
  event: CustomWebsocketEvent,
  context: any
): Promise<AuthResponse> => {
  console.log('[Authorizer] Handler called with event:', JSON.stringify(event, null, 2));

  // Step 1: Check for token in query parameters
  const token = event.queryStringParameters?.token;
  if (!token) {
    console.log('[Authorizer] No token provided');
    throw new Error('Unauthorized');
  }

  try {
    // Step 2: Verify the ID token
    const payload = await jwtVerifier.verify(token);
    console.log('[Authorizer] Token verified, payload:', JSON.stringify(payload, null, 2));

    // Step 3: Extract user information from the token
    const username = payload['cognito:username'];
    const email = payload.email as string;
    
    if (!username || !email) {
      console.log('[Authorizer] Missing required user information in token');
      throw new Error('Unauthorized');
    }

    console.log('[Authorizer] User authenticated:', { username, email });

    // Step 4: Generate and return the allow policy
    const response = generateAllow(username, event.methodArn, email);
    console.log('[Authorizer] Returning response:', JSON.stringify(response, null, 2));
    return response;
  } catch (error) {
    console.error('[Authorizer] Error verifying token:', error);
    throw new Error('Unauthorized');
  }
};

/// TO DO: Validate the token with Cognito and return the user id