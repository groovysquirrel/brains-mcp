import { post } from '@aws-amplify/api';
import { APIResponse } from '../../types/api';

// axios.interceptors.request.use((config) => {
//   config.timeout = 60000; // 60 seconds timeout
//   return config;
// });


interface PromptResponse {
  response?: string;
  requestId?: string;
  usage?: any;
  [key: string]: any;
}

interface ExecutionResult {
  success: boolean;
  data?: {
    message?: string;
    clearScreen?: boolean;
    [key: string]: any;
  };
  error?: string;
}

export class PromptExecutor {
  static async execute(prompt: string, request: string): Promise<ExecutionResult> {
    try {
      const restOperation = post({
        apiName: "brainsOS",
        path: "/latest/builder/brabuilder",
        options: {
          body: {
            prompt: prompt,
            request: request
          }
        }
      });

      const { body } = await restOperation.response;
      const rawData = await body.json() as unknown;
      const responseData = rawData as APIResponse<PromptResponse>;

      if (!responseData.success) {
        return {
          success: false,
          error: responseData.error?.message || 'API returned unsuccessful response'
        };
      }

      // Extract and format the response message
      if (responseData.data?.response) {
        return {
          success: true,
          data: {
            message: responseData.data.response,
            response: responseData.data
          }
        };
      }

      return {
        success: false,
        error: 'No response content found in API response'
      };

    } catch (error) {
      console.error('❌ Prompt execution failed:', {
        error,
        errorType: error instanceof Error ? error.name : typeof error,
        message: error instanceof Error ? error.message : String(error)
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}
