# LLM Gateway V2

A flexible and extensible LLM Gateway implementation supporting multiple providers, vendors, and modalities.

## Features

- Support for multiple LLM providers (Bedrock, Azure, OpenAI)
- Support for multiple vendors (Anthropic, Meta, etc.)
- Support for multiple modalities (text-to-text, text-to-image, etc.)
- Configuration-driven model management
- Automatic model discovery
- Streaming support
- Provisioned/On-demand model support
- Model aliasing
- Strong type safety
- Comprehensive error handling

## Structure

```
llm-gateway-v2/
├── src/
│   ├── core/              # Core gateway logic
│   ├── registries/        # Configuration registries
│   ├── providers/         # Provider implementations
│   ├── vendors/          # Vendor-specific handling
│   ├── modalities/       # Modality implementations
│   ├── utils/            # Utilities and discovery
│   ├── types/            # Type definitions
│   └── config/           # Configuration files
```

## Configuration

The gateway uses JSON configuration files for:
- Models and their capabilities
- Provider settings
- Vendor-specific handling
- Modality definitions

Example configurations are provided in the `config` directory.

## Configuration Organization

The configuration system is organized in a provider-centric way, with a registry-based architecture for managing models, providers, and vendors.

### Directory Structure

```
config/
  bedrock/                    # Bedrock-specific configurations
    models/                   # Individual model configurations
      claude-3-sonnet.json
      claude-3-opus.json
      ...
    vendors/                  # Vendor-specific configurations
      anthropic.json
      amazon.json
      ...
    provider.json            # Bedrock provider configuration
  models.json                # Global model registry (for backward compatibility)
```

### Configuration Files

1. **Provider Configuration** (`bedrock/provider.json`):
   ```json
   {
     "name": "bedrock",
     "type": "bedrock",
     "vendorConfigs": {
       "anthropic": {
         "models": ["claude-3-sonnet", "claude-3-opus"]
       }
     }
   }
   ```

2. **Model Configuration** (`bedrock/models/claude-3-sonnet.json`):
   ```json
   {
     "modelId": "anthropic.claude-3-sonnet-20240229-v1:0",
     "provider": "bedrock",
     "vendor": "anthropic",
     "modality": "text-to-text",
     "capabilities": {
       "streaming": true,
       "inferenceTypes": {
         "onDemand": true,
         "provisioned": false,
         "streaming": true
       }
     }
   }
   ```

3. **Vendor Configuration** (`bedrock/vendors/anthropic.json`):
   ```json
   {
     "name": "anthropic",
     "models": ["claude-3-sonnet", "claude-3-opus"]
   }
   ```

## Registry System

The registry system provides a structured way to access and manage models, providers, and vendors.

### Key Components

1. **ModelRegistry**
   - Manages individual model configurations
   - Handles model aliases
   - Validates model capabilities
   - Provides model lookup by ID

2. **ProviderRegistry**
   - Manages provider configurations and instances
   - Initializes provider-specific implementations
   - Handles vendor configurations
   - Provides provider and vendor lookup

3. **VendorRegistry**
   - Manages vendor-specific configurations
   - Handles vendor-specific model capabilities
   - Provides vendor lookup

### Usage Example

```typescript
// Initialize registries
const modelRegistry = new ModelRegistry();
const providerRegistry = new ProviderRegistry();
const vendorRegistry = new VendorRegistry();

await modelRegistry.initialize(configPath);
await providerRegistry.initialize(configPath);
await vendorRegistry.initialize(configPath);

// Get a model
const model = modelRegistry.getModel('claude-3-sonnet');

// Get a provider
const provider = providerRegistry.getProvider('bedrock');

// Validate model capabilities
modelRegistry.validateModelCapabilities('claude-3-sonnet', {
  modality: 'text-to-text',
  streaming: true
});
```

## Discovery Service

The discovery service automatically detects and updates model configurations from provider APIs.

### Process

1. **Provider Discovery**
   - Queries provider APIs for available models
   - Detects model capabilities and inference types
   - Updates provider-specific configurations

2. **Configuration Update**
   - Generates provider-specific model configurations
   - Updates vendor configurations
   - Maintains registry structure
   - Preserves backward compatibility

### Running Discovery

```bash
npm run discover
```

This will:
1. Query provider APIs (currently Bedrock)
2. Generate/update configurations
3. Maintain registry structure
4. Log discovery results

## Adding New Providers

To add a new provider:

1. Create provider directory in `config/`
2. Implement provider-specific discovery
3. Update registry implementations
4. Add provider configuration

Example:
```
config/
  new-provider/
    models/
    vendors/
    provider.json
```

## Best Practices

1. **Configuration Management**
   - Keep provider-specific configurations separate
   - Use consistent naming conventions
   - Document model capabilities clearly

2. **Registry Usage**
   - Use registries for all model/provider access
   - Validate capabilities before use
   - Handle errors appropriately

3. **Discovery**
   - Run discovery after provider updates
   - Review generated configurations
   - Test with updated configurations

## Usage

```typescript
import { Gateway } from '@brainsos/llm-gateway-v2';

const gateway = new Gateway({
  configPath: './config'
});

await gateway.initialize();

const response = await gateway.chat({
  provider: 'bedrock',
  vendor: 'anthropic',
  modelId: 'claude-3',
  messages: [
    { role: 'user', content: 'Hello, how are you?' }
  ],
  modality: 'text-to-text',
  streaming: true
});
```

## Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the project:
   ```bash
   npm run build
   ```

3. Run tests:
   ```bash
   npm test
   ```

4. Lint the code:
   ```bash
   npm run lint
   ```

## License

MIT 