import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { TerminalManager } from './terminal/TerminalManager';
import 'xterm/css/xterm.css';
import styles from './Console.module.css';

interface ConsoleProps {
  theme?: 'dark' | 'light' | 'green';
  welcomeMessage?: string;
  prompt?: string;
  mode?: 'command' | 'prompt';
  onResponse?: (response: any) => void;
  style?: React.CSSProperties;
}

export interface ConsoleRef {
  fit: () => void;
}

const Console = forwardRef<ConsoleRef, ConsoleProps>((props, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<TerminalManager | null>(null);
  const onResponseRef = useRef(props.onResponse);

  useEffect(() => {
    onResponseRef.current = props.onResponse;
  }, [props.onResponse]);

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

  useImperativeHandle(ref, () => ({
    fit: () => {
      terminalRef.current?.fit();
    }
  }));

  return <div ref={containerRef} className={`${styles.console} ${styles[props.theme || 'dark']}`} style={props.style} />;
});

export default Console;