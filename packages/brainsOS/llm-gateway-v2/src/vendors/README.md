# LLM Gateway Vendors

This directory contains vendor-specific implementations for the LLM Gateway. Each vendor implementation handles the unique requirements of different LLM providers while maintaining a consistent interface.

## Implementation Pattern

Each vendor implementation follows these key principles:

1. **Abstract Base Class**: All vendors extend `AbstractVendor` which defines the core interface
2. **Configuration-Driven**: Vendor-specific settings are loaded from JSON configs
3. **Request/Response Formatting**: Each vendor handles its own message formatting
4. **Error Handling**: Consistent error handling across all vendors

## Core Methods

Every vendor implementation must implement these key methods:

```typescript
interface AbstractVendor {
  // Format the request according to vendor requirements
  formatRequest(request: GatewayRequest, modelId: string): Record<string, unknown>;
  
  // Validate the request before sending
  validateRequest(request: GatewayRequest): void;
  
  // Get default settings for the vendor
  getDefaultSettings(): Record<string, unknown>;
  
  // Get the API format for a specific model
  getApiFormat(modelId: string): string;
  
  // Format the response into a consistent structure
  formatResponse(response: unknown): { content: string; metadata?: Record<string, unknown> };
}
```

## Adding a New Vendor

To add support for a new vendor:

1. Create a new vendor class extending `AbstractVendor`:
   ```typescript
   export class NewVendor extends AbstractVendor {
     constructor(config: VendorConfig) {
       super(config);
     }
     // Implement required methods
   }
   ```

2. Add vendor configuration in `config/vendors/new-vendor.json`:
   ```json
   {
     "name": "new-vendor",
     "displayName": "New Vendor",
     "capabilities": {
       "modalities": ["text-to-text"],
       "streaming": true
     },
     "apiFormats": {
       "prompt": {
         "format": {
           "prompt": "",
           "max_tokens": 4096
         }
       }
     }
   }
   ```

3. Update provider settings to include the new vendor:
   ```json
   {
     "vendors": [
       "anthropic",
       "meta",
       "new-vendor"
     ]
   }
   ```

## Example: Meta Vendor

The Meta vendor implementation demonstrates the pattern:

```typescript
export class MetaVendor extends AbstractVendor {
  formatRequest(request: GatewayRequest, modelId: string): Record<string, unknown> {
    // Format messages according to Meta's requirements
    let prompt = formatMessages(request.messages);
    
    return {
      prompt,
      max_gen_len: request.maxTokens || defaultSettings.maxTokens,
      temperature: request.temperature || defaultSettings.temperature,
      top_p: request.topP || defaultSettings.topP
    };
  }
}
```

## Reference Implementations

For reference, see the AWS SDK examples for different vendors:
- [Meta Llama](https://github.com/awsdocs/aws-doc-sdk-examples/tree/main/dotnetv3/Bedrock-runtime/Models/MetaLlama)
- [Anthropic Claude](https://github.com/awsdocs/aws-doc-sdk-examples/tree/main/dotnetv3/Bedrock-runtime/Models/AnthropicClaude)
- [Amazon Titan](https://github.com/awsdocs/aws-doc-sdk-examples/tree/main/dotnetv3/Bedrock-runtime/Models/AmazonTitanText)

## Best Practices

1. **Message Formatting**:
   - Handle system, user, and assistant messages appropriately
   - Follow vendor-specific prompt templates
   - Support multi-turn conversations

2. **Configuration**:
   - Use vendor configs for model-specific settings
   - Support different API formats per model
   - Define capabilities clearly

3. **Error Handling**:
   - Validate requests before sending
   - Handle vendor-specific error codes
   - Provide helpful error messages

4. **Testing**:
   - Test with different message types
   - Verify response formatting
   - Test error scenarios

## Common Patterns

1. **Message Formatting**:
   ```typescript
   let prompt = '';
   if (systemMessage) prompt += `System: ${systemMessage}\n\n`;
   prompt += `Human: ${userMessage}\n\n`;
   prompt += `Assistant:`;
   ```

2. **Request Validation**:
   ```typescript
   validateRequest(request: GatewayRequest): void {
     if (!request.messages?.length) {
       throw new Error('Messages are required');
     }
   }
   ```

3. **Response Formatting**:
   ```typescript
   formatResponse(response: unknown): { content: string; metadata?: Record<string, unknown> } {
     return {
       content: response.generation,
       metadata: {
         model: response.model,
         usage: response.usage
       }
     };
   }
   ```

## Troubleshooting

Common issues and solutions:

1. **Request Format Errors**:
   - Check vendor documentation for correct parameter names
   - Verify message formatting matches vendor requirements
   - Ensure all required fields are present

2. **Response Parsing Errors**:
   - Verify response structure matches vendor documentation
   - Handle different response formats per model
   - Add proper error handling for malformed responses

3. **Configuration Issues**:
   - Check vendor config file exists and is valid
   - Verify model IDs match vendor documentation
   - Ensure capabilities are correctly defined
