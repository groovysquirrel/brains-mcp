import React, { useState, useEffect } from 'react';
import { Form, Card, Row, Col, Button} from 'react-bootstrap';
import { PlusCircle } from 'react-bootstrap-icons';
import './BrainConfig.css';

// Types for configuration
interface BrainModelConfig {
  modelId: string;
  provider: string;
  nickname: string;
  systemPrompt: string;
  persona: string;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
}

interface BrainConfig {
  name: string;
  config: BrainModelConfig;
}

interface BrainConfigsState {
  brains: BrainConfig[];
}

// Props for the component
interface BrainConfigProps {
  currentBrain: string;
  brainConfig?: BrainConfig;
  isNewMode: boolean;
  onNewModeClose: () => void;
}

// Available model options
const MODEL_OPTIONS = [
  { value: 'anthropic.claude-3-sonnet-20240229-v1:0', label: 'Claude 3 Sonnet' },
  { value: 'anthropic.claude-3-opus-20240229-v1:0', label: 'Claude 3 Opus' },
  { value: 'anthropic.claude-3-haiku-20240307-v1:0', label: 'Claude 3 Haiku' },
  { value: 'meta.llama3-70b-instruct-v1:0', label: 'Llama 3 70B' },
  { value: 'meta.llama3-8b-instruct-v1:0', label: 'Llama 3 8B' }
];

// Available provider options
const PROVIDER_OPTIONS = [
  { value: 'bedrock', label: 'AWS Bedrock' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic Direct' }
];

// Sample initial config - this would eventually come from the backend
const DEFAULT_CONFIG: BrainConfigsState = {
  brains: [
    {
      name: 'default',
      config: {
        modelId: 'meta.llama3-70b-instruct-v1:0',
        provider: 'bedrock',
        nickname: 'Mr Smith',
        systemPrompt: 'You are a helpful AI assistant.',
        persona: 'A helpful and knowledgeable AI assistant that talks like a pirate.',
        temperature: 0.7,
        topP: 0.9,
        maxTokens: 4000
      }
    },
    {
      name: 'analyst',
      config: {
        modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
        provider: 'bedrock',
        nickname: 'data',
        systemPrompt: 'You are an analytical AI assistant focused on data analysis and insights.',
        persona: 'A data-driven AI assistant that excels at analysis and pattern recognition.',
        temperature: 0.3,
        topP: 0.8,
        maxTokens: 4000
      }
    },
    {
      name: 'coder',
      config: {
        modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
        provider: 'bedrock',
        nickname: 'dev',
        systemPrompt: 'You are a programming-focused AI assistant that helps with code development and debugging.',
        persona: 'A technical AI assistant that specializes in software development and programming.',
        temperature: 0.5,
        topP: 0.95,
        maxTokens: 8000
      }
    }
  ]
};

// Default configuration for a new BRAIN
const DEFAULT_BRAIN_CONFIG: BrainConfig = {
  name: '',
  config: {
    modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
    provider: 'bedrock',
    nickname: '',
    systemPrompt: 'You are a helpful AI assistant.',
    persona: 'A helpful and knowledgeable AI assistant.',
    temperature: 0.7,
    topP: 0.9,
    maxTokens: 4000
  }
};

const BrainConfigComponent: React.FC<BrainConfigProps> = ({
  brainConfig,
  isNewMode,
  onNewModeClose
}) => {
  const [configs, setConfigs] = useState<BrainConfigsState>(DEFAULT_CONFIG);
  const [activeTab, setActiveTab] = useState<string>('default');
  const [_isEditing, _setIsEditing] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [newBrain, setNewBrain] = useState<BrainConfig>({ ...DEFAULT_BRAIN_CONFIG });
  const [editedConfig, setEditedConfig] = useState<BrainModelConfig | undefined>(brainConfig?.config);
  const [newBrainName, setNewBrainName] = useState<string>('');
  
  // Load configs - would eventually fetch from backend
  useEffect(() => {
    // In the future, this would be an API call
    setConfigs(DEFAULT_CONFIG);
  }, []);

  // Update local state when the selected BRAIN changes
  useEffect(() => {
    if (brainConfig && !isNewMode) {
      setEditedConfig(brainConfig.config);
    } else if (isNewMode) {
      setEditedConfig({ ...DEFAULT_BRAIN_CONFIG.config });
      setNewBrainName('');
    }
  }, [brainConfig, isNewMode]);

  // Handle form field changes
  const handleChange = (field: keyof BrainModelConfig, value: string | number) => {
    if (isCreating) {
      setNewBrain({
        ...newBrain,
        config: {
          ...newBrain.config,
          [field]: value
        }
      });
    } else {
      const updatedBrains = configs.brains.map(brain => {
        if (brain.name === activeTab) {
          return {
            ...brain,
            config: {
              ...brain.config,
              [field]: value
            }
          };
        }
        return brain;
      });
      
      setConfigs({
        ...configs,
        brains: updatedBrains
      });
    }
  };

//   // Handle brain name change (for creating new brain)
//   const handleBrainNameChange = (value: string) => {
//     setNewBrain({
//       ...newBrain,
//       name: value
//     });
//   };

//   // Handle save configuration
//   const handleSave = () => {
//     // Here we would actually send the config to the backend
//     console.log('Saving configuration:', configs);
//     setIsEditing(false);
    
//     // Show a success message or notification here
//     alert('Configuration saved successfully!');
//   };

  // Handle creating a new brain configuration
  const handleCreateBrain = () => {
    if (!newBrainName.trim()) {
      alert('Please provide a name for the BRAIN');
      return;
    }
    
    if (configs.brains.some(brain => brain.name === newBrainName)) {
      alert('A BRAIN with this name already exists');
      return;
    }
    
    const updatedBrains = [...configs.brains, newBrain];
    setConfigs({
      ...configs,
      brains: updatedBrains
    });
    
    setActiveTab(newBrain.name);
    setIsCreating(false);
    setNewBrain({ ...DEFAULT_BRAIN_CONFIG });
  };

//   // Handle deleting a brain configuration
//   const handleDeleteBrain = (brainName: string) => {
//     if (brainName === 'default') {
//       alert('Cannot delete the default BRAIN');
//       return;
//     }
    
//     if (window.confirm(`Are you sure you want to delete the "${brainName}" BRAIN?`)) {
//       const updatedBrains = configs.brains.filter(brain => brain.name !== brainName);
//       setConfigs({
//         ...configs,
//         brains: updatedBrains
//       });
      
//       setActiveTab('default');
//     }
//   };

//   // Render brain configuration form
//   const renderBrainForm = (brain: BrainConfig) => {
//     return (
//       <Form className="brain-config-form">
//         <Row className="mb-4">
//           <Col md={6}>
//             <Card>
//               <Card.Header>
//                 <h5>Model Settings</h5>
//               </Card.Header>
//               <Card.Body>
//                 <Form.Group className="mb-3">
//                   <Form.Label>Model Provider</Form.Label>
//                   <Form.Select
//                     value={brain.config.provider}
//                     onChange={(e) => handleChange('provider', e.target.value)}
//                     disabled={!isEditing && !isCreating}
//                   >
//                     {PROVIDER_OPTIONS.map(option => (
//                       <option key={option.value} value={option.value}>
//                         {option.label}
//                       </option>
//                     ))}
//                   </Form.Select>
//                 </Form.Group>

//                 <Form.Group className="mb-3">
//                   <Form.Label>Model</Form.Label>
//                   <Form.Select
//                     value={brain.config.modelId}
//                     onChange={(e) => handleChange('modelId', e.target.value)}
//                     disabled={!isEditing && !isCreating}
//                   >
//                     {MODEL_OPTIONS.map(option => (
//                       <option key={option.value} value={option.value}>
//                         {option.label}
//                       </option>
//                     ))}
//                   </Form.Select>
//                 </Form.Group>

//                 <Form.Group className="mb-3">
//                   <Form.Label>Nickname</Form.Label>
//                   <Form.Control
//                     type="text"
//                     value={brain.config.nickname}
//                     onChange={(e) => handleChange('nickname', e.target.value)}
//                     disabled={!isEditing && !isCreating}
//                     placeholder="Friendly name for this BRAIN"
//                   />
//                 </Form.Group>
//               </Card.Body>
//             </Card>
//           </Col>
          
//           <Col md={6}>
//             <Card>
//               <Card.Header>
//                 <h5>Generation Parameters</h5>
//               </Card.Header>
//               <Card.Body>
//                 <Form.Group className="mb-3">
//                   <Form.Label>Temperature: {brain.config.temperature}</Form.Label>
//                   <Form.Range
//                     min={0}
//                     max={1}
//                     step={0.1}
//                     value={brain.config.temperature}
//                     onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
//                     disabled={!isEditing && !isCreating}
//                   />
//                   <div className="d-flex justify-content-between">
//                     <small>More Precise</small>
//                     <small>More Creative</small>
//                   </div>
//                 </Form.Group>

//                 <Form.Group className="mb-3">
//                   <Form.Label>Top P: {brain.config.topP}</Form.Label>
//                   <Form.Range
//                     min={0.1}
//                     max={1}
//                     step={0.05}
//                     value={brain.config.topP}
//                     onChange={(e) => handleChange('topP', parseFloat(e.target.value))}
//                     disabled={!isEditing && !isCreating}
//                   />
//                 </Form.Group>

//                 <Form.Group className="mb-3">
//                   <Form.Label>Max Tokens</Form.Label>
//                   <Form.Control
//                     type="number"
//                     value={brain.config.maxTokens}
//                     onChange={(e) => handleChange('maxTokens', parseInt(e.target.value))}
//                     disabled={!isEditing && !isCreating}
//                     min={100}
//                     max={32000}
//                   />
//                 </Form.Group>
//               </Card.Body>
//             </Card>
//           </Col>
//         </Row>

//         <Card className="mb-4">
//           <Card.Header>
//             <h5>Persona & System Prompt</h5>
//           </Card.Header>
//           <Card.Body>
//             <Form.Group className="mb-3">
//               <Form.Label>Persona Description</Form.Label>
//               <Form.Control
//                 type="text"
//                 value={brain.config.persona}
//                 onChange={(e) => handleChange('persona', e.target.value)}
//                 disabled={!isEditing && !isCreating}
//                 placeholder="Describe the persona of this BRAIN"
//               />
//               <Form.Text className="text-muted">
//                 A brief description of how this BRAIN should behave and present itself.
//               </Form.Text>
//             </Form.Group>

//             <Form.Group className="mb-3">
//               <Form.Label>System Prompt</Form.Label>
//               <Form.Control
//                 as="textarea"
//                 rows={5}
//                 value={brain.config.systemPrompt}
//                 onChange={(e) => handleChange('systemPrompt', e.target.value)}
//                 disabled={!isEditing && !isCreating}
//                 placeholder="Enter the system prompt instructions for this BRAIN"
//               />
//               <Form.Text className="text-muted">
//                 Instructions that define the behavior, capabilities, and limitations of this BRAIN.
//               </Form.Text>
//             </Form.Group>
//           </Card.Body>
//         </Card>
//       </Form>
//     );
//   };

  // Render the create new BRAIN form
  const renderCreateBrainForm = () => {
    return (
      <div className="create-brain-container">
        <Card className="mb-4">
          <Card.Header>
            <h5>Create New BRAIN</h5>
          </Card.Header>
          <Card.Body>
            <Form.Group className="mb-4">
              <Form.Label>BRAIN Name</Form.Label>
              <Form.Control
                type="text"
                value={newBrainName}
                onChange={(e) => setNewBrainName(e.target.value)}
                placeholder="Enter a unique name for this BRAIN"
              />
              <Form.Text className="text-muted">
                This name will be used to identify and select this BRAIN in the terminal.
              </Form.Text>
            </Form.Group>
            
            <div className="d-flex gap-2 mb-4">
              <Button 
                variant="success" 
                onClick={handleCreateBrain}
              >
                <PlusCircle className="me-2" />
                Create BRAIN
              </Button>
              <Button 
                variant="outline-secondary" 
                onClick={onNewModeClose}
              >
                Cancel
              </Button>
            </div>
            
            {editedConfig && renderConfigForm(editedConfig)}
          </Card.Body>
        </Card>
      </div>
    );
  };

  // Render the configuration form for an existing BRAIN
  const renderConfigForm = (config: BrainModelConfig) => {
    return (
      <Form className="brain-config-form">
        <Row className="mb-4">
          <Col md={6} lg={4}>
            <Card>
              <Card.Header>
                <h5>Model Settings</h5>
              </Card.Header>
              <Card.Body>
                <Form.Group className="mb-3">
                  <Form.Label>Model Provider</Form.Label>
                  <Form.Select
                    value={config.provider}
                    onChange={(e) => handleChange('provider', e.target.value)}
                  >
                    {PROVIDER_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Model</Form.Label>
                  <Form.Select
                    value={config.modelId}
                    onChange={(e) => handleChange('modelId', e.target.value)}
                  >
                    {MODEL_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-0">
                  <Form.Label>Nickname</Form.Label>
                  <Form.Control
                    type="text"
                    value={config.nickname}
                    onChange={(e) => handleChange('nickname', e.target.value)}
                    placeholder="Friendly name for this BRAIN"
                  />
                </Form.Group>
              </Card.Body>
            </Card>
          </Col>
          
          <Col md={6} lg={4}>
            <Card>
              <Card.Header>
                <h5>Generation Parameters</h5>
              </Card.Header>
              <Card.Body>
                <Form.Group className="mb-3">
                  <Form.Label>Temperature: {config.temperature}</Form.Label>
                  <Form.Range
                    min={0}
                    max={1}
                    step={0.1}
                    value={config.temperature}
                    onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
                  />
                  <div className="d-flex justify-content-between">
                    <small>More Precise</small>
                    <small>More Creative</small>
                  </div>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Top P: {config.topP}</Form.Label>
                  <Form.Range
                    min={0.1}
                    max={1}
                    step={0.05}
                    value={config.topP}
                    onChange={(e) => handleChange('topP', parseFloat(e.target.value))}
                  />
                </Form.Group>

                <Form.Group className="mb-0">
                  <Form.Label>Max Tokens</Form.Label>
                  <Form.Control
                    type="number"
                    value={config.maxTokens}
                    onChange={(e) => handleChange('maxTokens', parseInt(e.target.value))}
                    min={100}
                    max={32000}
                  />
                </Form.Group>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={4}>
            <Card>
              <Card.Header>
                <h5>Persona</h5>
              </Card.Header>
              <Card.Body>
                <Form.Group className="mb-0">
                  <Form.Label>Persona Description</Form.Label>
                  <Form.Control
                    type="text"
                    value={config.persona}
                    onChange={(e) => handleChange('persona', e.target.value)}
                    placeholder="Describe the persona of this BRAIN"
                  />
                  <Form.Text className="text-muted">
                    A brief description of how this BRAIN should behave and present itself.
                  </Form.Text>
                </Form.Group>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Card>
          <Card.Header>
            <h5>System Prompt</h5>
          </Card.Header>
          <Card.Body>
            <Form.Group className="mb-0">
              <Form.Control
                as="textarea"
                rows={5}
                value={config.systemPrompt}
                onChange={(e) => handleChange('systemPrompt', e.target.value)}
                placeholder="Enter the system prompt instructions for this BRAIN"
              />
              <Form.Text className="text-muted">
                Instructions that define the behavior, capabilities, and limitations of this BRAIN.
              </Form.Text>
            </Form.Group>
          </Card.Body>
        </Card>
      </Form>
    );
  };

  // If in "new" mode, show the create form
  if (isNewMode) {
    return renderCreateBrainForm();
  }

  // If no config or no selected BRAIN, show a message
  if (!brainConfig || !editedConfig) {
    return (
      <div className="brain-config-container">
        <div className="empty-state">
          <h3>No BRAIN Selected</h3>
          <p>Please select a BRAIN from the dropdown in the navigation bar.</p>
        </div>
      </div>
    );
  }

  // Otherwise, render the config form for the selected BRAIN
  return (
    <div className="brain-config-container">
      {renderConfigForm(editedConfig)}
    </div>
  );
};

export default BrainConfigComponent;
