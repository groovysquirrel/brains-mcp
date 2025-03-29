import React, { useCallback, memo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { NodeProps } from 'reactflow';
import MonacoEditor from '@monaco-editor/react';
import { ArrowsExpand, XLg } from 'react-bootstrap-icons';
import { CoreNode } from '../../core/CoreNode';
import './DataNode.css';

// Memoized Monaco Editor component
const Editor = memo(({ content, onChange }: { 
  content: string; 
  onChange: (value: string | undefined) => void 
}) => (
  <MonacoEditor
    height="100%"
    defaultLanguage="markdown"
    value={content || ''}
    onChange={onChange}
    theme="vs-dark"
    options={{
      minimap: { enabled: false },
      fontSize: 12,
      lineNumbers: 'off',
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      padding: { top: 8, bottom: 8 }
    }}
  />
));

const DataNode: React.FC<NodeProps> = (props) => {
  const { data, id } = props;
  const [isMaximized, setIsMaximized] = useState(false);
  const [localContent, setLocalContent] = useState(data.content || '');

  // Handle content changes
  const handleContentChange = useCallback((value: string | undefined) => {
    const newContent = value || '';
    setLocalContent(newContent);
    data.onUpdate(id, { content: newContent });
  }, [id, data]);

  // Update local content when parent data changes
  useEffect(() => {
    // Use execution result if available, otherwise use content
    const newContent = data.metadata?.executionResult || data.content || '';
    setLocalContent(newContent);
  }, [data.content, data.metadata?.executionResult]);

  // Toggle maximized state
  const handleMaximize = useCallback(() => {
    setIsMaximized(true);
  }, []);

  const handleMinimize = useCallback(() => {
    setIsMaximized(false);
  }, []);

  // Custom header actions
  const headerActions = (
    <button 
      className="data-node__maximize-button"
      onClick={handleMaximize}
      title="Maximize"
    >
      <ArrowsExpand size={12} />
    </button>
  );

  // Always render the editor, let CoreNode handle visibility
  const nodeContent = (
    <div className="data-node__content">
      <Editor content={localContent} onChange={handleContentChange} />
    </div>
  );

  return (
    <>
      <CoreNode
        {...props}
        type="data"
        headerActions={headerActions}
        onUpdate={data.onUpdate}
        onRemove={data.onRemove}
      >
        {nodeContent}
      </CoreNode>

      {/* Render maximized overlay using portal */}
      {isMaximized && createPortal(
        <div className="data-node__maximized-overlay">
          <div className="data-node__maximized-content">
            <div className="data-node__maximized-header">
              <span>{data.label || 'Data Node'}</span>
              <button 
                className="data-node__close-button"
                onClick={handleMinimize}
              >
                <XLg size={16} />
              </button>
            </div>
            <div className="data-node__maximized-editor">
              <Editor content={localContent} onChange={handleContentChange} />
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default memo(DataNode);
