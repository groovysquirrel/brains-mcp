import React, { useRef, useEffect, useState } from 'react';
import Terminal, { TerminalRef } from '../components/terminal/Terminal';
import { ExecutionResult, BrainConnectionService } from '../components/connection/BrainConnectionService';
import { useAppContext } from '../../lib/contextLib';
import { fetchAuthSession } from 'aws-amplify/auth';
import CommandStatus from '../components/terminal/CommandStatus';
import './css/TerminalContainer.css';
import { ConnectionStatus } from '../components/connection/WebSocketConnection';

type TerminalMode = 'raw' | 'content' | 'source';

// Props for the TerminalContainer component
interface TerminalContainerProps {
  currentBrain: string;
}

/**
 * TerminalContainer component that manages the terminal interface
 * Handles authentication, connection status, and terminal responses
 */
const TerminalContainer: React.FC<TerminalContainerProps> = ({ currentBrain }) => {
  const terminalRef = useRef<TerminalRef>(null);
  const resizeDividerRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated } = useAppContext();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [displayMode, setDisplayMode] = useState<TerminalMode>('content');
  const [wsUrl, _setWsUrl] = useState<string>('');
  const [showStatus, setShowStatus] = useState<boolean>(true);
  const [statusPanelWidth, setStatusPanelWidth] = useState<number>(300);
  const [isResizing, setIsResizing] = useState<boolean>(false);

  // Initialize BrainConnectionService
  useEffect(() => {
    BrainConnectionService.initialize();
  }, []);

  // Make sure status panel has the correct width initially and handle visibility changes
  useEffect(() => {
    const fitTerminal = () => {
      if (terminalRef.current) {
        terminalRef.current.fit();
      }
    };

    const panel = document.querySelector('.command-status-panel') as HTMLElement;
    if (panel) {
      if (showStatus) {
        panel.style.width = `${statusPanelWidth}px`;
        panel.style.display = 'flex';
        // Trigger a resize after panel is visible and sized
        setTimeout(fitTerminal, 50);
      } else {
        panel.style.display = 'none';
        // Also fit when the panel is hidden
        setTimeout(fitTerminal, 50);
      }
    }
  }, [showStatus, statusPanelWidth]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (!isAuthenticated) {
          throw new Error('Not authenticated');
        }
        await fetchAuthSession();
      } catch (error) {
        console.error('Error checking auth status:', error);
      }
    };

    checkAuth();
  }, [isAuthenticated]);

  useEffect(() => {
    const unsubscribe = BrainConnectionService.onConnectionStatusChange(setConnectionStatus);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      terminalRef.current?.fit();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle resizing functionality
  useEffect(() => {
    if (!resizeDividerRef.current) return;

    const divider = resizeDividerRef.current;
    let startX = 0;
    let startWidth = 0;

    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Get the current width directly from the DOM
      const panel = divider.nextElementSibling as HTMLElement;
      if (!panel) return;
      
      startX = e.clientX;
      startWidth = panel.getBoundingClientRect().width;
      
      // Set resizing state
      setIsResizing(true);
      document.body.style.cursor = 'col-resize';
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const panel = divider.nextElementSibling as HTMLElement;
      if (!panel) return;
      
      const container = divider.parentElement;
      if (!container) return;
      
      const containerWidth = container.getBoundingClientRect().width;
      const delta = e.clientX - startX;
      const newWidth = Math.max(200, Math.min(containerWidth - 400, startWidth - delta));
      
      // Apply width directly to the DOM
      panel.style.width = `${newWidth}px`;
      
      // Also update state to keep it in sync
      setStatusPanelWidth(newWidth);
      
      // Ensure terminal adapts to new size
      if (terminalRef.current) {
        terminalRef.current.fit();
      }
    };

    const onMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    divider.addEventListener('mousedown', onMouseDown);

    return () => {
      divider.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
    };
  }, [isResizing, terminalRef]);

  // Used when the active BRAIN changes
  useEffect(() => {
    // Update the terminal to reflect the selected BRAIN
    if (terminalRef.current) {
      terminalRef.current.runCommand(`use ${currentBrain}`);
    }
  }, [currentBrain]);

  const handleResponse = (response: ExecutionResult) => {
    if (response.isLocalCommand) {
      const command = response.data?.command || response.data?.message;
      if (typeof command === 'string' && command.startsWith('mode ')) {
        const newMode = command.split(' ')[1] as TerminalMode;
        if (['raw', 'content', 'source'].includes(newMode)) {
          setDisplayMode(newMode);
        }
      }
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'status-connected';
      case 'connecting':
        return 'status-connecting';
      default:
        return 'status-disconnected';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      default:
        return 'Disconnected';
    }
  };

  const toggleCommandStatus = () => {
    const newVisibility = !showStatus;
    setShowStatus(newVisibility);

    // Handle visibility directly for immediate response
    const panel = document.querySelector('.command-status-panel') as HTMLElement;
    const divider = document.querySelector('.resize-divider') as HTMLElement;
    
    if (panel && divider) {
      if (newVisibility) {
        panel.style.display = 'flex';
        divider.style.display = 'block';
      } else {
        panel.style.display = 'none';
        divider.style.display = 'none';
      }
    }
    
    // Ensure terminal adapts to new size
    setTimeout(() => terminalRef.current?.fit(), 50);
  };

  return (
    <div className="terminal-container">
      <div className="terminal-header">
        <div className="system-info">
          <div className="system-info-item">
            <span className="system-info-label">BRAIN:</span>
            <span className="system-info-value">{currentBrain}</span>
          </div>
          <div className="system-info-item">
            <span className="system-info-label">Mode:</span>
            <span className="system-info-value">{displayMode}</span>
          </div>
          <div className="system-info-item">
            <span className="system-info-label">Server:</span>
            <span className="system-info-value">{wsUrl || 'wss://dev-wss.brainsos.ai'}</span>
          </div>
        </div>
        <div className={`connection-status ${getStatusColor()}`}>
          {getStatusText()}
        </div>
      </div>
      
      <div className="terminal-content">
        <div className="terminal-main">
          <Terminal 
            ref={terminalRef}
            theme="dark"
            mode="command"
            onResponse={handleResponse}
            showCommandStatus={false}
          />
        </div>
        
        <div 
          ref={resizeDividerRef}
          className={`resize-divider ${isResizing ? 'resizing' : ''}`}
        />
        <div className="command-status-panel">
          <div className="status-header">
            MCP Command Status
            <button 
              className="status-toggle-button"
              onClick={toggleCommandStatus}
              title="Hide panel"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="14" 
                height="14" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
          <div className="command-status-content">
            <CommandStatus />
          </div>
        </div>
      </div>
      
      {!showStatus && (
        <button 
          className="status-toggle-button show-button"
          onClick={toggleCommandStatus}
          title="Show command status"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="14" 
            height="14" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            style={{ marginRight: '4px' }}
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Status
        </button>
      )}
    </div>
  );
};

export default TerminalContainer; 