import React, { useCallback, memo } from 'react';
import { NodeProps } from 'reactflow';
import MonacoEditor from '@monaco-editor/react';
import { Play } from 'react-bootstrap-icons';
import { CoreNode } from '../../core/CoreNode';
//import './InputNode.css';

// Memoized Monaco Editor component
const Editor = memo(({ content, onChange }: { content: string; onChange: (value: string | undefined) => void }) => (
  <MonacoEditor
    height="100%"
    defaultLanguage="markdown"
    value={content}
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

const InputNode: React.FC<NodeProps> = (props) => {
  const { id, data } = props;

  // Handle content changes
  const handleContentChange = useCallback((value: string | undefined) => {
    const newContent = value || '';
    // Update the core node state
    data.onUpdate(id, { content: newContent });
    // Also notify any specific content handlers
    data.onContentChange?.(newContent);
  }, [id, data]);

  // Handle execution
  const handleExecute = useCallback(() => {
    data.onExecute?.(id, data.content || '');
  }, [id, data]);

  // Custom header actions
  const headerActions = (
    <button 
      className="input-node__execute-button"
      onClick={handleExecute}
      disabled={data.status === 'running'}
    >
      <Play size={12} />
      Run
    </button>
  );

  // Always render the editor, let CoreNode handle visibility
  const nodeContent = (
    <div className="input-node__content">
      <Editor content={data.content} onChange={handleContentChange} />
    </div>
  );

  return (
    <CoreNode
      {...props}
      type="input"
      headerActions={headerActions}
      onUpdate={data.onUpdate}
      onRemove={data.onRemove}
    >
      {nodeContent}
    </CoreNode>
  );
};

export default memo(InputNode);
