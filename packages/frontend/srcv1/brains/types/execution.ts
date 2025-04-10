/**
 * Execution Types
 * 
 * Types related to flow execution, results, and error handling.
 */

import { NodeStatus } from './common';

/**
 * Error Types for Flow Execution
 */
export interface ExecutionError {
  message: string;
  code: string;
  details: {
    statusCode: number;
    code: string;
    service?: string;
    operation?: string;
    modelId?: string;
    retryAfter?: string;
    vendor?: string;
  };
}

/**
 * Execution Context for Flow Controller
 */
export interface ExecutionContext {
  nodeId: string;
  inputs: { [key: string]: string };  // Map of input handle IDs to their values
  modelId?: string;
  systemPrompt?: string;
  status: NodeStatus;
  error?: ExecutionError;
  result?: string;
  metadata?: {
    startTime: number;
    endTime?: number;
    processingTimeMs?: number;
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  };
}

/**
 * Node Execution Result
 */
export interface NodeExecutionResult {
  success: boolean;
  nodeId: string;
  result?: string;
  error?: ExecutionError;
  metadata?: {
    processingTimeMs: number;
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  };
}

/**
 * Execution State
 * Represents the current state of a node during execution
 */
export interface ExecutionState {
  status: NodeStatus;
  result?: string;
  error?: ExecutionError;
  metadata?: {
    startTime: number;
    endTime?: number;
    processingTimeMs?: number;
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    waitingForInputs?: string[];
    executionResult?: string;
    executionMetadata?: any;
    lastExecutionTime?: number;
  };
}

/**
 * Execution Statistics
 */
export interface ExecutionStats {
  tokens: {
    prompt: number;
    completion: number;
    total: number;
  };
  processingTime: number;
} 