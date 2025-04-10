import React, { useEffect, useState } from 'react';
import { Container } from 'react-bootstrap';
import { MCPController } from '../../controller/MCPController';
import { MCPWorkspace } from '../components/MCPWorkspace';
import { MCPClientState } from '../types';

const MCPContainer: React.FC = () => {
  const [controller, setController] = useState<MCPController | null>(null);
  const [clientState, setClientState] = useState<MCPClientState>({
    activeResources: [],
    activities: [],
    isConnected: false,
    error: null
  });

  useEffect(() => {
    const initController = async () => {
      const apiUrl = import.meta.env.VITE_MCP_API_URL || '';
      const mcpController = new MCPController({
        llm: {
          model: import.meta.env.VITE_LLM_MODEL || 'gpt-4',
          temperature: 0.7,
          maxTokens: 2048
        },
        server: {
          wsUrl: import.meta.env.VITE_MCP_WS_URL || '',
          apiUrl
        },
        apiUrl,
        systemPromptContext: 'You are a helpful AI assistant that can use MCP tools.'
      });

      try {
        await mcpController.initialize();
        setController(mcpController);
      } catch (error) {
        console.error('Failed to initialize MCP controller:', error);
        setClientState(prev => ({ ...prev, error: 'Failed to initialize MCP' }));
      }
    };

    initController();
  }, []);

  if (clientState.error) {
    return (
      <Container className="mt-4">
        <div className="alert alert-danger">
          Error: {clientState.error}
        </div>
      </Container>
    );
  }

  if (!controller) {
    return (
      <Container className="mt-4">
        <div>Initializing MCP...</div>
      </Container>
    );
  }

  return <MCPWorkspace controller={controller} />;
};

export default MCPContainer; 