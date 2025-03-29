export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  metadata: ResponseMetadata;
  error?: ErrorDetails;
}

export interface ResponseMetadata {
  requestId: string;
  processingTimeMs: number;
  timestamp: string;
  [key: string]: any;
}

export interface ErrorDetails {
  code: string;
  message: string;
  details?: Record<string, any>;
}