/**
 * Authentication Utilities
 * 
 * This file contains shared functions for extracting and validating
 * user authentication information from various sources like tokens,
 * request headers, and authorizer contexts.
 */

import { APIGatewayProxyEvent } from 'aws-lambda';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { Resource } from 'sst';

// Interface for a standardized logger
interface Logger {
  info: (message: string, meta?: any) => void;
  error: (message: string, meta?: any) => void;
  warn: (message: string, meta?: any) => void;
  debug?: (message: string, meta?: any) => void;
}

// Default console logger
const defaultLogger: Logger = {
  info: (message: string, meta?: any) => console.log(`[INFO] ${message}`, meta || ''),
  error: (message: string, meta?: any) => console.error(`[ERROR] ${message}`, meta || ''),
  warn: (message: string, meta?: any) => console.warn(`[WARN] ${message}`, meta || '')
};

// Interface for user identity information
export interface UserIdentity {
  userId: string;
  email?: string;
  username?: string;
}

/**
 * Creates a Cognito JWT verifier for token validation
 */
export const createJwtVerifier = () => {
  return CognitoJwtVerifier.create({
    userPoolId: Resource.brainsOS_userPool.id,
    tokenUse: 'id',
    clientId: Resource.brainsOS_userPoolClient.id
  });
};

/**
 * Extracts user information from a JWT token without verification
 * For simple extraction when validation isn't needed
 * 
 * @param token The JWT token
 * @returns User identity information if found, undefined otherwise
 */
export const extractUserInfoFromToken = (token: string): UserIdentity | undefined => {
  try {
    // Extract the payload part (second part) of the JWT
    const tokenParts = token.split('.');
    
    if (tokenParts.length !== 3) {
      return undefined; // Not a valid JWT
    }
    
    // Decode the payload (second part)
    const payloadBase64 = tokenParts[1];
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());
    
    // No sub claim means no valid userId
    if (!payload.sub) {
      return undefined;
    }
    
    // For Cognito, extract relevant user information
    return {
      userId: payload.sub,
      email: payload.email,
      username: payload['cognito:username'] || payload.username
    };
  } catch (error) {
    return undefined;
  }
};

/**
 * Extracts just the user ID from a JWT token without verification
 * 
 * @param token The JWT token
 * @returns The user ID if found, undefined otherwise
 */
export const extractUserIdFromToken = (token: string): string | undefined => {
  const userInfo = extractUserInfoFromToken(token);
  return userInfo?.userId;
};

/**
 * Extracts user information from a Bearer token in the Authorization header
 * 
 * @param authHeader The Authorization header value
 * @returns User identity information if found, undefined otherwise
 */
export const extractUserInfoFromAuthHeader = (authHeader: string): UserIdentity | undefined => {
  try {
    if (!authHeader.startsWith('Bearer ')) {
      return undefined;
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    return extractUserInfoFromToken(token);
  } catch (error) {
    return undefined;
  }
};

/**
 * Extracts just the user ID from a Bearer token in the Authorization header
 * 
 * @param authHeader The Authorization header value
 * @returns The user ID if found, undefined otherwise
 */
export const extractUserIdFromAuthHeader = (authHeader: string): string | undefined => {
  const userInfo = extractUserInfoFromAuthHeader(authHeader);
  return userInfo?.userId;
};

/**
 * Verify a JWT token and extract user information
 * 
 * @param token The JWT token to verify
 * @param logger Optional logger
 * @returns The verified payload or null if invalid
 */
export const verifyToken = async (token: string, logger: Logger = defaultLogger): Promise<any | null> => {
  try {
    const verifier = createJwtVerifier();
    const payload = await verifier.verify(token);
    logger.info('Token verified successfully');
    return payload;
  } catch (error) {
    logger.error('Token verification failed', { error });
    return null;
  }
};

/**
 * Extracts user identity information from various sources in the API Gateway event
 * Checks in order: Authorization header, authorizer context, custom headers, query params
 * 
 * @param event API Gateway event
 * @param logger Optional logger
 * @returns User identity information or undefined if not found
 */
export const extractUserInfo = (
  event: APIGatewayProxyEvent, 
  logger: Logger = defaultLogger
): UserIdentity | undefined => {
  // Check Authorization header - most reliable for Cognito
  if (event.headers.Authorization || event.headers.authorization) {
    const authHeader = event.headers.Authorization || event.headers.authorization;
    const userInfo = extractUserInfoFromAuthHeader(authHeader);
    
    if (userInfo?.userId && userInfo.userId.trim() !== '') {
      logger.info('Extracted user info from JWT token', { 
        userId: userInfo.userId,
        email: userInfo.email || 'not available' 
      });
      return userInfo;
    }
  }
  
  // Check authorizer context if present
  if (event.requestContext.authorizer) {
    const auth = event.requestContext.authorizer;
    
    // Try to extract from authorizer context
    if (auth.userId || auth.claims?.sub) {
      const userInfo: UserIdentity = {
        userId: auth.userId || auth.claims?.sub,
        email: auth.email || auth.claims?.email,
        username: auth.username || auth.claims?.['cognito:username']
      };
      
      if (userInfo.userId && userInfo.userId.trim() !== '') {
        logger.info('Extracted user info from authorizer context', { 
          userId: userInfo.userId,
          email: userInfo.email || 'not available'
        });
        return userInfo;
      }
    }
  }
  
  // Check custom header for userId
  const userId = event.headers['x-user-id'];
  if (userId && userId.trim() !== '') {
    // Try to get email from header as well
    const email = event.headers['x-user-email'];
    
    logger.info('Extracted user info from custom headers', { 
      userId,
      email: email || 'not available'
    });
    
    return {
      userId,
      email
    };
  }
  
  // Check query parameters
  if (event.queryStringParameters?.userId) {
    const userId = event.queryStringParameters.userId;
    if (userId && userId.trim() !== '') {
      // Try to get email from query param as well
      const email = event.queryStringParameters.email;
      
      logger.info('Extracted user info from query parameters', { 
        userId,
        email: email || 'not available'
      });
      
      return {
        userId,
        email
      };
    }
  }
  
  // If we reach here, no valid user info was found
  logger.warn('No valid user info found in request', {
    headerKeys: Object.keys(event.headers),
    hasAuthorizer: !!event.requestContext.authorizer
  });
  
  return undefined;
};

/**
 * Extracts just the user ID from various sources in the API Gateway event
 * 
 * @param event API Gateway event
 * @param logger Optional logger
 * @returns User ID or undefined if not found
 */
export const extractUserId = (
  event: APIGatewayProxyEvent, 
  logger: Logger = defaultLogger
): string | undefined => {
  const userInfo = extractUserInfo(event, logger);
  return userInfo?.userId;
};

/**
 * Extracts and validates the user identity from the request
 * Throws an error if no valid user ID is found
 * 
 * @param event API Gateway event
 * @param logger Optional logger
 * @returns Valid user identity information
 * @throws Error if no valid user ID is found
 */
export const requireUserInfo = (
  event: APIGatewayProxyEvent, 
  logger: Logger = defaultLogger
): UserIdentity => {
  const userInfo = extractUserInfo(event, logger);
  
  if (!userInfo || !userInfo.userId || userInfo.userId.trim() === '') {
    logger.error('Valid user ID is required but not found');
    throw new Error('Valid non-empty user ID is required. Authentication required.');
  }
  
  return userInfo;
};

/**
 * Extracts and validates the user ID from the request
 * Throws an error if no valid user ID is found
 * 
 * @param event API Gateway event
 * @param logger Optional logger
 * @returns A valid user ID
 * @throws Error if no valid user ID is found
 */
export const requireUserId = (
  event: APIGatewayProxyEvent, 
  logger: Logger = defaultLogger
): string => {
  const userInfo = requireUserInfo(event, logger);
  return userInfo.userId;
}; 