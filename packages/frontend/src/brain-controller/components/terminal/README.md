# BRAINS OS Terminal Implementation

This directory contains the terminal implementation for BRAINS OS, providing a command-line interface for interacting with the system.

## Components

### 1. TerminalManager (TerminalManager.tsx)
The main terminal UI component that handles:
- Terminal display and rendering using xterm.js
- Command input and history
- Message formatting and display
- Terminal state management
- User interaction handling

### 2. FrontendExecutor (FrontendExecutor.ts)
Handles command execution and WebSocket communication:
- Manages local and remote command execution
- Handles WebSocket connection and authentication
- Processes command responses and errors
- Supports special commands (clear, connect, help, etc.)
- Manages LLM interactions (prompts and conversations)

### 3. TerminalModes (TerminalModes.ts)
Defines message display formatting:
- Three display modes: 'raw', 'content', 'source'
- Formats messages based on selected mode
- Provides consistent message presentation

## Architecture

The terminal implementation follows a layered architecture:

1. **UI Layer (TerminalManager)**
   - Handles all user interface aspects
   - Manages terminal display and input
   - Provides visual feedback and formatting

2. **Execution Layer (FrontendExecutor)**
   - Processes commands and manages execution
   - Handles WebSocket communication
   - Manages command state and responses

3. **Formatting Layer (TerminalModes)**
   - Provides flexible message display options
   - Separates display logic from core functionality

## Features

- **Command History**: Up/down arrow navigation through command history
- **Multiple Display Modes**: 
  - `raw`: Shows complete JSON payloads
  - `content`: Shows formatted content (default)
  - `source`: Shows source-prefixed content
- **Local Commands**:
  - `clear`/`cls`: Clear terminal
  - `connect`: Connect to WebSocket server
  - `disconnect`: Disconnect from WebSocket server
  - `help`: Show available commands
  - `status`: Show connection status
- **LLM Integration**:
  - `llm/prompt`: Send one-off prompts
  - `llm/conversation`: Start or continue conversations
- **WebSocket Support**:
  - Secure connection with authentication
  - Automatic reconnection handling
  - Command timeout management

## Usage

1. **Basic Terminal Usage**:
```typescript
const terminal = new TerminalManager(containerElement, {
  welcomeMessage: 'Welcome to BRAINS OS',
  mode: 'command',
  displayMode: 'content'
});
```

2. **Executing Commands**:
```typescript
const result = await FrontendExecutor.execute('help', 'command');
```

3. **Changing Display Mode**:
```typescript
terminal.updateOptions({ displayMode: 'raw' });
```

## Error Handling

The terminal implementation includes comprehensive error handling:
- WebSocket connection errors
- Command execution timeouts
- Authentication failures
- Invalid command handling

## Security

- Uses AWS Amplify for authentication
- Secure WebSocket connections with JWT tokens
- Proper error handling and user feedback
- No sensitive information exposure in logs

## Dependencies

- xterm.js: Terminal emulation
- AWS Amplify: Authentication
- WebSocket: Real-time communication
