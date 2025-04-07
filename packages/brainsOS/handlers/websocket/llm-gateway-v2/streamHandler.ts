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
  }>;

  constructor() {
    this.buffers = new Map();
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
   */
  public async handleStream(
    stream: AsyncGenerator<GatewayResponse>,
    connectionId: string,
    userId: string,
    conversationId?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      for await (const chunk of stream) {
        await this.handleChunk(chunk, connectionId);
      }
      
      // Flush any remaining content
      await this.flushBuffer(connectionId);
      
      // Send final message with metadata
      await connectionManager.sendMessage(connectionId, {
        type: 'stream_end',
        data: {
          metadata: {
            ...metadata,
            userId,
            conversationId,
            timestamp: new Date().toISOString()
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
    
    // Pass through all chunks directly without buffering
    await connectionManager.sendMessage(connectionId, {
      type: 'stream',
      data: {
        content: chunk.content,
        metadata: chunk.metadata
      }
    });
  }

  private getOrCreateBuffer(connectionId: string) {
    if (!this.buffers.has(connectionId)) {
      this.buffers.set(connectionId, {
        content: '',
        lastFlush: Date.now()
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