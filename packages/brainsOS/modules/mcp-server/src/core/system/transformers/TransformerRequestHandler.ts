import { Transformer, TransformerResult } from './TransformerTypes';
import { TransformerRepository } from '../../../repositories/TransformerRepository';
import { v4 as uuidv4 } from 'uuid';

const transformerRepository = TransformerRepository.getInstance();

/**
 * Creates an error response for failed transformer operations.
 * @param requestId - Unique identifier for the request
 * @param code - Error code for programmatic handling
 * @param message - Human-readable error message
 * @param statusCode - HTTP status code
 * @param service - Service identifier
 * @returns A TransformerResult containing error information
 */
function createErrorResponse(
  requestId: string,
  code: string,
  message: string,
  statusCode: number = 400,
  service: string = 'transformers'
): TransformerResult {
  return {
    success: false,
    error: message,
    metadata: {
      requestId,
      code,
      statusCode,
      service,
      processingTimeMs: 0,
      timestamp: new Date().toISOString()
    }
  };
}

/**
 * Creates a success response for successful transformer operations.
 * @param requestId - Unique identifier for the request
 * @param data - The result data from the transformer operation
 * @returns A TransformerResult containing the successful result
 */
function createSuccessResponse<T>(
  requestId: string,
  data: T
): TransformerResult {
  return {
    success: true,
    data,
    metadata: {
      requestId,
      processingTimeMs: 0,
      timestamp: new Date().toISOString()
    }
  };
}

/**
 * Handles incoming transformer requests.
 * @param event - The incoming request event
 * @returns A promise that resolves to a TransformerResult
 */
export async function handleTransformerRequest(event: any): Promise<TransformerResult> {
  const requestId = uuidv4();
  const path = event.path;
  const body = JSON.parse(event.body || '{}');
  
  // Extract transformer type from path
  const transformerType = path.split('/').pop();
  if (!transformerType) {
    return createErrorResponse(
      requestId,
      'INVALID_PATH',
      'Invalid transformer path'
    );
  }

  // Get transformer from repository
  const transformer = await transformerRepository.getByName(transformerType);
  if (!transformer) {
    return createErrorResponse(
      requestId,
      'TRANSFORMER_NOT_FOUND',
      `No transformer found for type: ${transformerType}`,
      404
    );
  }

  try {
    // Validate input if transformer has validation
    if (transformer.validate) {
      const isValid = await transformer.validate(body.input, body.parameters);
      if (!isValid) {
        return createErrorResponse(
          requestId,
          'INVALID_INPUT',
          'Input validation failed'
        );
      }
    }

    // Transform the input
    const result = await transformer.transform(body.input, body.parameters);
    
    // Add request ID to metadata
    return {
      ...result,
      metadata: {
        ...result.metadata,
        requestId
      }
    };
  } catch (error) {
    return createErrorResponse(
      requestId,
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : 'Unknown error occurred',
      500
    );
  }
} 