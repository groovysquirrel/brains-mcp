import { APIGatewayProxyHandlerV2WithIAMAuthorizer } from 'aws-lambda';
import { TransformError } from '../../../../core/types/transformerTypes';
import { transformerRepository } from '../../../../core/repositories/transformer/transformerRepository';
import { 
  TransformPathParameters, 
  TransformRequestBody, 
  TransformContext,
  TransformErrorResponse 
} from './transformHandlerTypes';
import { createResponse, createFlattenedResponse } from '../../../../utils/http/response';
import { parseMarkdown } from '../../../../config/transformers/itrg-bra/md-object';
import { generateDotGraph } from '../../../../config/transformers/itrg-bra/object-dot';
import { generateCsv } from '../../../../config/transformers/itrg-bra/object-csv';

// Map of transformer implementations
const transformerImplementations: { [key: string]: any } = {
  'itrg-bra': {
    'markdown-object': parseMarkdown,
    'object-dot': generateDotGraph,
    'object-csv': generateCsv,
    'markdown/object': parseMarkdown,
    'object/dot': generateDotGraph,
    'object/csv': generateCsv
  }
};

export const handler: APIGatewayProxyHandlerV2WithIAMAuthorizer = async (event) => {
  console.log('Raw event:', JSON.stringify(event, null, 2));
  console.log('Path parameters:', event.pathParameters);
  console.log('Raw path:', event.rawPath);
  
  const context: TransformContext = {
    userId: event.requestContext.authorizer?.iam?.userId,
    requestId: event.requestContext.requestId,
    startTime: Date.now(),
    objectType: event.pathParameters?.objectType?.toLowerCase() || 'unknown',
    fromView: event.pathParameters?.fromView || 'unknown',
    toView: event.pathParameters?.toView || 'unknown',
    initialData: null,
    flattenResponse: event.queryStringParameters?.flatten === 'true' || process.env.FLATTEN_RESPONSE === 'true'
  };
  
  console.log('Parsed context:', context);
  
  try {
    // Force load defaults if needed
    console.log('Getting all transformers...');
    const allTransformers = await transformerRepository.getTransformers('system');
    console.log('Available transformers:', allTransformers);
    
    // Validate request
    if (!event.body) {
      throw new TransformError({
        errorCode: 'INVALID_REQUEST',
        errorMessage: 'Missing request body'
      });
    }

    const request: TransformRequestBody = JSON.parse(event.body);
    context.initialData = request.content;
    
    if (!request.content) {
      throw new TransformError({
        errorCode: 'INVALID_REQUEST',
        errorMessage: 'Missing content in request body'
      });
    }

    if (context.objectType === 'unknown' || context.fromView === 'unknown' || context.toView === 'unknown') {
      throw new TransformError({
        errorCode: 'INVALID_REQUEST',
        errorMessage: 'Invalid path parameters'
      });
    }

    // Add better debug logging
    console.log('Input content:', context.initialData);
    
    // Find and execute transformations
    let currentContent = request.content;
    const transformPath = await transformerRepository.findTransformationPath(
      'system',
      context.objectType,
      context.fromView,
      context.toView
    );

    if (transformPath.length === 0) {
      throw new TransformError({
        errorCode: 'TRANSFORM_PATH_NOT_FOUND',
        errorMessage: `Transformation path not found from ${context.fromView} to ${context.toView}`,
        additionalInfo: `Object type: ${context.objectType}`
      });
    }

    for (const transformer of transformPath) {
      const implementationKey = `${transformer.fromView}/${transformer.toView}`;
      const implementation = transformerImplementations[context.objectType]?.[implementationKey];
      
      console.log('Current transform step:', {
        implementationKey,
        hasImplementation: !!implementation,
        inputType: typeof currentContent,
        input: currentContent
      });

      if (!implementation) {
        throw new TransformError({
          errorCode: 'IMPLEMENTATION_NOT_FOUND',
          errorMessage: `Transformer implementation not found for ${implementationKey}`,
          additionalInfo: `Object type: ${context.objectType}, Available implementations: ${Object.keys(transformerImplementations[context.objectType] || {}).join(', ')}`
        });
      }

      try {
        currentContent = await implementation(currentContent);
      } catch (error) {
        throw new TransformError({
          errorCode: 'TRANSFORM_FAILED',
          errorMessage: `Failed to transform from ${transformer.fromView} to ${transformer.toView}`,
          additionalInfo: error.message
        });
      }
    }

    const response = {
      success: true,
      data: currentContent,
      metadata: {
        processingTimeMs: Date.now() - context.startTime,
        objectType: context.objectType,
        fromView: context.fromView,
        toView: context.toView,
        initialData: context.initialData,
        timestamp: new Date().toISOString(),
        transformPath: transformPath.map(t => `${t.fromView}->${t.toView}`)
      }
    };

    return context.flattenResponse
      ? createFlattenedResponse(200, response)
      : createResponse(200, response);

  } catch (error: any) {
    const isTransformPathNotFound = error instanceof TransformError && error.details.errorCode === 'TRANSFORM_PATH_NOT_FOUND';
    const statusCode = isTransformPathNotFound ? 404 : (error instanceof TransformError ? 400 : 500);

    const errorResponse: TransformErrorResponse = {
      success: false,
      metadata: {
        processingTimeMs: Date.now() - context.startTime,
        objectType: context.objectType,
        fromView: context.fromView,
        toView: context.toView,
        initialData: context.initialData,
        timestamp: new Date().toISOString()
      },
      error: {
        code: error instanceof TransformError ? error.details.errorCode : 'TRANSFORM_ERROR',
        message: error instanceof TransformError ? error.details.errorMessage : 'An unknown error occurred',
        additionalInfo: error instanceof TransformError ? error.details.additionalInfo : undefined
      }
    };

    return context.flattenResponse
      ? createFlattenedResponse(statusCode, errorResponse)
      : createResponse(statusCode, errorResponse);
  }
};
