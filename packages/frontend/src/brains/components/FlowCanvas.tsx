import React, { useCallback } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap,
  OnMove,
  Edge,
  
  ConnectionMode,
  MarkerType,
  BaseEdge,
  getBezierPath,
  useReactFlow,
  Viewport,
} from 'reactflow';
import { FlowCanvasProps, CustomEdgeProps } from '../types';
import 'reactflow/dist/style.css';
import './FlowCanvas.css';
// Simplified custom edge component
const ButtonEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  selected,
}: CustomEdgeProps) => {
  const { setEdges } = useReactFlow();
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <g>
      <BaseEdge 
        path={edgePath} 
        markerEnd={markerEnd} 
        style={{
          ...style,
          cursor: 'pointer',
          stroke: selected ? '#3182ce' : style.stroke,
          strokeWidth: selected ? 3 : 2,
          strokeDasharray: selected ? '5' : 'none',
          animation: selected ? 'flow 1s linear infinite' : 'none',
          filter: selected ? 'drop-shadow(0 0 2px rgba(49, 130, 206, 0.4))' : 'none',
        }} 
      />
      {selected && (
        <g
          transform={`translate(${labelX - 10} ${labelY - 10})`}
          onClick={(event) => {
            event.stopPropagation();
            setEdges((edges) => edges.filter((edge) => edge.id !== id));
          }}
          className="edge-button-group"
        >
          <circle
            r="10"
            fill="#f56565"
            stroke="white"
            strokeWidth="2"
            className="edge-button"
          />
          <text
            x="0"
            y="0"
            textAnchor="middle"
            alignmentBaseline="middle"
            fill="white"
            fontSize="12"
            fontWeight="bold"
          >
            ×
          </text>
        </g>
      )}
    </g>
  );
};

// Simplified edge options
const defaultEdgeOptions = {
  type: 'buttonedge',
  animated: false,
  style: {
    strokeWidth: 2,
    stroke: '#64748b',
  },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 20,
    height: 20,
    color: '#64748b',
  },
};

const edgeTypes = {
  buttonedge: ButtonEdge,
};

export const FlowCanvas: React.FC<FlowCanvasProps & {
  viewport: Viewport;
}> = ({
  nodes,
  edges,
  nodeTypes,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onViewportChange,
  onEdgeDelete,
  viewport
}) => {
  // Handle viewport changes properly
  const handleMoveEnd: OnMove = (_, viewport) => {
    onViewportChange(viewport);
  };

  const handleEdgesDelete = useCallback((edges: Edge[]) => {
    edges.forEach(edge => onEdgeDelete(edge.id));
  }, [onEdgeDelete]);

  return (
    <div className="flow-canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onMoveEnd={handleMoveEnd}
        defaultViewport={viewport}
        fitView={!viewport || (viewport.x === 0 && viewport.y === 0 && viewport.zoom === 1)}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionMode={ConnectionMode.Loose}
        edgeTypes={edgeTypes}
        onEdgesDelete={handleEdgesDelete}
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}; 