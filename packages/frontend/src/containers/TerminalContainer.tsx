import React, { useRef, useEffect, useState } from 'react';
import Terminal, { TerminalRef } from '../components//Terminal';
import { ExecutionResult, BrainConnectionService } from '../components/BRAIN_Terminal/BrainConnectionService';
import { useAppContext } from '../lib/contextLib';
import { fetchAuthSession } from 'aws-amplify/auth';
import './css/TerminalContainer.css';
import { ConnectionStatus } from '../components/BRAIN_Terminal/WebSocketConnection';

type TerminalMode = 'raw' | 'content' | 'source';

/**
 * TerminalContainer component that manages the terminal interface
 * Handles authentication, connection status, and terminal responses
 */
const TerminalContainer: React.FC = () => {
  const terminalRef = useRef<TerminalRef>(null);
  const { isAuthenticated } = useAppContext();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [currentAgent, _setCurrentAgent] = useState<string>('default');
  const [displayMode, setDisplayMode] = useState<TerminalMode>('content');
  const [wsUrl, _setWsUrl] = useState<string>('');

  useEffect(() => {
    BrainConnectionService.initialize();
  }, []);

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

  return (
    <div className="terminal-container">
      <div className="terminal-header">
        <div className="system-info">
          <div className="system-info-item">
            <span className="system-info-label">Agent:</span>
            <span className="system-info-value">{currentAgent}</span>
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
      <div className="terminal-wrapper">
        <Terminal 
          ref={terminalRef}
          theme="dark"
          mode="command"
          onResponse={handleResponse}
        />
      </div>
    </div>
  );
};

export default TerminalContainer; 