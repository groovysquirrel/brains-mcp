/**
 * API Handler for Money Manager Status
 * 
 * This handler is responsible for:
 * 1. Processing HTTP requests for user financial status
 * 2. Retrieving usage information from the Money Manager
 * 3. Returning formatted status responses
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Logger } from '../../../utils/logging/logger';
import { Resource } from 'sst';
import { MoneyManager } from '../../../modules/money-manager/src/money-manager';
import { requireUserInfo } from '../../system/auth/authUtils';

// Initialize logging
const logger = new Logger('MoneyManagerStatusHandler');

// Global state for the Money Manager
// This is a singleton pattern to ensure we only have one instance
let moneyManager: MoneyManager;
let initializationPromise: Promise<void>;

/**
 * Initializes the Money Manager
 * 
 * @throws {Error} If initialization fails
 */
const initializeMoneyManager = async () => {
  try {
    logger.info('Initializing Money Manager');

    moneyManager = new MoneyManager({
      logger,
      dbConfig: {
        user: Resource.brainsOS_RDS_Aurora.username,
        password: Resource.brainsOS_RDS_Aurora.password,
        database: Resource.brainsOS_RDS_Aurora.database,
        host: Resource.brainsOS_RDS_Aurora.host,
        port: Resource.brainsOS_RDS_Aurora.port
      }
    });
    
    await moneyManager.initialize();

    logger.info('Money Manager initialized successfully');
  } catch (error) {
    const err = error as Error;
    logger.error('Failed to initialize Money Manager:', {
      error: err
    });
    throw err;
  }
};

/**
 * Ensures the Money Manager is initialized before handling any requests
 * 
 * @returns Promise that resolves when Money Manager is ready
 */
const ensureInitialized = async () => {
  if (!initializationPromise) {
    initializationPromise = initializeMoneyManager();
  }
  return initializationPromise;
};

/**
 * Creates a standardized API response
 * @param statusCode HTTP status code
 * @param body Response body
 * @returns Formatted API Gateway response
 */
const createResponse = (statusCode: number, body: any): APIGatewayProxyResult => {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: JSON.stringify(body)
  };
};

/**
 * Handles status requests to the Money Manager
 * @param event API Gateway event
 * @returns API Gateway response
 */
const handleStatusRequest = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Extract user information using the shared auth utility
    const userInfo = requireUserInfo(event, logger);
    const { userId, email } = userInfo;
    
    logger.info('Processing status request', { 
      userId, 
      email: email || 'unknown',
      userInfo
    });
    
    // Get user status from Money Manager
    const status = await moneyManager.getUserStatus(userId);
    
    // For now, this will return a "not implemented yet" placeholder
    // In the future, it will return actual usage data
    
    return createResponse(200, {
      ...status,
      email: email // Include email in the response for reference
    });
  } catch (error: any) {
    logger.error('Error handling status request:', error);
    return createResponse(500, {
      error: error.message || 'Internal server error',
      code: error.code || 'INTERNAL_ERROR'
    });
  }
};

/**
 * Main Lambda handler for processing API Gateway requests
 * @param event API Gateway event
 * @returns API Gateway response
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Ensure Money Manager is initialized
    await ensureInitialized();
    
    logger.info('Received request', {
      path: event.path,
      method: event.httpMethod
    });
    
    // For now, only handle status requests
    return handleStatusRequest(event);
  } catch (error: any) {
    logger.error('Error processing request:', error);
    return createResponse(500, {
      error: error.message || 'Internal server error',
      code: error.code || 'INTERNAL_ERROR'
    });
  }
}; 