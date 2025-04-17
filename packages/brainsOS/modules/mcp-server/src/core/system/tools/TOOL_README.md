# Tool Development Guide

This document outlines the simple pattern for creating new tools in the MCP server.

## Tool Structure

Each tool should be organized in its own directory under `built-in/tools/` with the following structure:

```
toolName/
├── types.ts     # Type definitions and schema
└── toolName.ts  # Tool implementation and registration
```

## 1. Types Definition (`types.ts`)

The `types.ts` file defines the tool's interface and schema:

```typescript
import { ToolSchema } from '../ToolTypes';

// Define parameter types
export interface ToolNameParams {
  // Tool-specific parameters
}

// Define any custom types needed
export type CustomType = 'type1' | 'type2';

// Validation functions (if needed)
export function isValidType(value: string): value is CustomType {
  return ['type1', 'type2'].includes(value);
}

// Tool schema definition
export const toolNameSchema: ToolSchema = {
  type: 'function',
  function: {
    name: 'toolName',
    description: 'Description of what the tool does',
    parameters: {
      type: 'object',
      properties: {
        // Parameter definitions
      },
      required: ['requiredParam1', 'requiredParam2']
    }
  }
};
```

## 2. Tool Implementation (`toolName.ts`)

The `toolName.ts` file contains the tool's implementation and registration:

```typescript
import { Tool, ToolHandler, ToolRepository } from '../ToolTypes';
import { ToolNameParams, toolNameSchema } from './types';

export class ToolNameHandler implements ToolHandler {
  async handle(params: ToolNameParams): Promise<any> {
    // Tool implementation
    return {
      success: true,
      data: result,
      metadata: {
        // Any additional metadata
      }
    };
  }
}

// Tool definition
export const toolNameTool: Tool = {
  name: 'toolName',
  description: 'Description of what the tool does',
  schema: toolNameSchema,
  handler: new ToolNameHandler()
};

// Registration function
export function registerToolNameTool(repository: ToolRepository): void {
  repository.registerTool(toolNameTool);
}
```

## Best Practices

1. **Type Safety**
   - Use TypeScript types for all parameters and return values
   - Provide validation functions for custom types
   - Use type guards where appropriate

2. **Error Handling**
   - Return structured responses with `success`, `data`, and `metadata`
   - Use appropriate error messages
   - Handle edge cases gracefully

3. **Documentation**
   - Include clear descriptions in the schema
   - Document complex logic in the implementation

## Example Tools

For reference, see these example tools:
- `calculator/` - Basic arithmetic operations
- `randomNumber/` - Random number generation
- `tableConverter/` - Table format conversion

## Adding a New Tool

To add a new tool:

1. Create a new directory under `built-in/tools/`
2. Create `types.ts` with your tool's type definitions and schema
3. Create `toolName.ts` with your tool's implementation and registration function
4. Import and call the registration function where needed (typically in your server initialization)
