import { APIGatewayProxyHandlerV2WithIAMAuthorizer } from 'aws-lambda';
import { ObjectRequestSchema, ObjectQuerySchema } from './resourcesRequestTypes';
import { createResponse, createFlattenedResponse } from '../../../utils/http/response';
import { userPromptRepository, systemPromptRepository } from '../../../core/repositories/prompt/promptRepository';
import { userFlowRepository, systemFlowRepository } from '../../../core/repositories/flows/flowRepository';
import { userModelRepository, systemModelRepository } from '../../../core/repositories/model/modelRepository';
import { llmRepository } from '../../../core/repositories/llm/llmRepository';
import { VersionReference } from '../../../core/repositories/base/versionedRepository';

// Define supported resource types
type ResourceType = 'prompts' | 'llms' | 'flows' | 'models';
type StoreType = 'user' | 'system';

interface RequestContext {
  userId: string;
  userArn: string;
  requestId: string;
  startTime: number;
  flattenResponse: boolean;
  store: StoreType;
  resourceType: ResourceType;
}

class ResourceError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 404, code = 'NOT_FOUND') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}


export const handler: APIGatewayProxyHandlerV2WithIAMAuthorizer = async (event, context) => {
  try {
    // Initialize request context
    const requestContext = await initializeRequestContext(event);
    
    // Get appropriate repository
    const repository = getRepository(requestContext.store, requestContext.resourceType);

    // Route request based on HTTP method
    switch (event.requestContext.http.method) {
      case 'GET':
        return handleGetRequest(event, requestContext, repository);
      case 'POST':
        return handlePostRequest(event, requestContext, repository);
      default:
        return createMethodNotAllowedResponse(requestContext);
    }
  } catch (error) {
    return createErrorResponse(error, event.requestContext.requestId);
  }
};

async function initializeRequestContext(event: any): Promise<RequestContext> {
  const userId = event.requestContext.authorizer?.iam?.userId;
  if (!userId) {
    throw new Error('Unauthorized - missing user context');
  }

  const store = event.pathParameters?.dataStore as StoreType;
  if (!store || !['user', 'system'].includes(store)) {
    throw new Error('Invalid or missing data store type. Must be "user" or "system"');
  }

  const resourceType = event.pathParameters?.object as ResourceType;
  if (!resourceType || !['prompts', 'llms', 'flows', 'models'].includes(resourceType)) {
    throw new Error('Invalid resource type. Supported types: prompts, llms, flows, models');
  }

  // Validate LLM access restrictions
  if (resourceType === 'llms' && store === 'user') {
    throw new Error('LLMs can only be accessed from system storage');
  }

  return {
    userId,
    userArn: event.requestContext.authorizer?.iam?.userArn,
    requestId: event.requestContext.requestId,
    startTime: Date.now(),
    flattenResponse: event.queryStringParameters?.flatten === 'true' || process.env.FLATTEN_RESPONSE === 'true',
    store,
    resourceType
  };
}

function getRepository(store: StoreType, resourceType: ResourceType) {
  switch (resourceType) {
    case 'prompts':
      return store === 'user' ? userPromptRepository : systemPromptRepository;
    case 'llms':
      return llmRepository;
    case 'flows':
      return store === 'user' ? userFlowRepository : systemFlowRepository;
    case 'models':
      return store === 'user' ? userModelRepository : systemModelRepository;
    default:
      throw new Error(`Unsupported resource type: ${resourceType}`);
  }
}

async function handleGetRequest(event: any, context: RequestContext, repository: any) {
  const query = ObjectQuerySchema.parse({
    name: event.pathParameters?.name,
    version: event.pathParameters?.version,
  });

  try {
    // Special case: List all resources
    if (!query.name) {
      // Check if repository is versioned by looking for getVersions method
      const isVersioned = typeof repository.getVersions === 'function';
      return isVersioned 
        ? handleListVersionedResources(context, repository)
        : handleListNonVersionedResources(context, repository);
    }

    // Rest of the existing code...
    let responseData;
    let isMultiple = false;

    // Check if this is a UUID-based lookup
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(query.name);
    
    if (isUUID && query.version) {
      // Direct lookup using ID and version
      const itemId = `${context.resourceType.replace(/s$/, '')}#${query.name}#${query.version}`;
      console.log(`[ResourcesHandler] Direct lookup for ${itemId}`);
      
      responseData = await repository.getItem(context.userId, itemId);
      if (!responseData) {
        return createResponse(404, {
          success: false,
          metadata: {
            requestId: context.requestId,
            timestamp: new Date().toISOString()
          },
          error: {
            code: 'NOT_FOUND',
            message: `Item not found: ${itemId}`,
            details: {
              code: 'NOT_FOUND',
              service: 'resources',
              statusCode: 404
            }
          }
        });
      }
    } else {
      // Check if this is a versions request
      const isVersionsRequest = event.rawPath.endsWith('/versions');
      
      if (isVersionsRequest) {
        // Get all versions of a specific resource
        console.log(`[ResourcesHandler] Getting versions for ${query.name}`);
        const versions = await repository.getVersions(context.userId, query.name);
        if (!versions || versions.versions.length === 0) {
          return createResponse(404, {
            success: false,
            metadata: {
              requestId: context.requestId,
              timestamp: new Date().toISOString()
            },
            error: {
              code: 'NOT_FOUND',
              message: `${context.resourceType.slice(0, -1)} '${query.name}' has no versions`,
              details: {
                code: 'NOT_FOUND',
                service: 'resources',
                statusCode: 404
              }
            }
          });
        }
        responseData = versions;
        isMultiple = true;
      } else if (query.version) {
        // Get specific version
        console.log(`[ResourcesHandler] Getting specific version ${query.version} of ${query.name}`);
        const ref = await repository.getVersions(context.userId, query.name);
        if (!ref) {
          return createResponse(404, {
            success: false,
            metadata: {
              requestId: context.requestId,
              timestamp: new Date().toISOString()
            },
            error: {
              code: 'NOT_FOUND',
              message: `${context.resourceType.slice(0, -1)} '${query.name}' does not exist`,
              details: {
                code: 'NOT_FOUND',
                service: 'resources',
                statusCode: 404
              }
            }
          });
        }
        const itemId = `${context.resourceType.replace(/s$/, '')}#${ref.id}#${query.version}`;
        responseData = await repository.getItem(context.userId, itemId);
        if (!responseData) {
          return createResponse(404, {
            success: false,
            metadata: {
              requestId: context.requestId,
              timestamp: new Date().toISOString()
            },
            error: {
              code: 'NOT_FOUND',
              message: `Version ${query.version} not found for ${context.resourceType.slice(0, -1)} '${query.name}'`,
              details: {
                code: 'NOT_FOUND',
                service: 'resources',
                statusCode: 404
              }
            }
          });
        }
      } else {
        // Get latest version
        console.log(`[ResourcesHandler] Getting latest version of ${query.name}`);
        responseData = await repository.getOne(context.userId, query.name);
        if (!responseData) {
          return createResponse(404, {
            success: false,
            metadata: {
              requestId: context.requestId,
              timestamp: new Date().toISOString()
            },
            error: {
              code: 'NOT_FOUND',
              message: `${context.resourceType.slice(0, -1)} '${query.name}' does not exist`,
              details: {
                code: 'NOT_FOUND',
                service: 'resources',
                statusCode: 404
              }
            }
          });
        }
      }
    }

    return createSuccessResponse(context, responseData);
  } catch (error) {
    console.error('[ResourcesHandler] Error processing request:', error);
    return createErrorResponse(error, context.requestId);
  }
}

async function handleListVersionedResources(context: RequestContext, repository: any) {
  console.log(`[ResourcesHandler] Getting all versioned ${context.resourceType} references`);
  
  // For models, use getAll to ensure defaults are loaded
  if (context.resourceType === 'models') {
    const items = await repository.getAll(context.userId);
    return createResponse(200, {
      success: true,
      count: items.length,
      items: items.map((item: any) => ({
        name: item.name,
        version: item.version,
        content: item.content,
        metadata: item.metadata,
      })),
      metadata: {
        requestId: context.requestId,
        processingTimeMs: Date.now() - context.startTime,
        timestamp: new Date().toISOString(),
      },
    });
  }
  
  // For other versioned resources, use existing logic
  const refs = await repository.queryItems(context.userId, `ref#${context.resourceType.replace(/s$/, '')}#`);
  
  const items = refs.map((ref: VersionReference) => ({
    name: ref.displayName,
    versionsCount: ref.versionsCount,
    latestVersion: ref.latestVersion,
    versions: ref.versions.map(v => ({
      version: v.version,
      itemId: v.itemId,
      createdAt: v.createdAt,
      createdBy: v.createdBy,
    })),
    metadata: {
      createdAt: ref.metadata.createdAt,
      lastModifiedAt: ref.metadata.lastModifiedAt,
    },
  }));

  return createResponse(200, {
    success: true,
    count: items.length,
    items,
    metadata: {
      requestId: context.requestId,
      processingTimeMs: Date.now() - context.startTime,
      timestamp: new Date().toISOString(),
    },
  });
}

async function handleListNonVersionedResources(context: RequestContext, repository: any) {
  console.log(`[ResourcesHandler] Getting all non-versioned ${context.resourceType}`);
  
  const items = await repository.getAll(context.userId);
  
  return createResponse(200, {
    success: true,
    count: items.length,
    items: items.map(item => ({
      ...item,
      type: context.resourceType.slice(0, -1)
    })),
    metadata: {
      requestId: context.requestId,
      processingTimeMs: Date.now() - context.startTime,
      timestamp: new Date().toISOString()
    }
  });
}

async function handlePostRequest(event: any, context: RequestContext, repository: any) {
  const body = JSON.parse(event.body || '{}');
  const request = ObjectRequestSchema.parse(body);

  switch (request.operation) {
    case 'rename':
      await handleRename(repository, context, request);
      break;
    case 'create':
    case 'update':
      await handleCreateUpdate(repository, context, request);
      break;
    case 'delete':
      await handleDelete(repository, context, request);
      break;
  }

  return createSuccessResponse(context);
}

// Helper functions for POST operations
async function handleRename(repository: any, context: RequestContext, request: any) {
  if (!request.newName) {
    throw new Error('newName is required for rename operation');
  }
  await repository.rename(context.userId, request.name, request.newName);
}

async function handleCreateUpdate(repository: any, context: RequestContext, request: any) {
  const newObject = {
    name: request.name,
    version: request.version,
    createdBy: request.createdBy,
    content: typeof request.content === 'string' 
      ? { text: request.content } 
      : request.content || {},
    ...(request.description && { description: request.description }),
    tags: request.tags,
    metadata: {
      ...request.metadata,
      userArn: context.userArn,
      createdAt: new Date().toISOString(),
      lastModifiedAt: new Date().toISOString()
    }
  };
  
  await repository.save(context.userId, newObject);
}

async function handleDelete(repository: any, context: RequestContext, request: any) {
  await repository.delete(context.userId, request.name, request.version);
}

// Response formatting helpers
function formatMultipleItems(items: any[]) {
  return items.reduce((acc, item, index) => ({
    ...acc,
    [`${index}.name`]: item.name,
    [`${index}.version`]: item.version,
    [`${index}.content`]: item.content,
    [`${index}.metadata`]: item.metadata
  }), {});
}

function createSuccessResponse(context: RequestContext, data?: any) {
  const response = {
    success: true,
    metadata: {
      requestId: context.requestId,
      processingTimeMs: Date.now() - context.startTime,
      timestamp: new Date().toISOString()
    },
    ...(data && { data })
  };

  return context.flattenResponse 
    ? createFlattenedResponse(200, response)
    : createResponse(200, response);
}

function createMethodNotAllowedResponse(context: RequestContext) {
  return createResponse(405, {
    success: false,
    metadata: {
      requestId: context.requestId,
      processingTimeMs: Date.now() - context.startTime,
      timestamp: new Date().toISOString()
    },
    error: {
      code: 'METHOD_NOT_ALLOWED',
      message: 'Method not allowed',
      details: {
        code: 'METHOD_NOT_ALLOWED',
        service: 'resources',
        statusCode: 405
      }
    }
  });
}

function createErrorResponse(error: any, requestId: string) {
  const statusCode = error instanceof ResourceError ? error.statusCode : 500;
  const code = error instanceof ResourceError ? error.code : 'INTERNAL_ERROR';
  
  return createResponse(statusCode, {
    success: false,
    metadata: {
      requestId,
      timestamp: new Date().toISOString()
    },
    error: {
      code,
      message: error.message,
      details: {
        code,
        service: 'resources',
        statusCode
      }
    }
  });
}
