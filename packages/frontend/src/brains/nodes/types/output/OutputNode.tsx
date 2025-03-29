import React, { memo } from 'react';
import { NodeProps } from 'reactflow';
import MonacoEditor from '@monaco-editor/react';
import { CoreNode } from '../../core/CoreNode';
import './OutputNode.css';

// Memoized Monaco Editor component
const Editor = memo(({ content }: { content: string }) => (
  <MonacoEditor
    height="100%"
    defaultLanguage="markdown"
    value={content || ''}
    theme="vs-dark"
    options={{
      minimap: { enabled: false },
      fontSize: 12,
      lineNumbers: 'off',
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      padding: { top: 8, bottom: 8 },
      readOnly: true
    }}
  />
));

const OutputNode: React.FC<NodeProps> = (props) => {
  const { data } = props;

  // Always render the editor in read-only mode
  const nodeContent = (
    <div className="output-node__content">
      <div className="output-node__editor">
        <Editor content={data.metadata?.executionResult || data.content || ''} />
      </div>
    </div>
  );

  return (
    <CoreNode
      {...props}
      type="output"
      onUpdate={data.onUpdate}
      onRemove={data.onRemove}
    >
      {nodeContent}
    </CoreNode>
  );
};

export default memo(OutputNode);
