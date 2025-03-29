export class PromptServiceError extends Error {
  constructor(
    message: string,
    public details: {
      code: string;
      service: string;
      statusCode: number;
      [key: string]: any;
    }
  ) {
    super(message);
    this.name = 'PromptServiceError';
  }
}

export const ErrorCodes = {
  INVALID_PROMPT_TYPE: 'INVALID_PROMPT_TYPE',
  MISSING_PAYLOAD: 'MISSING_PAYLOAD',
  INVALID_MODEL: 'INVALID_MODEL',
  INVOCATION_ERROR: 'INVOCATION_ERROR',
} as const;
