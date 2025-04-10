import React, { useState, useCallback, useEffect, memo, useRef } from 'react';
import { NodeProps } from 'reactflow';
import MonacoEditor from '@monaco-editor/react';
import { Play } from 'react-bootstrap-icons';
import { CoreNode } from '../../core/CoreNode';
import { PromptNodeData } from '../../../types/flow';
import { LLM, LLMResponseData } from '../../../types/models';
import { get } from '@aws-amplify/api';
import './PromptNode.css';

interface PromptContent {
  modelId?: string;
  systemPrompt: string;
  input?: string;
}

// Cache for LLM data
const llmCache = {
  data: null as LLM[] | null,
  timestamp: 0,
  CACHE_DURATION: 5 * 60 * 1000 // 5 minutes
};

// Memoized Monaco Editor component
const Editor = memo(({ content, onChange }: { 
  content: string;
  onChange: (value: string | undefined) => void;
}) => {
  const debounceRef = useRef<number>();
  const handleChange = useCallback((value: string | undefined) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      onChange(value);
      debounceRef.current = undefined;
    }, 500) as unknown as number;
  }, [onChange]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <MonacoEditor
      height="100%"
      defaultLanguage="markdown"
      value={content || ''}
      onChange={handleChange}
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
  );
});

const PromptNode: React.FC<NodeProps<PromptNodeData>> = (props) => {
  const { data, id } = props;
  const content = (typeof data.content === 'object' ? data.content : {
    modelId: undefined,
    systemPrompt: '',
    input: undefined
  }) as PromptContent;
  
  const [models, setModels] = useState<LLM[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const isProcessing = data.status === 'running';

  // Fetch LLMs with caching
  const fetchModels = useCallback(async () => {
    // Check cache first
    const now = Date.now();
    if (llmCache.data && (now - llmCache.timestamp) < llmCache.CACHE_DURATION) {
      console.log('Using cached LLM data');
      setModels(llmCache.data);
      return;
    }

    setIsLoadingModels(true);
    try {
      const restOperation = get({
        apiName: "brainsOS",
        path: "/latest/resources/system/llms"
      });
      
      const response = await restOperation.response;
      const responseData = (await response.body.json() as unknown) as LLMResponseData;
      
      if (responseData?.success && Array.isArray(responseData.items)) {
        // Update cache
        llmCache.data = responseData.items;
        llmCache.timestamp = now;
        
        setModels(responseData.items);
      } else {
        console.error('Invalid response format:', responseData);
        setModels([]);
      }
    } catch (error) {
      console.error('Error fetching models:', error);
      setModels([]);
    } finally {
      setIsLoadingModels(false);
    }
  }, []);

  // Fetch models on mount
  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  // Handle content changes
  const handlePromptChange = useCallback((value: string | undefined) => {
    data.onUpdate(id, { 
      content: {
        ...content,
        systemPrompt: value || ''
      }
    });
  }, [id, data, content]);

  // Handle model selection
  const handleModelChange = useCallback((modelId: string) => {
    data.onUpdate(id, {
      content: {
        ...content,
        modelId
      }
    });
  }, [id, data, content]);

  // Model selector in header
  const modelSelector = (
    <select
      value={content?.modelId || ''}
      onChange={(e) => handleModelChange(e.target.value)}
      className="prompt-node__model-select"
      disabled={isLoadingModels}
    >
      {!content?.modelId && <option value="">Select Model</option>}
      {models.map((model: LLM) => (
        <option key={model.id} value={model.modelId}>
          {model.name}
        </option>
      ))}
    </select>
  );

  // Execute button in header
  const executeButton = (
    <button 
      className="prompt-node__execute-button"
      onClick={() => data.onExecute?.(id, content?.systemPrompt || '')}
      disabled={isProcessing || !content?.modelId || !content?.systemPrompt}
    >
      <Play size={10} />
      {isProcessing ? 'Running...' : 'Run'}
    </button>
  );

  const headerActions = (
    <div className="prompt-node__header-actions">
      {modelSelector}
      {executeButton}
    </div>
  );

  const nodeContent = (
    <div className="prompt-node__content">
      <div className="prompt-node__editor">
        <Editor 
          content={content.systemPrompt} 
          onChange={handlePromptChange}
        />
      </div>
      {data.lastRunStats && (
        <div className="prompt-node__stats">
          <div className="prompt-node__stats-header">Last Execution Stats</div>
          <div className="prompt-node__stats-row">
            <span>Prompt Tokens:</span>
            <span className="prompt-node__stats-value">{data.lastRunStats.tokens.prompt}</span>
          </div>
          <div className="prompt-node__stats-row">
            <span>Completion Tokens:</span>
            <span className="prompt-node__stats-value">{data.lastRunStats.tokens.completion}</span>
          </div>
          <div className="prompt-node__stats-row">
            <span>Total Tokens:</span>
            <span className="prompt-node__stats-value">{data.lastRunStats.tokens.total}</span>
          </div>
          <div className="prompt-node__stats-row">
            <span>Processing Time:</span>
            <span className="prompt-node__stats-value">{data.lastRunStats.processingTime}ms</span>
          </div>
        </div>
      )}
    </div>
  );

  useEffect(() => {
    // Update UI based on status/error
    if (data.status === 'error' && data.error) {
      // Show error state
      console.error('Node error:', data.error);
    }
  }, [data.status, data.error]);

  return (
    <CoreNode
      {...props}
      type="prompt"
      headerActions={headerActions}
      onUpdate={(nodeId, updates) => data.onUpdate(nodeId, updates)}
      onRemove={(nodeId) => data.onRemove(nodeId)}
    >
      {nodeContent}
    </CoreNode>
  );
};

export default memo(PromptNode);
