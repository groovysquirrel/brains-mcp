import React, { useState } from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { MCPController } from '../../controller/MCPController';
import ChatArea from './ChatArea';
import ActivityLog from './ActivityLog';
import SolutionOutput from './SolutionOutput';
import { SettingsMenu } from './SettingsMenu';

interface MCPWorkspaceProps {
  controller: MCPController;
}

export const MCPWorkspace: React.FC<MCPWorkspaceProps> = ({ controller }) => {
  const [selectedModel, setSelectedModel] = useState('meta.llama3-70b-instruct-v1:0');
  const [activeResources, setActiveResources] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);

  // Handle model change
  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
    // Update controller config with new model
    controller.updateConfig({ 
      llm: { 
        model: modelId,
        temperature: 0.7,
        maxTokens: 2000
      } 
    });
  };

  // Handle user message
  const handleUserMessage = async (message: string) => {
    try {
      await controller.processUserMessage(message);
      // Update local state with latest activities
      setActivities(controller.getState().activities);
    } catch (error) {
      console.error('Failed to process message:', error);
    }
  };

  return (
    <Container fluid className="mcp-workspace">
      <Row>
        {/* Left Sidebar */}
        <Col md={2} className="sidebar">
          <Card className="mb-3">
            <Card.Header>Server</Card.Header>
            <Card.Body>
              {/* Server menu content */}
            </Card.Body>
          </Card>
          <Card className="mb-3">
            <Card.Header>Library</Card.Header>
            <Card.Body>
              {/* Library menu content */}
            </Card.Body>
          </Card>
          <SettingsMenu
            selectedModel={selectedModel}
            onModelChange={handleModelChange}
          />
        </Col>

        {/* Main Content */}
        <Col md={7} className="main-content">
          <ChatArea 
            activities={activities}
            onSendMessage={handleUserMessage} 
          />
          <ActivityLog activities={activities} />
        </Col>

        {/* Right Sidebar */}
        <Col md={3} className="sidebar">
          <SolutionOutput activities={activities} />
        </Col>
      </Row>
    </Container>
  );
}; 