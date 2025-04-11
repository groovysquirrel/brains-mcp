import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { TerminalManager } from './terminal/TerminalManager';
import 'xterm/css/xterm.css';
import './Terminal.css';

/**
 * Props for the Terminal component
 */
interface TerminalProps {
  /** Theme for the terminal ('dark' | 'light' | 'green') */
  theme?: 'dark' | 'light' | 'green';
  /** Welcome message displayed when terminal starts */
  welcomeMessage?: string;
  /** Custom prompt string (defaults to 'brainsOS>') */
  prompt?: string;
  /** Terminal mode ('command' | 'prompt') */
  mode?: 'command' | 'prompt';
  /** Callback for handling terminal responses */
  onResponse?: (response: any) => void;
  /** Additional CSS styles */
  style?: React.CSSProperties;
}

/**
 * Reference interface for the Terminal component
 * Allows parent components to control the terminal
 */
export interface TerminalRef {
  /** Adjusts terminal size to fit container */
  fit: () => void;
  /** Executes a command in the terminal */
  runCommand: (command: string) => void;
  /** Updates the welcome message */
  updateWelcomeMessage: (message: string) => void;
}

/**
 * Terminal component that provides a command-line interface
 * Uses xterm.js for terminal emulation and TerminalManager for command handling
 */
const Terminal = forwardRef<TerminalRef, TerminalProps>((props, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<TerminalManager | null>(null);
  const onResponseRef = useRef(props.onResponse);

  // Update response callback when props change
  useEffect(() => {
    onResponseRef.current = props.onResponse;
  }, [props.onResponse]);

  // Initialize terminal when component mounts
  useEffect(() => {
    if (containerRef.current && !terminalRef.current) {
      terminalRef.current = new TerminalManager(containerRef.current, {
        welcomeMessage: props.welcomeMessage,
        prompt: props.prompt,
        mode: props.mode,
        onResponse: (response) => {
          onResponseRef.current?.(response);
        }
      });
    }
  }, []);

  // Expose terminal methods to parent components
  useImperativeHandle(ref, () => ({
    fit: () => {
      terminalRef.current?.fit();
    },
    runCommand: (command: string) => {
      terminalRef.current?.runCommand(command);
    },
    updateWelcomeMessage: (message: string) => {
      if (terminalRef.current) {
        terminalRef.current.updateOptions({ welcomeMessage: message });
      }
    }
  }));

  return (
    <div className="terminal-wrapper">
      <div 
        ref={containerRef} 
        className={`terminal ${props.theme || 'dark'}`} 
        style={props.style} 
      />
    </div>
  );
});

export default Terminal; 