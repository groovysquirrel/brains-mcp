/**
 * Flow Executor
 * 
 * Handles the execution of flows and their nodes, including:
 * - Node execution logic for different node types
 * - Data flow between connected nodes
 * - Execution context management
 * - Conversation state for prompt nodes
 */

import { Node } from 'reactflow';
import { post } from '@aws-amplify/api';
import { 
  BaseNodeData,
  ExecutionContext,
  NodeExecutionResult,
  APIResponse,
  PromptResponseData 
} from '../types';

export class FlowExecutor {
  /**
   * Formats input content from multiple nodes
   */
  private static formatInputContent(inputs: { [key: string]: string }): string {
    if (!inputs || Object.keys(inputs).length === 0) {
      return '';
    }

    const groupedInputs = Object.entries(inputs).reduce((acc, [key, value]) => {
      if (key.startsWith('data:')) {
        if (!acc.dataInputs) acc.dataInputs = [];
        acc.dataInputs.push({ key: key.replace('data:', ''), value });
      } else {
        if (!acc.regularInputs) acc.regularInputs = [];
        acc.regularInputs.push({ key, value });
      }
      return acc;
    }, { dataInputs: [], regularInputs: [] } as { 
      dataInputs: { key: string; value: string }[];
      regularInputs: { key: string; value: string }[];
    });

    const regularContent = groupedInputs.regularInputs
      .filter(({ value }) => value && value.trim() !== '')
      .map(({ value }) => value.trim())
      .join('\n\n');

    const dataContent = groupedInputs.dataInputs
      .filter(({ value }) => value && value.trim() !== '')
      .map(({ key, value }) => `${key}: ${value.trim()}`)
      .join('\n');

    const parts = [];
    if (regularContent) parts.push(regularContent);
    if (dataContent) parts.push(dataContent);
    
    return parts.join('\n\n');
  }

  /**
   * Main execution method for any node type
   */
  static async executeFlow(
    node: Node<BaseNodeData>,
    context: ExecutionContext,
    initialInput?: string
  ): Promise<NodeExecutionResult> {
    try {
      switch (node.type) {
        case 'input':
          return this.executeInputNode(node, initialInput || '');
        case 'prompt':
          return await this.executePromptNode(node, context);
        case 'output':
          return this.executeOutputNode(node, context);
        case 'data':
          return this.executeDataNode(node, context);
        default:
          throw new Error(`Unsupported node type: ${node.type}`);
      }
    } catch (error: any) {
      console.error('❌ Execution error:', error);
      return {
        success: false,
        nodeId: node.id,
        error: {
          message: error.message || 'Failed to execute node',
          code: error.code || 'EXECUTION_ERROR',
          details: {
            statusCode: error.details?.statusCode || 500,
            code: error.details?.code || 'UnknownError'
          }
        }
      };
    }
  }

  /**
   * Executes a prompt node
   */
  private static async executePromptNode(
    node: Node<BaseNodeData>,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    try {
      const content = typeof node.data.content === 'object' ? node.data.content as { modelId?: string; systemPrompt?: string } : {};
      if (!content?.modelId) {
        throw new Error('No model selected for prompt node');
      }

      const modelSource = content.modelId.startsWith('meta.') ? 'meta' : 'bedrock';
      const formattedInput = this.formatInputContent(context.inputs);
      
      if (!formattedInput) {
        throw new Error('No input content available');
      }

      console.log('📝 Executing prompt:', {
        nodeId: node.id,
        modelId: content.modelId,
        input: formattedInput
      });

      const payload = {
        userPrompt: formattedInput,
        modelId: content.modelId,
        modelSource: modelSource,
        systemPrompt: content.systemPrompt || '',
      };

      const restOperation = post({
        apiName: "brainsOS",
        path: "/latest/services/prompt/instruction",
        options: { 
          body: payload as Record<string, any>,
          headers: { 'Content-Type': 'application/json' }
        }
      });

      const response = await restOperation.response;
      const responseData = (await response.body.json() as unknown) as APIResponse<PromptResponseData>;

      if (responseData.error) {
        return {
          success: false,
          nodeId: node.id,
          error: {
            message: responseData.error.message,
            code: responseData.error.code,
            details: responseData.error.details
          }
        };
      }

      return {
        success: true,
        nodeId: node.id,
        result: responseData.data?.content || responseData.data?.response,
        metadata: {
          processingTimeMs: responseData.metadata.processingTimeMs,
          usage: responseData.data?.usage
        }
      };
    } catch (error: any) {
      console.error('❌ Prompt execution error:', error);
      
      // If it's an Amplify API error with a response body
      if (error.response?.body) {
        try {
          const errorData = JSON.parse(error.response.body);
          return {
            success: false,
            nodeId: node.id,
            error: {
              message: errorData.error?.message || 'API request failed',
              code: errorData.error?.code || 'API_ERROR',
              details: {
                statusCode: errorData.error?.details?.statusCode || 500,
                code: errorData.error?.details?.code || 'UnknownError',
                service: errorData.error?.details?.service,
                operation: errorData.error?.details?.operation,
                modelId: errorData.error?.details?.modelId,
                vendor: errorData.error?.details?.vendor
              }
            }
          };
        } catch (parseError) {
          console.error('Failed to parse error response:', error.response.body);
        }
      }

      // Default error response
      return {
        success: false,
        nodeId: node.id,
        error: {
          message: error.message || 'Failed to execute prompt',
          code: error.code || 'EXECUTION_ERROR',
          details: {
            statusCode: error.details?.statusCode || 500,
            code: error.details?.code || 'UnknownError',
            modelId: error.details?.modelId,
            operation: error.details?.operation,
            service: error.details?.service,
            vendor: error.details?.vendor
          }
        }
      };
    }
  }

  /**
   * Executes an output node
   */
  private static executeOutputNode(
    node: Node<BaseNodeData>,
    context: ExecutionContext
  ): NodeExecutionResult {
    const inputValue = Object.values(context.inputs)[0];
    const result = typeof inputValue === 'object' && 
      (inputValue as any)?.result !== undefined
      ? (inputValue as any).result 
      : inputValue;

    return {
      success: true,
      nodeId: node.id,
      result: result as string,
      metadata: {
        processingTimeMs: 0
      }
    };
  }

  /**
   * Executes an input node
   */
  private static executeInputNode(
    node: Node<BaseNodeData>,
    input: string
  ): NodeExecutionResult {
    return {
      success: true,
      nodeId: node.id,
      result: input,
      metadata: {
        processingTimeMs: 0,
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0
        }
      }
    };
  }

  /**
   * Executes a data node
   */
  private static executeDataNode(
    node: Node<BaseNodeData>,
    context: ExecutionContext
  ): NodeExecutionResult {
    // First check if the node has its own content
    if (node.data.content) {
      return {
        success: true,
        nodeId: node.id,
        result: node.data.content as string,
        metadata: {
          processingTimeMs: 0
        }
      };
    }

    // If no content, use input from upstream nodes
    const inputValue = Object.values(context.inputs)[0];
    const result = typeof inputValue === 'object' && 
      (inputValue as any)?.result !== undefined
      ? (inputValue as any).result 
      : inputValue;

    if (!result) {
      return {
        success: false,
        nodeId: node.id,
        error: {
          message: 'No content or input available for data node',
          code: 'NO_CONTENT',
          details: {
            statusCode: 400,
            code: 'NoContent'
          }
        }
      };
    }

    return {
      success: true,
      nodeId: node.id,
      result: result as string,
      metadata: {
        processingTimeMs: 0
      }
    };
  }
}
