import { GatewayRequest } from '../types/Request';
import { VendorConfig } from '../types/Vendor';
import { Logger } from '../utils/logging/Logger';

export abstract class AbstractVendor {
  protected config: VendorConfig;
  protected logger: Logger;

  constructor(config: VendorConfig) {
    this.config = config;
    this.logger = new Logger(`vendor-${config.name}`);
  }

  /**
   * Format a request according to vendor-specific requirements
   */
  abstract formatRequest(request: GatewayRequest, modelId: string): Record<string, unknown>;

  /**
   * Validate that a request meets vendor-specific requirements
   */
  abstract validateRequest(request: GatewayRequest): void;

  /**
   * Get vendor-specific default settings
   */
  abstract getDefaultSettings(): {
    temperature?: number;
    topP?: number;
    maxTokens?: number;
    stopSequences?: string[];
  };

  /**
   * Get the API format for a given model ID
   */
  abstract getApiFormat(modelId: string): string;

  /**
   * Format a response from the vendor's API into a standard format
   */
  abstract formatResponse(response: unknown): {
    content: string;
    metadata?: Record<string, unknown>;
  };
} 