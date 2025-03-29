declare module 'react-console-emulator' {
    import { ReactElement } from 'react';
  
    interface TerminalProps {
      commands?: { [key: string]: any };
      promptLabel?: string;
      style?: React.CSSProperties;
      styleEchoBack?: string;
      contentStyle?: React.CSSProperties;
      promptLabelStyle?: React.CSSProperties;
      inputTextStyle?: React.CSSProperties;
      commandCallback?: (command: string, args: string[]) => Promise<string> | string;
      noDefaults?: boolean;
      dangerMode?: boolean;
      noInitialContent?: boolean;
      welcomeMessage?: string;
    }
  
    interface TerminalRef {
      pushToStdout: (text: string) => void;
      clearStdout: () => void;
    }
  
    export default class Terminal extends React.Component<TerminalProps> {
      pushToStdout(text: string): void;
      clearStdout(): void;
    }
  }