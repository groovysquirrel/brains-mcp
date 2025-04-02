import { APIGatewayProxyEventV2 } from "aws-lambda";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import { Resource} from "sst" //this doens't work... SST bug? Can't find user pool or client id in Resource.!

const verifier = CognitoJwtVerifier.create({
  userPoolId: "us-east-1_5coQ94RHb",
  clientId: "4br5de2eookss52pmviuam444v",
  tokenUse: "access",
});

export async function validateUser(event: APIGatewayProxyEventV2): Promise<string> {
  
  try {
    const authHeader = event.headers?.authorization;
    if (!authHeader) {
      console.error('Auth header missing:', { headers: event.headers });
      throw new Error('Missing authorization header');
    }

    if (!authHeader.startsWith('Bearer ')) {
      console.error('Invalid auth format:', { header: authHeader });
      throw new Error('Invalid authorization format');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      console.error('Token missing from auth header');
      throw new Error('Missing token');
    }

    try {
      const payload = await verifier.verify(token);
      console.log('🔐 User authenticated successfully:', {
        email: payload.email || 'No email provided',
        username: payload.username || payload['cognito:username'],
        sub: payload.sub,
        timestamp: new Date().toISOString()
      });
      return payload.sub;
    } catch (error) {
      console.error('❌ Token verification failed:', {
        error,
        tokenPreview: token.substring(0, 10) + '...'
      });
      throw new Error('Invalid token');
    }
  } catch (error) {
    console.error('🚫 Auth validation failed:', {
      error,
      eventId: event.requestContext.requestId,
      path: event.requestContext.http.path
    });
    throw error;
  }
}
