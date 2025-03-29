# Brains OS Frontend

A React-based flow editor for building and managing AI workflows.

## Core Architecture

### Flow System

The flow system is built on React Flow and consists of these key components:

```
src/brains/
├── components/
│   ├── FlowManager.tsx    # Top-level flow management
│   ├── FlowEditor.tsx     # Flow editing and operations
│   ├── FlowCanvas.tsx     # Flow visualization
│   ├── FlowMenu.tsx       # Flow load and save menu
│   └── buttons/           # Reusable UI components
├── nodes/
│   └── core/
│       ├── CoreNode.tsx   # Base node implementation
│       └── CoreNode.css   # Node styling
├── core/
│   └── NodeFactory.ts     # Node creation and management
└── types/
    └── types.ts          # Type definitions
```

### Core Components

#### FlowManager
- Top-level component managing multiple flows
- Handles:
  - Flow selection and switching
  - Version management
  - Flow metadata
  - Flow persistence
  - Error boundaries

#### FlowEditor
- Main orchestrator for individual flows
- Manages node/edge state
- Handles flow operations (add, remove, update)
- Validates connections and prevents cycles

#### FlowCanvas
- Renders the flow visualization
- Manages node interactions
- Custom edge implementation with delete functionality
- Handles viewport and minimap

#### FlowMenu
- Flow-level controls
- Version management UI
- Save/Load operations
- Flow renaming

#### CoreNode
- Base node implementation used by all node types
- Features:
  - Collapsible content
  - Resizable dimensions
  - Status indicators
  - Input/Output handles
  - Name editing
  - Delete functionality

### Node Types

All nodes extend the CoreNode base implementation:
- Input Node: Entry point for data
- Prompt Node: AI model interaction
- Output Node: Data output/visualization
- Data Node: Data transformation/storage

### Edge System

Custom edge implementation featuring:
- Bezier curve paths
- Animated selection state
- Delete functionality
- Validation rules:
  - No self-connections
  - No multiple inputs to same node
  - No cycles

### Type System

Strong TypeScript implementation with:
- Node type definitions
- Edge customization
- Flow state management
- Event handling

## Usage

### Creating a New Node

```typescript
import { NodeFactory } from '../core/NodeFactory';

const newNode = NodeFactory.createNode(
  'prompt',           // Node type
  'unique-id',        // Node ID
  { x: 100, y: 100 } // Position
);
```

### Node Interaction

```typescript
// Update node data
onNodeUpdate(nodeId, {
  content: 'New content',
  status: 'running'
});

// Remove node
onNodeRemove(nodeId);
```

### Edge Management

```typescript
// Add edge
onConnect({
  source: 'sourceNodeId',
  target: 'targetNodeId'
});

// Remove edge
onEdgeDelete(edgeId);
```

## Styling

The system uses a combination of:
- CSS Variables for theming
- CSS Modules for component isolation
- Inline styles for dynamic properties

Key style variables:
```css
.react-flow {
  --node-border: 1px solid #EDEDED;
  --node-shadow: 0px 3.54px 4.55px 0px rgba(0, 0, 0, 0.1);
  --node-radius: 8px;
}
```

## Development

### Adding New Node Types

1. Create new node component extending CoreNode
2. Register in NodeFactory
3. Add type definitions
4. Implement specific functionality

### Customizing Edges

Edge appearance and behavior can be customized in:
- FlowCanvas.tsx (edge component)
- FlowCanvas.css (edge styling)
