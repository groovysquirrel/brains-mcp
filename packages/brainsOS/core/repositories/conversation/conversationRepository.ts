import { Resource } from "sst";
import { baseRepository } from '../base/baseRepository';
import { Message } from './conversationTypes';

/**
 * Represents the structure of conversation data stored in the repository
 */
interface ConversationData {
  messages: Message[];
  metadata?: {
    createdAt: string;
    updatedAt: string;
    [key: string]: any;
  };
}

class ConversationRepository extends baseRepository<ConversationData> {
  // Required by baseRepository
  protected namespace = 'conversation';
  protected typeName = 'transactions';
  protected tableName: string;

  // Singleton instances cache
  private static instances: Record<string, ConversationRepository> = {};

  private constructor(storageType: 'user' | 'system' = 'user') {
    super();
    this.tableName = storageType === 'user' ? Resource.userData.name : Resource.systemData.name;
  }

  static getInstance(storageType: 'user' | 'system' = 'user'): ConversationRepository {
    const key = storageType;
    if (!this.instances[key]) {
      this.instances[key] = new ConversationRepository(storageType);
    }
    return this.instances[key];
  }

  /**
   * Formats the DynamoDB key for a conversation
   */
  private getConversationKey(conversationId: string): string {
    return `${this.typeName}#${this.namespace}#${conversationId}`;
  }

  /**
   * Required by baseRepository - gets conversation data
   */
  async get(userId: string, conversationId: string): Promise<ConversationData | null> {
    return this.getData(userId, this.getConversationKey(conversationId));
  }

  /**
   * Required by baseRepository - sets conversation data
   */
  async set(userId: string, conversationId: string, data: ConversationData): Promise<void> {
    const now = new Date().toISOString();
    const updatedData = {
      ...data,
      metadata: {
        ...data.metadata,
        updatedAt: now,
        createdAt: data.metadata?.createdAt || now
      }
    };
    
    await this.setData(
      userId, 
      this.getConversationKey(conversationId), 
      updatedData
    );
  }

  /**
   * Retrieves the conversation history for a specific user and conversation
   */
  async getConversationHistory(userId: string, conversationId: string): Promise<Message[]> {
    const data = await this.get(userId, conversationId);
    return data?.messages || [];
  }

  /**
   * Adds a user message and AI response to the conversation history
   */
  async addToConversation(
    userId: string, 
    conversationId: string, 
    userMessage: string, 
    assistantMessage: string
  ): Promise<void> {
    // Get existing messages or initialize empty array
    const data = await this.get(userId, conversationId) || { 
      messages: [],
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };
    
    // Add both messages with timestamps
    const now = new Date().toISOString();
    data.messages.push(
      {
        role: 'user',
        content: userMessage,
        timestamp: now
      },
      {
        role: 'assistant',
        content: assistantMessage,
        timestamp: now
      }
    );

    // Update the conversation
    await this.set(userId, conversationId, data);
  }
}

/**
 * Type definition for the repository interface that consumers will use
 */
export interface IConversationRepository {
  getConversationHistory(userId: string, conversationId: string): Promise<Message[]>;
  addToConversation(
    userId: string, 
    conversationId: string, 
    userMessage: string, 
    assistantMessage: string
  ): Promise<void>;
}

/**
 * Export a properly typed repository factory
 */
export const conversationRepository = {
  getInstance: (storageType: 'user' | 'system' = 'user'): IConversationRepository => 
    ConversationRepository.getInstance(storageType)
};