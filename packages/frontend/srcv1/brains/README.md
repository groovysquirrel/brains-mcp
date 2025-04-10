# Flow Editor Architecture

A React-based flow editor for creating and managing AI prompt chains. The system uses a modular architecture with a core node system that provides consistent behavior, styling, and interactions across all node types.

## Directory Structure
```
brains/
├── components/           # Shared components
│   ├── FlowCanvas.tsx   # ReactFlow canvas wrapper
│   ├── FlowEditor.tsx   # Main editor component
│   ├── NodeMenu.tsx     # Flow control menu
│   ├── editors/         # Reusable editors
│   │   ├── NameEditor.tsx
│   │   └── VersionEditor.tsx
│   └── SaveLoad/        # Save/Load functionality
│       ├── LoadFlowModal.tsx
│       └── NewFlowModal.tsx
│
├── containers/          # Container components
│   └── FlowContainer.tsx  # Top-level container
│
├── core/               # Core architecture
│   ├── CoreNode.tsx   # Base node component
│   ├── CoreHeader.tsx # Node header component
│   ├── NodeFactory.ts # Node creation and validation
│   └── FlowController.ts # Flow execution logic
│
├── nodes/              # Node implementations
│   ├── input/         # Input node
│   ├── prompt/        # Prompt node
│   └── output/        # Output node
│
└── types/             # Type definitions
    └── types.ts       # Shared types
```

### CoreNode (`core/CoreNode.tsx`)
The foundation of all node types, providing:
- Unified header structure with:
  - Status indicator
  - Editable node name (with overlay editing mode)
  - Custom action area (model selectors, buttons)
  - Core controls (collapse/delete)
- Collapsible content area
- Resize functionality
- Handle management
- Consistent styling and interactions

### NodeFactory
Handles node creation with:
- Type-safe node generation
- Default configurations
- Handle setup
- Validation rules

### FlowController
Manages flow execution:
- Node chaining
- Validation
- Cycle detection
- Context management

### CSS Variables
Core styling uses CSS variables for consistency:
```css
:root {
  /* Typography */
  --font-size-xs: 11px;
  --font-size-sm: 12px;
  --font-size-base: 14px;
  
  /* Component Sizes */
  --header-height: 28px;
  --control-button-size: 16px;
  
  /* Colors */
  --color-border: #E2E8F0;
  --color-background: white;
  --color-text: #2D3748;
  /* ... and more */
}
```

### Component-Specific Styling
- `CoreNode.css`: Base node styling and interactions
- Node-specific CSS files (e.g., `PromptNode.css`) for type-specific styling
- Shared components (e.g., `NameEditor.css`) for reusable UI elements

## Key Features

### Node Interactions
- Double-click node name to edit
- Collapse/expand nodes
- Resize nodes (visible on selection)
- Drag to reposition
- Connect nodes via handles

### Header Components
- Status indicator showing node state (idle/running/complete/error)
- Editable name with overlay editor
- Type-specific actions (e.g., model selector for PromptNode)
- Core controls (collapse/delete)

### Content Area
- Collapsible with smooth transitions
- Type-specific content (e.g., Monaco editor for PromptNode)
- Maintains state during collapse

## State Management
- Node state in FlowEditor
- Flow data in FlowContainer
- Execution context in FlowController
- Version control in NodeMenu

## Usage Example

```typescript
import { FlowContainer } from './containers/FlowContainer';

const App = () => {
  const handleExecute = (result) => {
    console.log('Flow execution result:', result);
  };

  const handleSave = async (flowData) => {
    // Save flow data
  };

  return (
    <FlowContainer
      onExecute={handleExecute}
      onSave={handleSave}
    />
  );
};
```

## Development Guidelines

### Creating New Node Types
1. Extend `CoreNode` component
2. Implement node-specific header actions
3. Create content area components
4. Add type-specific styling
5. Maintain consistent interaction patterns

### Styling Principles
1. Use CSS variables for consistency
2. Maintain clear component hierarchy in CSS
3. Keep node-specific styles separate
4. Follow established patterns for interactions

### Best Practices
- Use the `CoreNode` component for all node types
- Maintain consistent header structure
- Follow established patterns for interactions
- Keep styling modular and maintainable

## Current Status
- Core UI components are stable and working
- Node interactions (collapse, resize, edit) are functional
- Basic node types (Prompt) are implemented
- Styling system is established and consistent

## Next Steps
- Implement remaining node types
- Add flow execution logic
- Enhance error handling
- Add save/load functionality
- Implement version control

The system uses TypeScript for type safety:
- Strict node type checking
- Validated connections
- Type-safe execution context
- Interface compliance

```typescript
const PromptNode: React.FC<NodeProps<PromptNodeData>> = (props) => {
  const headerActions = (
    <div className="prompt-node__header-actions">
      <ModelSelector />
      <ExecuteButton />
    </div>
  );

- CSS modules for component styles
- Shared base styles
- ReactFlow customization
- Responsive design patterns

## Error Handling

- Validation at multiple levels
- User-friendly error messages
- Recovery mechanisms
- Debug information

## Performance

- Optimized rendering
- Efficient state updates
- Lazy loading where appropriate
- Memoization of expensive operations
