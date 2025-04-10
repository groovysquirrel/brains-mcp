import React, { useRef, useEffect, useState } from 'react';
import Console, { ConsoleRef } from '../components/Console';
import { WebSocketService } from '../lib/websocket';
import { ExecutionResult } from '../components/terminal/FrontendExecutor';
import { useAppContext } from '../lib/contextLib';
import { fetchAuthSession } from 'aws-amplify/auth';
import config from '../config';
import './css/ConsoleContainer.css';

const ConsoleContainer: React.FC = () => {
  const consoleRef = useRef<ConsoleRef>(null);
  const { isAuthenticated } = useAppContext();
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [authStatus, setAuthStatus] = useState<'checking' | 'authenticated' | 'unauthenticated'>('checking');

  useEffect(() => {
    // Check authentication status when component mounts
    const checkAuth = async () => {
      try {
        if (isAuthenticated) {
          await fetchAuthSession();
          setAuthStatus('authenticated');
        } else {
          setAuthStatus('unauthenticated');
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
        setAuthStatus('unauthenticated');
      }
    };

    checkAuth();
  }, [isAuthenticated]);

  useEffect(() => {
    const handleResize = () => {
      consoleRef.current?.fit();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleResponse = (response: ExecutionResult) => {
    console.log('Console response:', response);
    
    // Update connection status based on responses
    if (response.isLocalCommand) {
      if (response.data?.message?.includes('Connecting to WebSocket')) {
        setConnectionStatus('connecting');
      } else if (response.data?.message?.includes('Disconnected from WebSocket')) {
        setConnectionStatus('disconnected');
      } else if (response.data?.message?.includes('Connected to WebSocket server.')) {
        setConnectionStatus('connected');
      }
    }
  };

  // Get WebSocket URL from config
  const getWebSocketUrl = () => {
    return config.api.websocket;
  };

  return (
    <div className="container" style={{ height: 'calc(100vh - 120px)' }}>
      <h1>Console</h1>
      <div className="connection-status">
        Status: 
        <span className={`status-indicator ${connectionStatus}`}>
          {connectionStatus === 'connected' && ' Connected'}
          {connectionStatus === 'connecting' && ' Connecting...'}
          {connectionStatus === 'disconnected' && ' Disconnected'}
        </span>
        
        {authStatus === 'checking' && (
          <span className="connection-help">Checking authentication status...</span>
        )}
        
        {authStatus === 'unauthenticated' && (
          <span className="auth-warning">
            <i className="bi bi-exclamation-triangle-fill"></i> You need to log in to connect to the WebSocket server
          </span>
        )}
        
        {authStatus === 'authenticated' && connectionStatus === 'disconnected' && (
          <span className="connection-help">
            Type <code>connect</code> to connect to the server
          </span>
        )}
      </div>
      
      <div style={{ height: 'calc(100% - 80px)' }}>
        <Console 
          ref={consoleRef}
          theme="dark"
          welcomeMessage={`Welcome to BRAINS OS Console.
Type 'help' for available commands.
WebSocket server: ${getWebSocketUrl()}
${authStatus === 'authenticated' 
  ? 'Authentication: ✅ Authenticated\nType \'connect\' to connect to the server.' 
  : 'Authentication: ❌ Not authenticated\nPlease log in to use the WebSocket features.'}`}
          prompt="brains> "
          mode="command"
          onResponse={handleResponse}
        />
      </div>
    </div>
  );
};

export default ConsoleContainer; 