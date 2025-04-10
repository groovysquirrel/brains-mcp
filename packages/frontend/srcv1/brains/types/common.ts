/**
 * Common Types
 * 
 * Basic types and interfaces used throughout the system.
 */

/**
 * Position interface defines the location of a node
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Dimensions interface controls node sizing
 */
export interface Dimensions {
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
}

/**
 * Node execution status
 */
export type NodeStatus = 'idle' | 'waiting' | 'running' | 'complete' | 'error' | 'resetting';

/**
 * Status message for UI feedback
 */
export interface StatusMessage {
  type: 'success' | 'error' | null;
  message: string;
} 