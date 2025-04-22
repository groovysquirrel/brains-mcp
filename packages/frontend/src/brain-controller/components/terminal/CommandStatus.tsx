import React, { useState, useEffect, useRef } from 'react';
import { BrainConnectionService } from '../connection/BrainConnectionService';
import './CommandStatus.css';

// Type definitions for command status items
export interface CommandStatusItem {
  id: string;  // Command ID or conversation ID
  tool?: string;  // Name of the tool being executed
  status: 'queued' | 'processing' | 'completed' | 'error';
  message: string;
  timestamp: string;
  result?: any;  // Result of the command if available
  error?: string;  // Error message if status is 'error'
}

interface CommandStatusProps {
  className?: string;
}

/**
 * CommandStatus component displays the status of MCP commands in an SMS-like view
 */
const CommandStatus: React.FC<CommandStatusProps> = ({ className = '' }) => {
  const [statusItems, setStatusItems] = useState<Record<string, CommandStatusItem>>({});
  const statusContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Register handlers for MCP status messages
    const registerHandlers = () => {
      BrainConnectionService.registerMessageHandler('brain/terminal/status/mcp', handleMcpStatusUpdate);
      BrainConnectionService.registerMessageHandler('brain/mcp/response', handleMcpResponse);
    };

    registerHandlers();

    return () => {
      // Unregister handlers when component unmounts
      BrainConnectionService.unregisterMessageHandler('brain/terminal/status/mcp');
      BrainConnectionService.unregisterMessageHandler('brain/mcp/response');
    };
  }, []);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (statusContainerRef.current) {
      statusContainerRef.current.scrollTop = statusContainerRef.current.scrollHeight;
    }
  }, [statusItems]);

  // Handler for MCP status updates
  const handleMcpStatusUpdate = (message: any) => {
    const data = message.data;
    const commandId = data.commandId;
    
    if (!commandId) return;

    setStatusItems(prev => {
      // Create a new status item or update existing one
      const existing = prev[commandId] || {
        id: commandId,
        status: 'queued',
        message: '',
        timestamp: new Date().toISOString()
      };

      return {
        ...prev,
        [commandId]: {
          ...existing,
          tool: data.toolName || existing.tool,
          status: data.status || existing.status,
          message: data.message || existing.message,
          timestamp: data.timestamp || existing.timestamp
        }
      };
    });
  };

  // Handler for MCP command responses
  const handleMcpResponse = (message: any) => {
    const data = message.data;
    const commandId = data.commandId;
    
    if (!commandId) return;

    setStatusItems(prev => {
      const existing = prev[commandId] || {
        id: commandId,
        status: 'completed',
        message: '',
        timestamp: new Date().toISOString()
      };

      return {
        ...prev,
        [commandId]: {
          ...existing,
          tool: data.toolName || existing.tool,
          status: data.success ? 'completed' : 'error',
          result: data.result,
          error: data.error,
          message: data.success 
            ? `${data.toolName || 'Command'} completed successfully` 
            : `${data.toolName || 'Command'} failed: ${data.error || 'Unknown error'}`,
          timestamp: data.timestamp || existing.timestamp
        }
      };
    });
  };


  // Get status badge based on status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'queued':
        return <span className="status-badge waiting">Queued</span>;
      case 'processing':
        return <span className="status-badge processing">Processing</span>;
      case 'completed':
        return <span className="status-badge success">Success</span>;
      case 'error':
        return <span className="status-badge error">Error</span>;
      default:
        return <span className="status-badge">Unknown</span>;
    }
  };

  // Sort status items by timestamp (newest last)
  const sortedItems = Object.values(statusItems).sort((a, b) => {
    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
  });

  return (
    <div className={`status-container ${className}`} ref={statusContainerRef}>
      {sortedItems.length === 0 ? (
        <div className="no-activity">
          No command activity yet
        </div>
      ) : (
        sortedItems.map(item => (
          <div key={item.id} className="status-item">
            {getStatusBadge(item.status)}
            <div className="status-content">
              <div className="status-title">{item.tool || 'Command'}</div>
              <div className="status-details">{item.message}</div>
              {item.result && (
                <div className="status-result">
                  <pre>{typeof item.result === 'object' 
                    ? JSON.stringify(item.result, null, 2)
                    : item.result.toString()}</pre>
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default CommandStatus; 