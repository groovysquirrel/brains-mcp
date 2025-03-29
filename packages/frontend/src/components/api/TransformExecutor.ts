import { post } from '@aws-amplify/api';
import axios from 'axios';

// Configure Axios defaults
axios.interceptors.request.use((config) => {
  config.timeout = 60000; // 60 seconds timeout
  return config;
});

interface TransformRequest {
  transformer: string;
  from_type: string;
  to_type: string;
  content: any;
}

interface TransformResponse {
  success: boolean;
  data?: any;
  metadata: {
    processingTimeMs: number;
    transformer: string;
    from_type: string;
    to_type: string;
    initialData: any;
    timestamp: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export class TransformExecutor {
  static async execute(request: TransformRequest): Promise<TransformResponse> {
    try {
      const restOperation = post({
        apiName: "brainsOS",
        path: "/latest/transform",
        options: {
          body: request as Record<string, any>
        }
      });

      const { body } = await restOperation.response;
      const responseData = (await body.json()) as unknown as TransformResponse;

      // If the API call was unsuccessful
      if (!responseData.success) {
        return {
          success: false,
          metadata: {
            processingTimeMs: 0,
            transformer: request.transformer,
            from_type: request.from_type,
            to_type: request.to_type,
            initialData: request.content,
            timestamp: new Date().toISOString()
          },
          error: responseData.error || {
            code: 'TRANSFORM_ERROR',
            message: 'API returned unsuccessful response'
          }
        };
      }

      return responseData;

    } catch (error) {
      console.error('❌ Transform execution failed:', {
        error,
        errorType: error instanceof Error ? error.name : typeof error,
        message: error instanceof Error ? error.message : String(error)
      });
      
      return {
        success: false,
        metadata: {
          processingTimeMs: 0,
          transformer: request.transformer,
          from_type: request.from_type,
          to_type: request.to_type,
          initialData: request.content,
          timestamp: new Date().toISOString()
        },
        error: {
          code: 'EXECUTION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error occurred'
        }
      };
    }
  }
}
