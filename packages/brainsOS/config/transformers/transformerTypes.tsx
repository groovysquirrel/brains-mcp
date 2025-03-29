export interface TransformRequest {
  transformer: string;
  from_type: string;
  to_type: string;
  content: any;
}

export interface TransformResponse {
  success: boolean;
  data?: any;
  metadata: {
    processingTimeMs: number;
    transformer: string;
    from_type: string;
    to_type: string;
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
  from_type: string,
  to_type: string
) => Promise<TResult>;

export interface Transformer<TContent = any, TResult = any> {
  transform: TransformerTransformCallback<TContent, TResult>;
  getSupportedTypes(): string[];
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

export abstract class BaseTransformer<TContent = any, TResult = any> implements Transformer<TContent, TResult> {
  protected abstract supportedTypes: string[];

  protected validateTypes(from_type: string, to_type: string): void {
    if (!this.supportedTypes.includes(from_type) || !this.supportedTypes.includes(to_type)) {
      throw new TransformError({
        errorCode: 'UNSUPPORTED_TYPE',
        errorMessage: `Transformation from ${from_type} to ${to_type} is not supported`,
        additionalInfo: `Supported types are: ${this.supportedTypes.join(', ')}`
      });
    }
  }

  abstract transform(content: TContent, from_type: string, to_type: string): Promise<TResult>;

  getSupportedTypes(): string[] {
    return this.supportedTypes;
  }
}
