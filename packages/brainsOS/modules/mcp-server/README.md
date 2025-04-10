# Model Context Protocol (MCP) Pattern

The Model Context Protocol (MCP) is a simple, consistent way to implement modular functions in our system. Each component (tool, resource, prompt) follows the same pattern, making it easy to add new functionality.

## Directory Structure

```
mcp/
├── tools/                    # All tool implementations
│   ├── mcpToolHandler.tsx   # Main handler for all tool requests
│   ├── mcpToolIndex.tsx     # Registry for all tools
│   └── calculator/          # Example tool implementation
│       ├── types.ts         # Tool-specific types and schema
│       └── calculator.ts    # Tool implementation
├── resources/               # Resource implementations
│   ├── mcpResourceHandler.tsx
│   ├── mcpResourceIndex.tsx
│   └── dogNames/           # Example resource
└── prompts/                 # Prompt implementations
    ├── mcpPromptHandler.tsx
    ├── mcpPromptIndex.tsx
    └── oneSentence/        # Example prompt
```

## Implementing a New Tool

### 1. Create Tool Types (`types.ts`)

Define your tool's types and schema in a `types.ts` file:

```typescript
import { MCPTool, MCPResponse, ServiceSchema } from '../../mcpTypes';

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
export const myToolSchema: ServiceSchema = {
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
      content: [{
        text: `Result of operation: ${result}`,
        data: result
      }],
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

Add your tool to the registry in `mcpToolIndex.tsx`:

```typescript
import { myTool } from './my-tool/myTool';

export class ToolsRegistry implements MCPToolRegistry<MCPTool> {
  private tools: Map<string, MCPToolDefinition<MCPTool>> = new Map();

  constructor() {
    // Register all tools
    this.registerTool(myTool);
    // TODO: Auto-scan for other tools in the directory
  }

  // Required by Registry interface
  register(tool: MCPToolDefinition<MCPTool>): void {
    this.registerTool(tool);
  }

  get(name: string): MCPToolDefinition<MCPTool> | undefined {
    return this.getTool(name);
  }

  list(): MCPToolDefinition<MCPTool>[] {
    return this.listTools();
  }

  getSchema(name: string): ServiceSchema | undefined {
    return this.getToolSchema(name);
  }

  // Required by MCPToolRegistry interface
  registerTool(tool: MCPToolDefinition<MCPTool>): void {
    this.tools.set(tool.name, tool);
  }

  getTool(name: string): MCPToolDefinition<MCPTool> | undefined {
    return this.tools.get(name);
  }

  listTools(): MCPToolDefinition<MCPTool>[] {
    return Array.from(this.tools.values());
  }

  getToolSchema(name: string): ServiceSchema | undefined {
    return this.tools.get(name)?.schema;
  }
}

// Create and export a singleton instance
export const toolsRegistry = new ToolsRegistry();
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

5. **File Extensions**
   - Use `.tsx` for files that might contain JSX or are part of the MCP system
   - Use `.ts` for pure TypeScript files (like types and utilities)

## Example Usage

```typescript
// Request
POST /latest/mcp/tools/calculator
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
  "content": [{
    "text": "Result of 5 add 3 = 8",
    "data": 8
  }],
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
     content: [{
       text: `Result of operation: ${result}`,
       data: result
     }],
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
