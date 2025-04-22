import React, { useState, useEffect } from 'react';
import { Terminal, Gear, Tools } from 'react-bootstrap-icons';
import './css/BrainTabbedContainer.css';
import TerminalContainer from './TerminalContainer';
import { Form, Button } from 'react-bootstrap';
import BrainConfig from '../components/config/BrainConfig';
import BrainMCPFunctions from '../components/mcp-functions/BrainMCPFunctions';

// Type for BRAIN configuration
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

// Sample initial BRAIN options - this would eventually come from the backend
const AVAILABLE_BRAINS: BrainConfig[] = [
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
];

const BrainTabbedContainer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('terminal');
  const [currentBrain, setCurrentBrain] = useState<string>('default');
  const [availableBrains, setAvailableBrains] = useState<BrainConfig[]>(AVAILABLE_BRAINS);
  const [isNewDialogOpen, setIsNewDialogOpen] = useState<boolean>(false);

  // Load available BRAINs - would eventually fetch from backend
  useEffect(() => {
    // In the future, this would be an API call
    setAvailableBrains(AVAILABLE_BRAINS);
  }, []);

  // Handle tab selection
  const handleTabClick = (tabName: string) => {
    setActiveTab(tabName);
  };

  // Handle BRAIN selection
  const handleBrainChange = (brainName: string) => {
    setCurrentBrain(brainName);
    // In a real implementation, you would notify other components about the BRAIN change
    console.log(`Switched to BRAIN: ${brainName}`);
  };

  // Handle Save BRAIN configuration
  const handleSaveBrain = () => {
    // In a real implementation, this would save the current BRAIN's configuration to the backend
    console.log(`Saving configuration for BRAIN: ${currentBrain}`);
    alert('BRAIN configuration saved successfully!');
  };

  // Handle creating a new BRAIN
  const handleNewBrain = () => {
    // For now, just show a dialog or switch to the config tab in "new" mode
    setIsNewDialogOpen(true);
    setActiveTab('config');
  };

  // Get the current BRAIN's configuration
  const getCurrentBrainConfig = (): BrainConfig | undefined => {
    return availableBrains.find(brain => brain.name === currentBrain);
  };

  // Render the active tab content
  const renderTabContent = () => {
    const currentBrainConfig = getCurrentBrainConfig();
    
    switch (activeTab) {
      case 'terminal':
        return <TerminalContainer currentBrain={currentBrain} />;
      case 'config':
        return <BrainConfig 
          currentBrain={currentBrain}
          brainConfig={currentBrainConfig}
          isNewMode={isNewDialogOpen}
          onNewModeClose={() => setIsNewDialogOpen(false)}
        />;
      case 'mcp':
        return <BrainMCPFunctions />;
      default:
        return <TerminalContainer currentBrain={currentBrain} />;
    }
  };

  return (
    <div className="brain-tabbed-container">
      {/* Navigation Bar with BRAIN selector */}
      <div className="brain-nav-bar">
        <div className="nav-tabs-section">
          <button 
            className={`nav-button ${activeTab === 'terminal' ? 'active' : ''}`} 
            onClick={() => handleTabClick('terminal')}
          >
            <Terminal className="button-icon" />
            <span>BRAIN Terminal</span>
          </button>
          <button 
            className={`nav-button ${activeTab === 'config' ? 'active' : ''}`} 
            onClick={() => handleTabClick('config')}
          >
            <Gear className="button-icon" />
            <span>BRAIN Config</span>
          </button>
          <button 
            className={`nav-button ${activeTab === 'mcp' ? 'active' : ''}`} 
            onClick={() => handleTabClick('mcp')}
          >
            <Tools className="button-icon" />
            <span>MCP Functions</span>
          </button>
        </div>
        
        <div className="brain-selector-section">
          <div className="brain-selector-label">BRAIN:</div>
          <Form.Select 
            className="brain-selector"
            value={currentBrain}
            onChange={(e) => handleBrainChange(e.target.value)}
          >
            {availableBrains.map(brain => (
              <option key={brain.name} value={brain.name}>
                {brain.name}
              </option>
            ))}
          </Form.Select>
          
          <Button 
            variant="primary"
            className="brain-action-button save-button"
            onClick={handleSaveBrain}
          >
            Save
          </Button>
          
          <Button 
            variant="secondary"
            className="brain-action-button new-button"
            onClick={handleNewBrain}
          >
            New
          </Button>
        </div>
      </div>

      {/* Content Area - Takes remaining height */}
      <div className="brain-content-area">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default BrainTabbedContainer; 