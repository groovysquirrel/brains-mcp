/**
 * Database schema definition for transactions
 * 
 * This file defines the schema for the transactions table which stores
 * all financial transactions related to LLM usage.
 */

// Table name for transactions
export const TRANSACTIONS_TABLE = 'llm_financial_transactions';

// SQL query to create the transactions table
export const createTransactionsTableQuery = `
  CREATE TABLE IF NOT EXISTS ${TRANSACTIONS_TABLE} (
    id SERIAL PRIMARY KEY,
    transaction_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    organization_id VARCHAR(255),
    transaction_type VARCHAR(50) NOT NULL,
    amount NUMERIC(10, 6) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    tokens_in INTEGER DEFAULT 0,
    tokens_out INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    model_id VARCHAR(255) NOT NULL,
    provider VARCHAR(255) NOT NULL,
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    transaction_date TIMESTAMP NOT NULL,
    billing_period VARCHAR(50),
    pricing_tier VARCHAR(50),
    cost_center VARCHAR(100),
    invoice_id VARCHAR(255),
    payment_status VARCHAR(50) DEFAULT 'PENDING',
    
    -- Indexes for common queries
    CONSTRAINT unique_transaction_id UNIQUE (transaction_id)
  );
  
  -- Create indexes for common query patterns
  CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON ${TRANSACTIONS_TABLE}(user_id);
  CREATE INDEX IF NOT EXISTS idx_transactions_organization_id ON ${TRANSACTIONS_TABLE}(organization_id);
  CREATE INDEX IF NOT EXISTS idx_transactions_transaction_date ON ${TRANSACTIONS_TABLE}(transaction_date);
  CREATE INDEX IF NOT EXISTS idx_transactions_model_id ON ${TRANSACTIONS_TABLE}(model_id);
  CREATE INDEX IF NOT EXISTS idx_transactions_provider ON ${TRANSACTIONS_TABLE}(provider);
  CREATE INDEX IF NOT EXISTS idx_transactions_payment_status ON ${TRANSACTIONS_TABLE}(payment_status);
`;

// Balance table to track user and organization balances
export const BALANCES_TABLE = 'llm_financial_balances';

// SQL query to create the balances table
export const createBalancesTableQuery = `
  CREATE TABLE IF NOT EXISTS ${BALANCES_TABLE} (
    id SERIAL PRIMARY KEY,
    entity_id VARCHAR(255) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    current_balance NUMERIC(12, 6) NOT NULL DEFAULT 0,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_spent NUMERIC(12, 6) NOT NULL DEFAULT 0,
    credit_limit NUMERIC(12, 6),
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    metadata JSONB,
    
    -- Constraint to ensure unique entity entries
    CONSTRAINT unique_entity UNIQUE (entity_id, entity_type, currency)
  );
  
  -- Create indexes for querying balances
  CREATE INDEX IF NOT EXISTS idx_balances_entity_id ON ${BALANCES_TABLE}(entity_id);
  CREATE INDEX IF NOT EXISTS idx_balances_entity_type ON ${BALANCES_TABLE}(entity_type);
  CREATE INDEX IF NOT EXISTS idx_balances_status ON ${BALANCES_TABLE}(status);
`;

// Quota table to manage usage limits
export const QUOTAS_TABLE = 'llm_usage_quotas';

// SQL query to create the quotas table
export const createQuotasTableQuery = `
  CREATE TABLE IF NOT EXISTS ${QUOTAS_TABLE} (
    id SERIAL PRIMARY KEY,
    entity_id VARCHAR(255) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    quota_type VARCHAR(50) NOT NULL,
    limit_value NUMERIC(12, 6) NOT NULL,
    current_usage NUMERIC(12, 6) NOT NULL DEFAULT 0,
    reset_period VARCHAR(50),
    next_reset TIMESTAMP,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB,
    
    -- Constraint to ensure unique quota types per entity
    CONSTRAINT unique_quota UNIQUE (entity_id, entity_type, quota_type)
  );
  
  -- Create indexes for querying quotas
  CREATE INDEX IF NOT EXISTS idx_quotas_entity_id ON ${QUOTAS_TABLE}(entity_id);
  CREATE INDEX IF NOT EXISTS idx_quotas_entity_type ON ${QUOTAS_TABLE}(entity_type);
  CREATE INDEX IF NOT EXISTS idx_quotas_status ON ${QUOTAS_TABLE}(status);
`;

// Export all table creation queries for easy initialization
export const allTableQueries = [
  createTransactionsTableQuery,
  createBalancesTableQuery,
  createQuotasTableQuery
];
