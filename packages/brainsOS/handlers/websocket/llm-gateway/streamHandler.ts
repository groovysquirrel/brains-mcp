import { Logger } from '../../shared/logging/logger';
import { ChatResponse, Message } from '../../../llm-gateway/types';
import { ConnectionManager } from './connectionManager';
import { conversationRepository } from '../../../system/repositories/conversation/conversationRepository';

const logger = new Logger('StreamHandler');
const connectionManager = ConnectionManager.getInstance();

/**
 * Handles streaming responses from the LLM (Language Model).
 * This class manages the process of receiving chunks from the LLM and sending them to the client
 * in a controlled manner to ensure smooth streaming.
 * 
 * Key features:
 * 1. Accumulates content until it reaches a certain size or time threshold
 * 2. Handles connection state to prevent sending to closed connections
 * 3. Stores conversation history when needed
 * 4. Manages streaming metadata and usage information
 */
export class StreamHandler {
  // Thresholds for controlling when to send chunks to the client
  private static readonly CHUNK_SIZE_THRESHOLD = 100; // characters
  private static readonly TIME_THRESHOLD = 200; // milliseconds

  /**
   * Processes a stream of responses from the LLM and sends them to the client.
   * This is the main entry point for handling streaming responses.
   * 
   * @param stream - Async generator yielding chat responses
   * @param connectionId - ID of the WebSocket connection
   * @param userId - ID of the user making the request
   * @param conversationId - Optional ID for storing conversation history
   * @param metadata - Additional metadata for the stream
   */
  public async handleStream(
    stream: AsyncGenerator<ChatResponse>,
    connectionId: string,
    userId: string,
    conversationId: string | undefined,
    metadata: any
  ): Promise<void> {
    // State variables for tracking the stream
    const state = this.initializeStreamState();

    try {
      await this.processStream(stream, connectionId, state);
      await this.sendRemainingContent(connectionId, state);
    } catch (error) {
      this.handleStreamError(error, connectionId, userId);
      throw error;
    } finally {
      connectionManager.removeConnection(connectionId);
    }

    await this.handlePostStream(connectionId, userId, conversationId, state.accumulatedMessages);
  }

  /**
   * Initializes the state object for tracking stream progress.
   */
  private initializeStreamState() {
    return {
      accumulatedMessages: [] as Message[],
      accumulatedContent: '',
      lastSendTime: Date.now(),
      lastUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      lastMetadata: {}
    };
  }

  /**
   * Processes the stream of responses from the LLM.
   * Accumulates content and sends it to the client when thresholds are met.
   */
  private async processStream(
    stream: AsyncGenerator<ChatResponse>,
    connectionId: string,
    state: ReturnType<typeof this.initializeStreamState>
  ): Promise<void> {
    for await (const chunk of stream) {
      if (!connectionManager.isConnectionActive(connectionId)) {
        logger.warn('Connection closed during stream', { connectionId });
        break;
      }

      this.updateStreamState(chunk, state);

      if (this.shouldSendChunk(state.accumulatedContent, Date.now(), state.lastSendTime)) {
        await this.sendChunk(connectionId, state);
        this.resetAccumulatedContent(state);
      }
    }
  }

  /**
   * Updates the stream state with new chunk data.
   */
  private updateStreamState(chunk: ChatResponse, state: ReturnType<typeof this.initializeStreamState>): void {
    state.accumulatedContent += chunk.content;
    state.accumulatedMessages.push({
      role: 'assistant',
      content: chunk.content
    });
    state.lastUsage = chunk.usage || state.lastUsage;
    state.lastMetadata = chunk.metadata || state.lastMetadata;
  }

  /**
   * Determines if we should send the accumulated content to the client.
   */
  private shouldSendChunk(content: string, now: number, lastSendTime: number): boolean {
    return content.length >= StreamHandler.CHUNK_SIZE_THRESHOLD ||
           (now - lastSendTime >= StreamHandler.TIME_THRESHOLD && content.length > 0);
  }

  /**
   * Sends the current chunk of content to the client.
   */
  private async sendChunk(
    connectionId: string,
    state: ReturnType<typeof this.initializeStreamState>
  ): Promise<void> {
    await connectionManager.sendToClient(connectionId, {
      type: 'stream',
      content: state.accumulatedContent,
      usage: state.lastUsage,
      metadata: {
        ...state.lastMetadata,
        isStreaming: true
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Resets the accumulated content after sending.
   */
  private resetAccumulatedContent(state: ReturnType<typeof this.initializeStreamState>): void {
    state.accumulatedContent = '';
    state.lastSendTime = Date.now();
  }

  /**
   * Sends any remaining content that hasn't been sent yet.
   */
  private async sendRemainingContent(
    connectionId: string,
    state: ReturnType<typeof this.initializeStreamState>
  ): Promise<void> {
    if (state.accumulatedContent.length > 0) {
      await this.sendChunk(connectionId, state);
    }
  }

  /**
   * Handles any errors that occur during stream processing.
   */
  private handleStreamError(error: any, connectionId: string, userId: string): void {
    logger.error('Error during stream processing:', {
      error,
      connectionId,
      userId
    });
  }

  /**
   * Handles post-stream tasks like storing conversation history.
   */
  private async handlePostStream(
    connectionId: string,
    userId: string,
    conversationId: string | undefined,
    messages: Message[]
  ): Promise<void> {
    if (conversationId && connectionManager.isConnectionActive(connectionId)) {
      const repo = conversationRepository.getInstance();
      await repo.addToConversation(userId, conversationId, messages);
    }

    if (connectionManager.isConnectionActive(connectionId)) {
      await connectionManager.sendToClient(connectionId, {
        type: 'stream_complete',
        timestamp: new Date().toISOString()
      });
    }
  }
} 