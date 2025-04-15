import { MCPErrorResponse } from './MCPError';

export interface MCPTransformer {
  id: string;
  name: string;
  inputType: string;
  outputType: string;
  transform: (input: any) => Promise<any>;
  metadata: Record<string, any>;
}

export interface MCPTransformerResponse<T> {
  success: true;
  data: T;
  metadata: {
    requestId: string;
    processingTimeMs: number;
    timestamp: string;
  };
}

export type MCPTransformerResult<T> = MCPTransformerResponse<T> | MCPErrorResponse;

export interface MCPTransformerRequest {
  requestType: 'transformer';
  requestId: string;
  transformerId: string;
  input: any;
}

export interface MCPTransformerRegistry {
  registerTransformer(transformer: MCPTransformer): void;
  getTransformer(id: string): MCPTransformer | undefined;
  listTransformers(): MCPTransformer[];
} 