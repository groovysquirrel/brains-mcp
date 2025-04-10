/**
 * Core Node Component
 * 
 * This is the base React component for all node types in the flow system.
 * It provides:
 * - Common UI structure and styling
 * - Handle management for node connections
 * - Resize and collapse functionality
 * - Status indicators and error display
 * - Independent state management
 * 
 * All specific node types (Input, Prompt, Output, Data) extend this component.
 */

import React, { useCallback, useState, useEffect, useRef } from 'react';
import { Icon } from '@blueprintjs/core';
import { NodeResizeControl, Handle, Position } from 'reactflow';
import { CoreNodeProps } from '../../types/components';
import { HandleConfig } from '../../types/flow';
import NodeName from '../../components/editors/NodeNameEditor';
import './CoreNode.css';

export const CoreNode: React.FC<CoreNodeProps> = ({
  id,
  type,
  data,
  selected,
  onUpdate,
  onRemove,
  headerActions,
  children
}) => {
  // Track internal state changes
  const [isUpdating, setIsUpdating] = useState(false);
  const [_showError, setShowError] = useState(false);
  const previousStatus = useRef(data.status);

  // Handle status changes
  useEffect(() => {
    if (data.status !== previousStatus.current) {
      console.log('🔄 CoreNode: Status changed:', {
        nodeId: id,
        from: previousStatus.current,
        to: data.status
      });

      // Show error message if status changed to error
      if (data.status === 'error' && data.error) {
        setShowError(true);
        // Auto-hide error after 5 seconds
        setTimeout(() => setShowError(false), 5000);
      }

      previousStatus.current = data.status;
    }
  }, [id, data.status, data.error]);

  // Ensure we have default dimensions if none are provided
  const defaultDimensions = {
    width: 280,
    height: type === 'output' ? 370 : type === 'data' ? 250 : 200,
    minWidth: type === 'output' ? 320 : 280,
    minHeight: type === 'output' ? 370 : type === 'data' ? 250 : 200
  };

  const [hideCustomHeader, setHideCustomHeader] = useState(false);
  const [tempDimensions, setTempDimensions] = useState(data?.dimensions || defaultDimensions);

  // Keep tempDimensions in sync with data.dimensions when they change externally
  useEffect(() => {
    if (data?.dimensions) {
      setTempDimensions(data.dimensions);
    }
  }, [data?.dimensions]);

  // Handle state updates with loading indicator
  const handleStateUpdate = useCallback(async (updates: Partial<typeof data>) => {
    setIsUpdating(true);
    try {
      await onUpdate(id, updates);
    } finally {
      setIsUpdating(false);
    }
  }, [id, onUpdate]);

  // Handle collapse toggle
  const handleCollapse = useCallback(() => {
    handleStateUpdate({ isCollapsed: !data.isCollapsed });
  }, [data.isCollapsed, handleStateUpdate]);

  // Handle delete with proper event type
  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove(id);
  }, [id, onRemove]);

  // Handle name change
  const handleNameChange = useCallback(async (newName: string) => {
    await handleStateUpdate({ label: newName });
    return { success: true };
  }, [handleStateUpdate]);

  // Handle name editor state change
  const handleEditingChange = useCallback((isEditing: boolean) => {
    setHideCustomHeader(isEditing);
  }, []);

  // Resize handlers with visual feedback
  const onResize = useCallback((_: any, { width, height }: { width: number; height: number }) => {
    if (data.isCollapsed) return;
    
    const newDimensions = {
      width: Math.max(width, data.dimensions?.minWidth || 280),
      height: Math.max(height, data.dimensions?.minHeight || 400),
      minWidth: data.dimensions?.minWidth || 280,
      minHeight: data.dimensions?.minHeight || 400
    };

    setTempDimensions(newDimensions);
  }, [data.isCollapsed, data.dimensions]);

  const onResizeStart = useCallback(() => {
    if (data.onResizeStart) {
      data.onResizeStart(id);
    }
  }, [id, data.onResizeStart]);

  const onResizeEnd = useCallback((_: any, { width, height }: { width: number; height: number }) => {
    const finalDimensions = {
      width: Math.max(width, data.dimensions?.minWidth || 280),
      height: Math.max(height, data.dimensions?.minHeight || 400),
      minWidth: data.dimensions?.minWidth || 280,
      minHeight: data.dimensions?.minHeight || 400
    };

    handleStateUpdate({ dimensions: finalDimensions });
    setTempDimensions(finalDimensions);
  }, [data.dimensions, handleStateUpdate]);

  // Get status-specific classes and styles
  const getStatusClasses = () => {
    const classes = ['core-node', `${type}-node`];
    if (data.isCollapsed) classes.push('collapsed');
    if (selected) classes.push('selected');
    if (isUpdating) classes.push('updating');
    if (data.status) classes.push(`status-${data.status}`);
    return classes.join(' ');
  };

  const contentStyle = {
    display: data.isCollapsed ? 'none' : undefined
  };

  const nodeContent = (
    <div className="core-node__content" style={contentStyle}>
      {data.status === 'error' && data.error && (
        <div className="core-node__error">
          <div className="core-node__error-title">
            <span>⚠</span> Execution Error
          </div>
          <div className="core-node__error-message">
            {data.error.message}
          </div>
          {data.error.details && (
            <div className="core-node__error-details">
              {data.error.details.code} ({data.error.details.statusCode})
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  );

  return (
    <div 
      className={getStatusClasses()}
      style={{ 
        width: tempDimensions?.width || defaultDimensions.width,
        height: tempDimensions?.height || defaultDimensions.height,
        minWidth: tempDimensions?.minWidth || defaultDimensions.minWidth,
        minHeight: tempDimensions?.minHeight || defaultDimensions.minHeight
      }}
    >
      {/* Input Handles */}
      {data.handles?.input?.map((handle: HandleConfig) => (
        <Handle
          key={handle.id}
          type="target"
          position={handle.position as Position}
          id={handle.id}
          className="input-handle"
          data-tooltip="Input"
        />
      ))}

      {/* Output Handles */}
      {data.handles?.output?.map((handle: HandleConfig) => (
        <Handle
          key={handle.id}
          type="source"
          position={handle.position as Position}
          id={handle.id}
          className="output-handle"
          data-tooltip="Output"
        />
      ))}

      {/* Resize Control */}
      {selected && !data.isCollapsed && (
        <NodeResizeControl
          minWidth={data.dimensions?.minWidth || 280}
          minHeight={data.dimensions?.minHeight || 400}
          position="bottom-right"
          onResize={onResize}
          onResizeStart={onResizeStart}
          onResizeEnd={onResizeEnd}
          className="resize-control"
          keepAspectRatio={false}
        />
      )}

      <div className="core-node__header">
        <div className={`status-indicator status-${data.status || 'idle'}`}>
          {isUpdating && <Icon icon="refresh" className="spin" />}
        </div>
        <div className="core-node__title">
          <NodeName
            id={id}
            defaultValue={data.label}
            placeholder={type}
            onNameChange={handleNameChange}
            onEditingChange={handleEditingChange}
          />
          <div className={`core-node__header-custom ${hideCustomHeader ? 'hidden' : ''}`}>
            {headerActions}
          </div>
        </div>

        <div className="core-node__header-core">
          <button 
            className="core-node__button"
            onClick={handleCollapse}
            title={data.isCollapsed ? 'Expand' : 'Collapse'}
          >
            <Icon icon={data.isCollapsed ? 'maximize' : 'minimize'} size={12} />
          </button>
          <button 
            className="core-node__button delete-button"
            onClick={handleDelete}
            title="Delete"
          >
            <Icon icon="trash" size={12} />
          </button>
        </div>
      </div>

      {nodeContent}
    </div>
  );
};
