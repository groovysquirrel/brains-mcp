# Modular Component Pattern (MCP)

The Modular Component Pattern (MCP) is a simple, consistent way to implement modular functions in our system. Each component (tool, data source, prompt) follows the same pattern, making it easy to add new functionality.

## Directory Structure

```
mcp/
├── tools/                    # All tool implementations
│   ├── mcpToolHandler.ts    # Main handler for all tool requests
│   ├── mcpToolIndex.ts      # Registry for all tools
│   └── calculator/          # Example tool implementation
│       ├── types.ts         # Tool-specific types and schema
│       └── calculator.ts    # Tool implementation
├── data/                    # Data source implementations
└── prompts/                 # Prompt implementations
```

## Implementing a New Tool

### 1. Create Tool Types (`types.ts`)

Define your tool's types and schema in a `types.ts` file:

```typescript
import { MCPTool, MCPResponse, MCPToolSchema } from '../../mcpTypes';

// Define your tool's parameters
export interface MyToolParams {
  // Your parameters here
}

// Define your tool's request type
export interface MyTool extends MCPTool {
  type: 'my-tool';
  params: MyToolParams;
}

// Define your tool's response type
export type MyToolResponse = MCPResponse<YourReturnType>;

// Define your tool's schema
export const myToolSchema: MCPToolSchema = {
  type: 'function',
  function: {
    name: 'my-tool',
    description: 'What your tool does',
    parameters: {
      // Your parameter schema
    }
  }
};

// Type guards
export function isMyTool(tool: MCPTool): tool is MyTool {
  return tool.type === 'my-tool';
}
```

### 2. Implement the Tool (`myTool.ts`)

Create your tool implementation in a single file:

```typescript
import { MCPHandler, MCPToolDefinition } from '../../mcpTypes';
import {
  MyTool,
  MyToolResponse,
  isMyTool,
  myToolSchema
} from './types';

export class MyToolHandler implements MCPHandler<MyTool, YourReturnType> {
  // Your core logic here
  private doSomething(params: MyToolParams): YourReturnType {
    // Implementation
  }

  // Handle requests
  async handle(input: MyTool): Promise<MyToolResponse> {
    // Validate input
    if (!isMyTool(input)) {
      throw new Error('Invalid parameters');
    }

    // Do your work
    const result = this.doSomething(input.params);

    // Return result
    return {
      success: true,
      data: result,
      metadata: {
        requestId: '',  // Will be set by main handler
        processingTimeMs: 0,
        timestamp: new Date().toISOString()
      }
    };
  }
}

// Export your tool
export const myTool: MCPToolDefinition<MyTool, YourReturnType> = {
  name: 'my-tool',
  description: 'What your tool does',
  schema: myToolSchema,
  handler: new MyToolHandler()
};
```

### 3. Register Your Tool

Add your tool to the registry in `mcpToolIndex.ts`:

```typescript
import { myTool } from './my-tool/myTool';

export class ToolsRegistry implements MCPRegistry<MCPTool> {
  constructor() {
    this.registerTool(myTool);
  }
  // ... rest of registry implementation
}
```

## Best Practices

1. **Keep It Simple**
   - Each tool should do one thing well
   - Focus on core logic in the tool implementation
   - Let the main handler handle common concerns

2. **Error Handling**
   - Throw errors in your tool implementation
   - The main handler will format them consistently
   - Use descriptive error messages

3. **Type Safety**
   - Define clear types for your tool
   - Use type guards to validate inputs
   - Let TypeScript help catch errors

4. **Documentation**
   - Add clear comments explaining what your tool does
   - Document parameters and return values
   - Include examples in the schema

## Example Usage

```typescript
// Request
POST /tools/calculator
{
  "type": "calculator",
  "params": {
    "operation": "add",
    "a": 5,
    "b": 3
  }
}

// Response
{
  "success": true,
  "data": 8,
  "metadata": {
    "requestId": "uuid",
    "processingTimeMs": 0,
    "timestamp": "2024-03-29T..."
  }
}
```

## Common Patterns

1. **Input Validation**
   ```typescript
   if (!isMyTool(input)) {
     throw new Error('Invalid parameters');
   }
   ```

2. **Core Logic**
   ```typescript
   private doSomething(params: MyToolParams): Result {
     // Your implementation
   }
   ```

3. **Success Response**
   ```typescript
   return {
     success: true,
     data: result,
     metadata: {
       requestId: '',  // Set by main handler
       processingTimeMs: 0,
       timestamp: new Date().toISOString()
     }
   };
   ```

4. **Error Response**
   ```typescript
   throw new Error('Descriptive error message');
   ```
