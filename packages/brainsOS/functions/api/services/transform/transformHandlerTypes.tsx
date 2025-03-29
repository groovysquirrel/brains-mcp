export interface TransformContext {
    userId: string;
    requestId: string;
    startTime: number;
    objectType: string;
    fromView: string;
    toView: string;
    initialData: string | null;
    flattenResponse: boolean;
  }
  
  export interface TransformPathParameters {
    objectType?: string;
    fromView?: string;
    toView?: string;
  }
  
  export interface TransformRequestBody {
    content: string;
  }
  
  export interface TransformErrorResponse {
    success: false;
    metadata: {
      processingTimeMs: number;
      objectType: string;
      fromView: string;
      toView: string;
      initialData: string | null;
      timestamp: string;
    };
    error: {
      code: string;
      message: string;
      additionalInfo?: string;
    };
  } 