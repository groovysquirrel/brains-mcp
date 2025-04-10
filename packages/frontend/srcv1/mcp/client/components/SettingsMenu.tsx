import React, { useState, useEffect } from 'react';
import { Card, Form, Spinner } from 'react-bootstrap';
import { get } from '@aws-amplify/api';

// Types from existing PromptBuilder
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

interface SettingsMenuProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({
  selectedModel,
  onModelChange,
}) => {
  const [availableModels, setAvailableModels] = useState<LLM[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const restOperation = get({
          apiName: "brainsOS",
          path: "/latest/resources/system/llms"
        });
        
        const { body } = await restOperation.response;
        const responseData = (await body.json() as unknown) as ResponseData;
        
        if (responseData?.items) {
          setAvailableModels(responseData.items);
        } else {
          setError('No models available');
        }
      } catch (error) {
        console.error('Error fetching models:', error);
        setError('Failed to load models');
      } finally {
        setIsLoading(false);
      }
    };

    fetchModels();
  }, []);

  return (
    <Card className="settings-menu">
      <Card.Header>
        <h5 className="mb-0">Settings</h5>
      </Card.Header>
      <Card.Body>
        <div className="mb-3">
          <Form.Label>Language Model</Form.Label>
          {isLoading ? (
            <div className="d-flex align-items-center">
              <Spinner animation="border" size="sm" className="me-2" />
              <span>Loading models...</span>
            </div>
          ) : error ? (
            <div className="text-danger">{error}</div>
          ) : (
            <Form.Select
              value={selectedModel}
              onChange={(e) => onModelChange(e.target.value)}
              size="sm"
            >
              {availableModels.map(model => (
                <option key={model.id} value={model.modelId}>
                  {model.name}
                </option>
              ))}
            </Form.Select>
          )}
        </div>
      </Card.Body>
    </Card>
  );
}; 