/**
 * This file implements a stream handler for LLM responses.
 * It's responsible for:
 * 1. Managing streaming responses from the LLM Gateway
 * 2. Handling stream abortion
 * 3. Sending stream chunks to WebSocket clients
 * 4. Managing stream state and cleanup
 * 
 * Key Concepts:
 * - Async Iterators: Used to process streaming responses
 * - AbortController: Used to cancel ongoing streams
 * - Error Handling: Proper error handling and cleanup
 * - State Management: Tracking active streams
 */

import { Logger } from '../../shared/logging/logger';
import { ConnectionManager } from './connectionManager';
import { GatewayResponse } from '../../../llm-gateway-v2/src/types/Response';

const logger = new Logger('StreamHandler');
const connectionManager = ConnectionManager.getInstance();


export class StreamHandler {
  private buffers: Map<string, {
    content: string;
    metadata?: Record<string, unknown>;
    lastFlush: number;
    timeout?: ReturnType<typeof setTimeout>;
    aborted?: boolean;
    outputTokenCount: number;
    inputTokenEstimate: number;
  }>;

  constructor() {
    this.buffers = new Map();
  }

  /**
   * Estimates token count from text using a simple word-based approach
   * This is a rough estimate assuming ~1.3 tokens per word on average
   */
  private estimateTokenCount(text: string): number {
    // Split by whitespace and count words
    const words = text.trim().split(/\s+/).length;
    // Apply a multiplier to account for the fact that tokens are smaller than words
    return Math.ceil(words * 1.3);
  }

  /**
   * Handles a streaming response from the LLM Gateway.
   * This method:
   * 1. Creates an abort controller for the stream
   * 2. Processes each chunk from the stream
   * 3. Sends chunks to the WebSocket client
   * 4. Handles stream completion and errors
   * 
   * @param stream - Async iterator yielding GatewayResponse objects
   * @param connectionId - ID of the WebSocket connection
   * @param userId - Optional user ID
   * @param conversationId - Optional conversation ID for tracking
   * @param metadata - Optional metadata to include in responses
   * @param request - The original request that was sent to get tokens from input
   */
  public async handleStream(
    stream: AsyncGenerator<GatewayResponse>,
    connectionId: string,
    userId: string,
    conversationId?: string,
    metadata?: Record<string, unknown>,
    request?: any
  ): Promise<void> {
    try {
      // Estimate input tokens if we have messages
      let inputTokenEstimate = 0;
      if (request?.messages) {
        // Combine all message content for token estimation
        const allContent = request.messages.map(m => m.content).join(' ');
        inputTokenEstimate = this.estimateTokenCount(allContent);
        
        // Add tokens for system prompt if present
        if (request.systemPrompt) {
          inputTokenEstimate += this.estimateTokenCount(request.systemPrompt);
        }
        
        logger.debug('Estimated input tokens', {
          inputTokenEstimate,
          messageCount: request.messages.length
        });
        
        // Store this estimate in the buffer
        const buffer = this.getOrCreateBuffer(connectionId);
        buffer.inputTokenEstimate = inputTokenEstimate;
      }
      
      for await (const chunk of stream) {
        await this.handleChunk(chunk, connectionId);
      }
      
      // Flush any remaining content
      await this.flushBuffer(connectionId);
      
      // Get final token counts
      const buffer = this.buffers.get(connectionId);
      const outputTokenCount = buffer ? buffer.outputTokenCount : 0;
      
      // Send final message with metadata and token counts
      await connectionManager.sendMessage(connectionId, {
        type: 'stream_end',
        data: {
          metadata: {
            ...metadata,
            userId,
            conversationId,
            timestamp: new Date().toISOString(),
            usage: {
              promptTokens: inputTokenEstimate,
              completionTokens: outputTokenCount,
              totalTokens: inputTokenEstimate + outputTokenCount
            }
          }
        }
      });
    } catch (error) {
      logger.error('Error handling stream:', {
        error,
        connectionId,
        userId
      });
      
      await connectionManager.sendMessage(connectionId, {
        type: 'error',
        data: {
          message: error.message,
          code: error.code || 'INTERNAL_ERROR'
        }
      });
    }
  }

  private async handleChunk(chunk: GatewayResponse, connectionId: string) {
    const buffer = this.getOrCreateBuffer(connectionId);
    
    // Check if stream was aborted
    if (buffer.aborted) {
      return;
    }
    
    // Preserve usage information when present in metadata
    const metadata = { ...chunk.metadata };
    
    // Estimate tokens in this chunk of text and add to count
    if (chunk.content) {
      const tokensInChunk = this.estimateTokenCount(chunk.content);
      buffer.outputTokenCount += tokensInChunk;
    }
    
    // Add our own token count to the metadata
    metadata.usage = {
      promptTokens: buffer.inputTokenEstimate,
      completionTokens: buffer.outputTokenCount,
      totalTokens: buffer.inputTokenEstimate + buffer.outputTokenCount
    };
    
    // Log token counts
    logger.debug('Updated token counts for stream chunk:', {
      connectionId,
      contentLength: chunk.content?.length || 0,
      outputTokenCount: buffer.outputTokenCount,
      metadata: metadata
    });
    
    // Pass through all chunks directly without buffering
    await connectionManager.sendMessage(connectionId, {
      type: 'stream',
      data: {
        content: chunk.content,
        metadata: metadata
      }
    });
  }

  private getOrCreateBuffer(connectionId: string) {
    if (!this.buffers.has(connectionId)) {
      this.buffers.set(connectionId, {
        content: '',
        lastFlush: Date.now(),
        outputTokenCount: 0,
        inputTokenEstimate: 0
      });
    }
    return this.buffers.get(connectionId)!;
  }

  private async flushBuffer(connectionId: string) {
    const buffer = this.buffers.get(connectionId);
    if (!buffer || !buffer.content || buffer.aborted) return;
    
    // Clear the buffer
    buffer.content = '';
    buffer.metadata = undefined;
    
    // Clear any existing timeout
    if (buffer.timeout) {
      clearTimeout(buffer.timeout);
      buffer.timeout = undefined;
    }
    
    buffer.lastFlush = Date.now();
  }

  /**
   * Aborts an active stream for a given connection.
   * This is useful when:
   * 1. The client disconnects
   * 2. The client sends a cancel request
   * 3. An error occurs that requires stream termination
   * 
   * @param connectionId - ID of the connection to abort
   */
  public abortStream(connectionId: string): void {
    const buffer = this.buffers.get(connectionId);
    if (buffer) {
      // Mark the stream as aborted
      buffer.aborted = true;
      
      // Clear any pending timeout
      if (buffer.timeout) {
        clearTimeout(buffer.timeout);
        buffer.timeout = undefined;
      }
      
      // Clear the buffer
      buffer.content = '';
      buffer.metadata = undefined;
      
      // Remove the buffer
      this.buffers.delete(connectionId);
      
      logger.info('Aborted stream', { connectionId });
    }
  }
} 