import { MCPErrorResponse } from '../MCPError';

/**
 * Interface for transformer parameters
 */
export interface TransformerParameters {
  [key: string]: any;
}

/**
 * Interface for transformer metadata
 */
export interface TransformerMetadata {
  requestId?: string;
  code?: string;
  statusCode?: number;
  service?: string;
  processingTimeMs: number;
  timestamp: string;
  objectType?: string;
  fromView?: string;
  toView?: string;
  transformPath?: string[];
  [key: string]: any; // Allow additional properties
}

/**
 * Interface for transformer result
 */
export interface TransformerResult {
  success: boolean;
  data?: any;
  error?: string;
  errorDetails?: string;
  metadata?: TransformerMetadata;
}

/**
 * Interface for transformer configuration
 */
export interface TransformerConfig {
  name: string;
  description: string;
  version: string;
  objectType: string;
  fromView: string;
  toView: string;
  parameters?: TransformerParameters;
}

/**
 * Interface for transformer implementation
 */
export interface Transformer {
  config: TransformerConfig;
  transform: (input: any, parameters?: TransformerParameters) => Promise<TransformerResult>;
  validate?: (input: any, parameters?: TransformerParameters) => Promise<boolean>;
}

/**
 * Interface for transformation path
 */
export interface TransformationPath {
  fromView: string;
  toView: string;
  transformer: Transformer;
}

/**
 * Interface for transformer requests
 */
export interface TransformerRequest {
  requestType: 'transformer';
  requestId: string;
  objectType: string;
  fromView: string;
  toView: string;
  input: any;
}

/**
 * Interface for transformer responses
 */
export interface TransformerResponse<T> {
  success: true;
  data: T;
  metadata: {
    requestId: string;
    processingTimeMs: number;
    timestamp: string;
  };
}

/**
 * Union type representing all possible transformer responses
 */
export type TransformerResponseResult<T> = TransformerResponse<T> | MCPErrorResponse;

/**
 * Interface for transformer registry
 */
export interface TransformerRegistry {
  registerTransformer(transformer: Transformer): Promise<void>;
  getTransformer(objectType: string, fromView: string, toView: string): Promise<Transformer | undefined>;
  findTransformationPath(objectType: string, fromView: string, toView: string): Promise<TransformationPath[]>;
  listTransformers(objectType?: string): Promise<Transformer[]>;
}

/**
 * Interface for transformer information
 */
export interface TransformerInfo {
  name: string;
  description: string;
  objectType: string;
  fromView: string;
  toView: string;
  version: string;
} 