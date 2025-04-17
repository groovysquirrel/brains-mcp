export interface Transformer {
  id?: string;
  objectType: string;
  fromView: string;
  toView: string;
  description?: string;
  tags?: string[];
  transformerDetails: TransformerDetails;
}

// New interface for transformer details
export interface TransformerDetails {
  type: string;
  language: string;
  customizable: boolean;
  name?: string;  // Made optional since it's not used in defaults
}

// Keep existing types
export interface TransformRequest {
  objectType: string;
  fromView: string;
  toView: string;
  content: any;
}

export interface TransformResponse {
  success: boolean;
  data?: any;
  metadata: {
    processingTimeMs: number;
    objectType: string;
    fromView: string;
    toView: string;
    initialData: any;
    timestamp: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export type TransformerTransformCallback<TContent, TResult> = (
  content: TContent,
  fromView: string,
  toView: string
) => Promise<TResult>;

export interface ITransformer<TContent = any, TResult = any> {
  transform: TransformerTransformCallback<TContent, TResult>;
  getSupportedViews(): string[];
}

export interface TransformErrorDetails {
  errorCode: string;
  errorMessage: string;
  additionalInfo?: string;
}

export class TransformError extends Error {
  details: TransformErrorDetails;
  
  constructor(details: TransformErrorDetails) {
    super(details.errorMessage);
    this.details = details;
    this.name = 'TransformError';
  }
}

export abstract class BaseTransformer<TContent = any, TResult = any> implements ITransformer<TContent, TResult> {
  protected abstract supportedViews: string[];

  protected validateViews(fromView: string, toView: string): void {
    if (!this.supportedViews.includes(fromView) || !this.supportedViews.includes(toView)) {
      throw new TransformError({
        errorCode: 'UNSUPPORTED_VIEW',
        errorMessage: `Transformation from ${fromView} to ${toView} is not supported`,
        additionalInfo: `Supported views are: ${this.supportedViews.join(', ')}`
      });
    }
  }

  abstract transform(content: TContent, fromView: string, toView: string): Promise<TResult>;

  getSupportedViews(): string[] {
    return this.supportedViews;
  }
} 