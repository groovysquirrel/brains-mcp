/**
 * Money Manager Module
 * 
 * This module is responsible for:
 * 1. Processing LLM usage metrics
 * 2. Calculating costs based on token usage
 * 3. Recording financial transactions
 * 4. Managing user/org quotas and balances
 * 5. Providing financial reporting and status
 */

import { Client } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { 
  TRANSACTIONS_TABLE, 
  BALANCES_TABLE, 
  QUOTAS_TABLE,
  allTableQueries 
} from '../config/database/transactions';

// Logger interface to match the system's logger
interface Logger {
  info: (message: string, meta?: any) => void;
  error: (message: string, meta?: any) => void;
  warn: (message: string, meta?: any) => void;
  debug: (message: string, meta?: any) => void;
}

// Default pricing (placeholder until we implement proper pricing tiers)
const DEFAULT_PRICING = {
  'anthropic.claude-3-sonnet-20240229-v1:0': {
    inputTokenPrice: 0.000003, // $3 per million tokens
    outputTokenPrice: 0.000015, // $15 per million tokens
    currency: 'USD'
  },
  'anthropic.claude-3-opus-20240229-v1:0': {
    inputTokenPrice: 0.000015, // $15 per million tokens
    outputTokenPrice: 0.000075, // $75 per million tokens
    currency: 'USD'
  },
  'meta.llama3-70b-8192': {
    inputTokenPrice: 0.000002, // $2 per million tokens
    outputTokenPrice: 0.000006, // $6 per million tokens
    currency: 'USD'
  },
  // Default fallback pricing
  'default': {
    inputTokenPrice: 0.000005, // $5 per million tokens
    outputTokenPrice: 0.000005, // $5 per million tokens
    currency: 'USD'
  }
};

// Interface for usage metrics data
export interface UsageMetrics {
  userId: string;
  requestId: string;
  conversationId?: string;
  modelId: string;
  provider: string;
  tokensIn?: number;
  tokensOut?: number;
  startTime: string | Date;
  endTime: string | Date;
  duration: number;
  source: string;
  success: boolean;
  error?: string;
  metadata?: any;
}

// Interface for transaction data
export interface Transaction {
  transactionId: string;
  userId: string;
  organizationId?: string;
  transactionType: 'CHARGE' | 'CREDIT' | 'REFUND' | 'ADJUSTMENT';
  amount: number;
  currency: string;
  tokensIn: number;
  tokensOut: number;
  totalTokens: number;
  modelId: string;
  provider: string;
  description?: string;
  metadata?: any;
  transactionDate: Date;
  billingPeriod?: string;
  pricingTier?: string;
}

// Interface for user status response
export interface UserStatusResponse {
  userId: string;
  organizationId?: string;
  currentBalance?: number;
  currency?: string;
  totalSpent?: number;
  tokensUsed?: {
    input: number;
    output: number;
    total: number;
  };
  quotaStatus?: {
    [quotaType: string]: {
      limit: number;
      used: number;
      remaining: number;
      resetDate?: string;
    }
  };
  billingCycle?: {
    current: string;
    nextReset?: string;
  };
}

// Money Manager configuration
interface MoneyManagerConfig {
  dbConfig?: {
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database?: string;
  };
  logger?: Logger;
}

/**
 * MoneyManager class handles all financial aspects of LLM usage
 */
export class MoneyManager {
  private dbClient: Client | null = null;
  private logger: Logger;
  private initialized: boolean = false;
  
  /**
   * Constructor
   * @param config - Configuration options
   */
  constructor(private config: MoneyManagerConfig = {}) {
    // Set up default logger if none provided
    this.logger = config.logger || {
      info: (message: string, meta?: any) => console.log(`[INFO] ${message}`, meta || ''),
      error: (message: string, meta?: any) => console.error(`[ERROR] ${message}`, meta || ''),
      warn: (message: string, meta?: any) => console.warn(`[WARN] ${message}`, meta || ''),
      debug: (message: string, meta?: any) => console.debug(`[DEBUG] ${message}`, meta || '')
    };
  }
  
  /**
   * Initialize the Money Manager
   * @param dbCredentials - Database credentials (optional if provided in constructor)
   */
  public async initialize(dbCredentials?: any): Promise<void> {
    try {
      this.logger.info('Initializing Money Manager');
      
      // Connect to database
      await this.connectToDatabase(dbCredentials);
      
      // Ensure all required tables exist
      await this.ensureTablesExist();
      
      this.initialized = true;
      this.logger.info('Money Manager initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Money Manager', { error });
      throw error;
    }
  }
  
  /**
   * Connect to the PostgreSQL database
   * @param dbCredentials - Database credentials
   */
  private async connectToDatabase(dbCredentials?: any): Promise<void> {
    try {
      // Use credentials from config or parameters
      const credentials = dbCredentials || this.config.dbConfig;
      
      this.dbClient = new Client({
        user: credentials?.user,
        password: credentials?.password,
        database: credentials?.database,
        host: credentials?.host,
        port: credentials?.port,
        ssl: { rejectUnauthorized: false }
      });
      
      await this.dbClient.connect();
      this.logger.info('Connected to database');
    } catch (error) {
      this.logger.error('Failed to connect to database', { error });
      throw error;
    }
  }
  
  /**
   * Ensure all required database tables exist
   */
  private async ensureTablesExist(): Promise<void> {
    if (!this.dbClient) {
      throw new Error('Database client not initialized');
    }
    
    try {
      // Execute all table creation queries
      for (const query of allTableQueries) {
        await this.dbClient.query(query);
      }
      
      this.logger.info('Database tables verified/created');
    } catch (error) {
      this.logger.error('Failed to ensure tables exist', { error });
      throw error;
    }
  }
  
  /**
   * Process usage metrics and record transaction
   * @param metrics - Usage metrics data
   * @returns Transaction record
   */
  public async processUsageMetrics(metrics: UsageMetrics): Promise<Transaction> {
    if (!this.initialized || !this.dbClient) {
      throw new Error('Money Manager not initialized');
    }
    
    try {
      this.logger.info('Processing usage metrics', {
        userId: metrics.userId,
        requestId: metrics.requestId,
        modelId: metrics.modelId
      });
      
      // Calculate cost based on token usage
      const cost = this.calculateCost(metrics);
      
      // Create transaction record
      const transaction: Transaction = {
        transactionId: uuidv4(),
        userId: metrics.userId,
        organizationId: metrics.metadata?.organizationId,
        transactionType: 'CHARGE',
        amount: cost.totalCost,
        currency: cost.currency,
        tokensIn: metrics.tokensIn || 0,
        tokensOut: metrics.tokensOut || 0,
        totalTokens: (metrics.tokensIn || 0) + (metrics.tokensOut || 0),
        modelId: metrics.modelId,
        provider: metrics.provider,
        description: `LLM API usage: ${metrics.modelId}`,
        metadata: {
          ...metrics.metadata,
          requestId: metrics.requestId,
          conversationId: metrics.conversationId,
          source: metrics.source
        },
        transactionDate: new Date()
      };
      
      // Record transaction in database
      await this.recordTransaction(transaction);
      
      // Update user balance
      await this.updateBalance(transaction);
      
      return transaction;
    } catch (error) {
      this.logger.error('Failed to process usage metrics', { error, metrics });
      throw error;
    }
  }
  
  /**
   * Calculate cost based on token usage and model pricing
   * @param metrics - Usage metrics
   * @returns Calculated cost information
   */
  private calculateCost(metrics: UsageMetrics): {
    inputCost: number;
    outputCost: number;
    totalCost: number;
    currency: string;
  } {
    // Get pricing for the specific model or use default
    const pricing = DEFAULT_PRICING[metrics.modelId] || DEFAULT_PRICING['default'];
    
    // Calculate costs
    const tokensIn = metrics.tokensIn || 0;
    const tokensOut = metrics.tokensOut || 0;
    
    const inputCost = tokensIn * pricing.inputTokenPrice;
    const outputCost = tokensOut * pricing.outputTokenPrice;
    const totalCost = inputCost + outputCost;
    
    return {
      inputCost,
      outputCost,
      totalCost,
      currency: pricing.currency
    };
  }
  
  /**
   * Record a transaction in the database
   * @param transaction - Transaction data
   */
  private async recordTransaction(transaction: Transaction): Promise<void> {
    if (!this.dbClient) {
      throw new Error('Database client not initialized');
    }
    
    try {
      const query = `
        INSERT INTO ${TRANSACTIONS_TABLE} (
          transaction_id, user_id, organization_id, transaction_type,
          amount, currency, tokens_in, tokens_out, total_tokens,
          model_id, provider, description, metadata, transaction_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `;
      
      const values = [
        transaction.transactionId,
        transaction.userId,
        transaction.organizationId || null,
        transaction.transactionType,
        transaction.amount,
        transaction.currency,
        transaction.tokensIn,
        transaction.tokensOut,
        transaction.totalTokens,
        transaction.modelId,
        transaction.provider,
        transaction.description || null,
        transaction.metadata ? JSON.stringify(transaction.metadata) : null,
        transaction.transactionDate
      ];
      
      await this.dbClient.query(query, values);
      this.logger.debug('Transaction recorded', { transactionId: transaction.transactionId });
    } catch (error) {
      this.logger.error('Failed to record transaction', { error, transaction });
      throw error;
    }
  }
  
  /**
   * Update user or organization balance
   * @param transaction - Transaction data
   */
  private async updateBalance(transaction: Transaction): Promise<void> {
    if (!this.dbClient) {
      throw new Error('Database client not initialized');
    }
    
    try {
      // First, try to update existing balance
      const updateQuery = `
        UPDATE ${BALANCES_TABLE}
        SET 
          current_balance = current_balance - $1,
          total_spent = total_spent + $1,
          last_updated = CURRENT_TIMESTAMP
        WHERE entity_id = $2
          AND entity_type = 'USER'
          AND currency = $3
        RETURNING *
      `;
      
      const updateValues = [
        transaction.amount,
        transaction.userId,
        transaction.currency
      ];
      
      const updateResult = await this.dbClient.query(updateQuery, updateValues);
      
      // If no row was updated, create a new balance record
      if (updateResult.rowCount === 0) {
        const insertQuery = `
          INSERT INTO ${BALANCES_TABLE} (
            entity_id, entity_type, current_balance, currency, total_spent
          ) VALUES ($1, $2, $3, $4, $5)
        `;
        
        const insertValues = [
          transaction.userId,
          'USER',
          -transaction.amount, // Initial balance is negative of the first transaction
          transaction.currency,
          transaction.amount
        ];
        
        await this.dbClient.query(insertQuery, insertValues);
      }
      
      this.logger.debug('Balance updated', { userId: transaction.userId });
    } catch (error) {
      this.logger.error('Failed to update balance', { error, transaction });
      throw error;
    }
  }
  
  /**
   * Get user status including usage information
   * @param userId - User ID
   * @returns User status response
   */
  public async getUserStatus(userId: string): Promise<UserStatusResponse> {
    if (!this.initialized || !this.dbClient) {
      throw new Error('Money Manager not initialized');
    }
    
    try {
      // For now, return a placeholder indicating not fully implemented
      
      // In the future, this will query:
      // 1. Current balance from the balances table
      // 2. Total token usage from the transactions table
      // 3. Quota status from the quotas table
      // 4. Billing cycle information
      
      this.logger.info('User status requested (placeholder)', { userId });
      
      return {
        userId,
        tokensUsed: {
          input: 0,
          output: 0,
          total: 0
        },
        status: "Not fully implemented yet"
      } as any;
    } catch (error) {
      this.logger.error('Failed to get user status', { error, userId });
      throw error;
    }
  }
  
  /**
   * Close the database connection
   */
  public async close(): Promise<void> {
    if (this.dbClient) {
      await this.dbClient.end();
      this.dbClient = null;
      this.initialized = false;
      this.logger.info('Money Manager connections closed');
    }
  }
}
