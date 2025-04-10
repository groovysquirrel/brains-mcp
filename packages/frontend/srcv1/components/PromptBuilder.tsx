import React, { useState, useEffect, useRef } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { Button, Form } from 'react-bootstrap';
import SplitPane, { Pane } from 'split-pane-react';
import 'split-pane-react/esm/themes/default.css';
import './PromptBuilder.css';
import { get, post } from '@aws-amplify/api';
import { v4 as uuidv4 } from 'uuid';

// Types
interface LLM {
  id: string;
  name: string;
  modelId: string;
  vendor: string;
  source: string;
  maxTokens: number;
  status: string;
  type: string;
  typeName: string;
  userId: string;
  updatedAt: string;
}

interface ResponseData {
  success: boolean;
  count: number;
  items: LLM[];
  metadata: {
    requestId: string;
    processingTimeMs: number;
    timestamp: string;
  }
}

interface PromptResponseData {
  content?: string;
  response?: string;
  conversationId?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

interface PromptBuilderProps {
  value: string;
  defaultModel?: string;
  onChange?: (systemPrompt: string) => void;
  onSave?: (payload: { name: string; version: string; systemPrompt: string; model: string }) => void;
}

// Add debounce utility
const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Add or update the error types at the top of the file
interface ErrorDetails {
  statusCode: number;
  code: string;
  service?: string;
  operation?: string;
  modelId?: string;
  retryAfter?: string;  // Add this to match the API response
}

interface APIError {
  message: string;
  code: string;
  details: ErrorDetails;
}

interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: APIError;
  metadata: {
    requestId?: string;
    processingTimeMs: number;
    timestamp: string;
    modelId?: string;
  };
}

// Component
const PromptBuilder: React.FC<PromptBuilderProps> = ({
  value,
  defaultModel,
  onChange = () => {},
}) => {
  
  // Internal helper functions
  const formatSuccessResponse = (
    responseData: APIResponse<PromptResponseData>,
    promptMode: string,
    selectedModel: string,
    testPrompt: string
  ) => {
    const responseContent = responseData.data?.content || responseData.data?.response;
    
    return `# Mode: ${promptMode}
# Model: ${selectedModel}

## Prompt:
${testPrompt}

## Response:
${responseContent || 'No response content'}

${responseData.data?.usage ? `## Usage:
### Prompt Tokens: ${responseData.data.usage.promptTokens}
### Completion Tokens: ${responseData.data.usage.completionTokens}
### Total Tokens: ${responseData.data.usage.totalTokens}` : ''}

## Metadata:
${responseData.data?.conversationId ? `### Conversation ID: ${responseData.data.conversationId}` : ''}
### Processing Time: ${responseData.metadata.processingTimeMs}ms
${responseData.metadata.modelId ? `### Model ID: ${responseData.metadata.modelId}` : ''}
### Timestamp: ${responseData.metadata.timestamp}`;
  };

  const formatErrorResponse = (errorData: any) => `# Service Error:
### Status Code: ${errorData.error?.details?.statusCode || 500}
### Error Code: ${errorData.error?.details?.code || 'Unknown'}
### Model: ${errorData.error?.details?.modelId || 'Unknown'}
### Operation: ${errorData.error?.details?.operation || 'Unknown'}

### Message: ${errorData.error?.message || 'Unknown error'}
### Timestamp: ${errorData.metadata?.timestamp || new Date().toISOString()}`;

  // State
  const [testPrompt, setTestPrompt] = useState('Tell me a joke.');
  const [testResult, setTestResult] = useState("Arrr, here be one for ye:\n\nWhy don't me parrot ever tell secrets?\nBecause he's afraid they'll be leaked!\nSquawk! Secrets spillin', just like me rum, matey!");
  const [sizes, setSizes] = useState([50, 50]);
  const [innerSizes, setInnerSizes] = useState([70, 30]);
  const [selectedModel, setSelectedModel] = useState('meta.llama3-70b-instruct-v1:0');
  const [availableModels, setAvailableModels] = useState<LLM[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [promptMode, setPromptMode] = useState<'instruction' | 'conversation'>('instruction');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState(value);
  const [messageHistory, setMessageHistory] = useState<Array<{role: string, content: string}>>([]);

  // Add a ref to track if we've fetched models
  const hasFetchedModels = useRef(false);

  // Update systemPrompt when value changes
  useEffect(() => {
    setSystemPrompt(value);
  }, [value]);

  // Update model when defaultModel changes
  useEffect(() => {
    if (defaultModel && availableModels.length > 0) {
      const modelExists = availableModels.some(model => model.modelId === defaultModel);
      if (modelExists) {
        setSelectedModel(defaultModel);
      }
    }
  }, [defaultModel, availableModels]);

  // Handlers
  const handleModeChange = (newMode: 'instruction' | 'conversation') => {
    setPromptMode(newMode);
    setMessageHistory([]);
    setConversationId(newMode === 'conversation' ? uuidv4() : null);
  };

  // Debounced system prompt change handler
  const debouncedOnChange = useRef(
    debounce((value: string) => {
      onChange(value);
    }, 500)
  ).current;

  // Modified system prompt change handler
  const handleSystemPromptChange = (newValue: string | undefined) => {
    setSystemPrompt(newValue || '');
    debouncedOnChange(newValue || '');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        
        // Only trigger if we're not already loading and there's content
        if (!isLoading && testPrompt.trim()) {
            handleTestPrompt();
            
            // Clear the input only in conversation mode
            if (promptMode === 'conversation') {
                setTestPrompt('');
            }
        }
    }
  };

  // API Calls
  const fetchModels = async (mounted: boolean) => {
    // Skip if already loading or models are already loaded
    if (isLoadingModels || (availableModels.length > 0 && hasFetchedModels.current)) {
      return;
    }

    try {
      setIsLoadingModels(true);
      
      const restOperation = get({
        apiName: "brainsOS",
        path: "/latest/resources/system/llms"
      });
      
      const { body } = await restOperation.response;
      const responseData = (await body.json() as unknown) as ResponseData;
      
      if (mounted && responseData?.items) {
        setAvailableModels(responseData.items);
        
        // Only set default model if not already set
        if (!selectedModel) {
          const llama70B = responseData.items.find(model => 
            model.modelId === 'meta.llama3-70b-instruct-v1:0'
          );
          setSelectedModel(llama70B?.modelId || responseData.items[0]?.modelId);
        }
      }
    } catch (error) {
      console.error('Error fetching models:', error);
      if (mounted) {
        setAvailableModels([]);
      }
    } finally {
      if (mounted) {
        setIsLoadingModels(false);
        hasFetchedModels.current = true;
      }
    }
  };

  const handleTestPrompt = async () => {
    if (isLoading) {
      console.log('Request in progress, skipping');
      return;
    }

    setIsLoading(true);
    setTestResult('Processing request...');

    const selectedModelData = availableModels.find(model => model.modelId === selectedModel);
    
    const payload = {
      userPrompt: testPrompt,
      modelId: selectedModel,
      modelSource: selectedModelData?.source || 'bedrock',
      systemPrompt: systemPrompt,
      ...(promptMode === 'conversation' && { 
        conversationId,
        messageHistory
      })
    };

    try {
      const restOperation = post({
        apiName: "brainsOS",
        path: `/latest/services/prompt/${promptMode}`,
        options: { 
          body: payload,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      });

      const response = await restOperation.response;
      const rawData = await response.body.json();
      const responseData = rawData as unknown as APIResponse<PromptResponseData>;

      // Check for error responses
      if (responseData.error) {
        // Handle rate limiting
        if (responseData.error.code === 'RateLimitExceeded') {
          const retryAfter = parseInt(responseData.error.details?.retryAfter || '15000');
          setTestResult(`Rate limit exceeded. Please wait ${Math.ceil(retryAfter/1000)} seconds before trying again.
          
Error details:
${formatErrorResponse(responseData)}`);
          
          // Disable the button for the retry period
          setIsLoading(true);
          await new Promise(resolve => setTimeout(resolve, retryAfter));
          setIsLoading(false);
          return;
        }
        
        throw new Error(responseData.error.message || 'API request failed');
      }

      if (responseData.data) {
        if (promptMode === 'conversation') {
          setMessageHistory(prev => [
            ...prev,
            { role: 'user', content: testPrompt },
            { 
              role: 'assistant', 
              content: responseData.data?.content || responseData.data?.response || '' 
            }
          ]);
        }
        
        setTestResult(formatSuccessResponse(responseData, promptMode, selectedModel, testPrompt));
        
        // Clear input in conversation mode
        if (promptMode === 'conversation') {
          setTestPrompt('');
        }
      } else {
        setTestResult(formatErrorResponse(responseData));
      }

    } catch (error: any) {
      console.error('Error in handleTestPrompt:', error);
      
      // Format error response
      if (error.response) {
        try {
          const rawErrorData = await error.response.body.json();
          const errorData = rawErrorData as unknown as APIResponse<PromptResponseData>;
          setTestResult(formatErrorResponse(errorData));
        } catch (parseError) {
          setTestResult(formatErrorResponse({
            success: false,
            error: {
              message: error.message || 'Failed to parse error response',
              details: {
                statusCode: 500,
                code: 'ParseError'
              }
            },
            metadata: {
              timestamp: new Date().toISOString()
            }
          }));
        }
      } else {
        setTestResult(formatErrorResponse({
          success: false,
          error: {
            message: error.message || 'Unknown error occurred',
            details: {
              statusCode: 500,
              code: 'UnknownError'
            }
          },
          metadata: {
            timestamp: new Date().toISOString()
          }
        }));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Effects
  useEffect(() => {
    let mounted = true;
    
    // Only fetch if we haven't fetched before and don't have models
    if (!hasFetchedModels.current && availableModels.length === 0) {
      fetchModels(mounted);
    }
    
    return () => { mounted = false; };
  }, []); // Remove availableModels.length dependency

  // Render
  return (
    <div className="prompt-builder">
      <SplitPane
        split="vertical"
        sizes={sizes}
        onChange={setSizes}
        resizerSize={4}
        sashRender={() => <div style={{ background: '#ccc', width: '100%', height: '100%' }} />}
      >
        {/* Left Pane */}
        <Pane minSize={200} maxSize="80%">
          <SplitPane
            split="horizontal"
            sizes={innerSizes}
            onChange={setInnerSizes}
            resizerSize={4}
            sashRender={() => <div style={{ background: '#ccc', width: '100%', height: '100%' }} />}
          >
            {/* System Prompt Editor */}
            <div className="editor-container">
              <h3>System Prompt</h3>
              <MonacoEditor
                defaultLanguage="markdown"
                value={systemPrompt}
                onChange={handleSystemPromptChange}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  wordWrap: 'on',
                  padding: { top: 10, bottom: 10 }
                }}
              />
            </div>

            {/* Test Controls */}
            <div className="editor-container">
              <div className="test-prompt-header compact">
                <div className="test-prompt-label">Mode</div>
                <Form.Select
                  value={promptMode}
                  onChange={(e) => handleModeChange(e.target.value as 'instruction' | 'conversation')}
                  className="mode-select"
                  size="sm"
                  style={{ height: '28px', padding: '2px 20px 2px 8px', marginRight: '10px', backgroundColor: 'white', color: 'black' }}
                >
                  <option value="instruction">Instruction</option>
                  <option value="conversation">Conversation</option>
                </Form.Select>

                <div className="test-prompt-label">Model</div>
                <Form.Select 
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="model-select"
                  size="sm"
                  style={{ height: '28px', padding: '2px 20px 2px 8px', backgroundColor: 'white', color: 'black' }}
                  disabled={isLoadingModels}
                >
                  {isLoadingModels ? (
                    <option>Loading models...</option>
                  ) : (
                    availableModels.map(model => (
                      <option key={model.id} value={model.modelId}>
                        {model.name}
                      </option>
                    ))
                  )}
                </Form.Select>
              </div>
              <div className="test-prompt-row">
                <textarea
                  value={testPrompt}
                  onChange={(e) => setTestPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Test your system prompt here..."
                />
                <Button 
                  variant="primary" 
                  onClick={handleTestPrompt}
                  disabled={isLoading}
                >
                  {isLoading ? 'Testing...' : 'Test'}
                </Button>
              </div>
            </div>
          </SplitPane>
        </Pane>
        
        {/* Right Pane - Results */}
        <Pane minSize={200}>
          <div className="prompt-builder-right">
            <div className="editor-container">
              <h3>Results Viewer</h3>
              <MonacoEditor
                defaultLanguage="markdown"
                value={testResult}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  wordWrap: 'on',
                  padding: { top: 10},
                  lineDecorationsWidth: 1,
                  lineNumbersMinChars: 3,
                  scrollbar: {
                    vertical: 'visible',
                    horizontal: 'visible',
                    verticalScrollbarSize: 10,
                    horizontalScrollbarSize: 10
                  }
                }}
              />
            </div>
          </div>
        </Pane>
      </SplitPane>
    </div>
  );
};

export default PromptBuilder;
