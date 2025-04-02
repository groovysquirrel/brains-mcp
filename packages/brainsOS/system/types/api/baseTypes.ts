import { TokenUsage, ComponentUsage } from '../usageTypes';

export interface BaseResponse {
  success: boolean;
  data?: any;
  metadata: {
    requestId?: string;
    processingTimeMs?: number;
    timestamp?: string;
    [key: string]: any;
  };
  error?: ErrorDetails;
}

export interface ErrorDetails {
  code: string;
  message: string;
  details?: {
    code: string;
    service: string;
    statusCode: number;
    [key: string]: any;
  };
}

export interface CommandResultResponse extends BaseResponse {
  success: boolean;
  count?: number;
  items?: any[];
  data?: any;
  metadata: {
    requestId?: string;
    processingTimeMs?: number;
    timestamp?: string;
    [key: string]: any;
  };
  error?: ErrorDetails;
}

export interface AwsApiResponse {
  statusCode: number;
  headers: {
    "Content-Type": string;
    "Access-Control-Allow-Origin": string;
    [key: string]: string;
  };
  body: string;
} 

export interface ModelDebugInfo {
    name: string;
    source: string;
    vendor: string;
}

export interface ComponentDebugInfo {
    builder: string;
    type: string;
    interaction: string;
}

export interface UsageInfo {
    total: TokenUsage;
    components: ComponentUsage[];
}