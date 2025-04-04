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
  // Map to track active streams and their abort controllers
  // This allows us to cancel streams if needed
  private activeStreams: Map<string, AbortController>;

  constructor() {
    this.activeStreams = new Map();
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
    stream: AsyncIterable<GatewayResponse>,
    connectionId: string,
    userId?: string,
    conversationId?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    // Create an abort controller for this stream
    const abortController = new AbortController();
    this.activeStreams.set(connectionId, abortController);

    try {
      // Process each chunk from the stream
      for await (const chunk of stream) {
        // Check if the stream has been aborted
        if (abortController.signal.aborted) {
          logger.info('Stream aborted', { connectionId, userId });
          break;
        }

        // Send the chunk to the client
        await connectionManager.sendMessage(connectionId, {
          type: 'stream',
          data: {
            ...chunk,
            conversationId,
            metadata
          }
        });
      }

      // Send stream end message when complete
      await connectionManager.sendMessage(connectionId, {
        type: 'stream_end',
        data: {
          conversationId,
          metadata
        }
      });
    } catch (error) {
      // Log and handle stream errors
      logger.error('Stream error', { error, connectionId, userId });
      await connectionManager.sendMessage(connectionId, {
        type: 'error',
        data: {
          message: error.message,
          code: error.code || 'STREAM_ERROR',
          conversationId
        }
      });
    } finally {
      // Clean up the stream from active streams
      this.activeStreams.delete(connectionId);
    }
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
    const controller = this.activeStreams.get(connectionId);
    if (controller) {
      // Abort the stream
      controller.abort();
      // Remove from active streams
      this.activeStreams.delete(connectionId);
      logger.info('Aborted stream', { connectionId });
    }
  }
} 