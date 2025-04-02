# BRAINS (Broad-Range Artificial Intelligence Node System)

## Overview

BRAINS is a serverless implementation of the Model Context Protocol (MCP), designed to create scalable, stateless AI nodes that can process complex interactions between users and language models. Unlike traditional MCP implementations, BRAINS leverages serverless architecture to enable dynamic instantiation of nodes with unique profiles.

## Core Architecture

### Components

```
BRAINS Node
├── Model Controller
│   ├── WebSocket Handler - Real-time chat sessions
│   └── Model Orchestration - Coordinates LLM and MCP interactions
│
├── LLM Gateway
│   ├── LangChain Integration - Standardized model access
│   ├── Provider Management - Bedrock, Azure OpenAI, etc.
│   └── Model Configuration - Node-specific model settings
│
└── MCP Server
    ├── Tools - Executable functions
    ├── Resources - Data access endpoints
    ├── Transformers - Data transformation utilities
    └── Prompts - Reusable prompt templates
```

### Repository Layer
The repository layer provides a standardized interface for accessing and managing system resources:

```
Repository (DynamoDB)
├── Conversations - Chat history and context
├── Flows - Interaction patterns
├── LLMs - Model configurations and provider settings
├── Models - Node behavioral models
├── Prompts - Template storage and subprompt library
└── System - Node configuration and settings
```

## Directory Structure

```
packages/brainsOS/
├── controller/           # Model Controller implementation
│
├── data/                # Static data and resources
│
├── docs/                # System documentation
│
├── handlers/            # API and WebSocket handlers
│   ├── api/
│   │   ├── mcp/              # MCP Server REST endpoints
│   │   │   ├── mcpHandler.tsx    # Main MCP request handler
│   │   │   └── mcpTypes.tsx      # MCP type definitions
│   │   └── resources/        # Resource API endpoints
│   └── websocket/
│       └── llm-gateway/      # WebSocket handlers for LLM interactions
│           ├── chat.ts           # Real-time chat handling
│           ├── default.ts        # Default connection handler
│           └── gatewayHandler.ts # Main gateway logic
│
├── mcp/                 # MCP core implementation
│   ├── tools/            # MCP tool implementations
│   ├── resources/        # MCP resource implementations
│   ├── transformers/     # Data transformation utilities
│   └── prompts/          # Prompt templates and handlers
│       ├── mcpPromptHandler.tsx  # Prompt processing
│       ├── mcpPromptIndex.tsx    # Prompt registry
│       └── oneSentence/          # Specialized prompts
│
├── system/              # Core system components
│   ├── repositories/     # Data access layer
│   │   ├── base/            # Base repository patterns
│   │   ├── conversation/    # Chat history management
│   │   ├── flows/          # Interaction flow patterns
│   │   ├── llm/            # LLM configurations
│   │   ├── model/          # Node behavior models
│   │   ├── prompt/         # Prompt storage
│   │   ├── system/         # System settings
│   │   └── transformer/    # Transformation rules
│   └── services/
│       └── llm-gateway/    # LLM interaction service
│           ├── llmGateway.ts   # Main gateway implementation
│           ├── types.ts        # Gateway type definitions
│           └── README.md       # Gateway documentation
│
├── test_scripts/        # Testing infrastructure
│   ├── mcp/              # MCP-specific tests
│   ├── resources/        # Resource testing
│   ├── services/         # Service testing
│   ├── test/             # Unit tests
│   ├── packages/         # Package-specific tests
│   ├── test_utils.sh     # Test utilities and helpers
│   ├── .env.test         # Test environment configuration
│   └── .env.test.example # Example test configuration
│
├── utils/               # Utility functions and helpers
│   ├── http/             # HTTP utilities
│   └── logging/          # Logging infrastructure
│
├── jest.config.js       # Jest test configuration
└── jest.setup.ts        # Jest setup and initialization
```

### Directory Details

#### Controller
Contains the Model Controller implementation, which orchestrates interactions between the user, LLM Gateway, and MCP Server.

#### Data
Stores static data and resources used across the system, including default configurations and templates.

#### Docs
System documentation, including architecture diagrams, API specifications, and implementation guides.

#### Handlers
API and WebSocket handlers that manage external communications:
- `api/mcp`: MCP Server REST endpoint implementations
- `api/resources`: Resource management endpoints
- `websocket/llm-gateway`: Real-time chat and LLM interaction handlers

#### MCP
Core MCP implementation components:
- `tools`: Executable functions that LLMs can invoke
- `resources`: Data access endpoints and resource definitions
- `transformers`: Data transformation utilities
- `prompts`: Template management and processing

#### System
Core system components and services:
- `repositories`: Data access layer with DynamoDB implementations
- `services`: Core service implementations, including the LLM Gateway

#### Test Scripts
Comprehensive testing infrastructure:
- Component-specific test suites
- Test utilities and helpers
- Environment configurations
- Integration test scripts

#### Utils
Common utilities and helper functions:
- `http`: HTTP request/response handling
- `logging`: Logging infrastructure and formatters

### Implementation Guidelines

1. **Adding New Features**
   - Place handlers in appropriate `handlers/` subdirectories
   - Implement data access in `system/repositories`
   - Add MCP components to respective `mcp/` subdirectories

2. **Testing**
   - Add unit tests in `test_scripts/test`
   - Create integration tests in appropriate `test_scripts` subdirectory
   - Update test utilities in `test_utils.sh` as needed

3. **Documentation**
   - Add component documentation in `docs/`
   - Update README files in component directories
   - Include usage examples and configuration guides

## Component Details

### Model Controller
- Central orchestrator for user interactions
- Manages WebSocket connections for real-time chat
- Coordinates between LLM Gateway and MCP Server
- Processes responses and manages conversation flow

### LLM Gateway
- Provides standardized access to language models via LangChain
- Manages model provider configurations (Bedrock, Azure OpenAI)
- Handles model-specific settings and fallbacks
- Implements response streaming and error handling

### MCP Server
- Implements Model Context Protocol specification
- Manages tools, resources, and transformers
- Handles prompt template processing and execution
- Provides REST API for MCP operations

### Repository Layer
- Implements data persistence using DynamoDB
- Manages system resources and configurations
- Stores reusable components (prompts, transformers)
- Maintains node-specific settings and profiles

## Implementation Notes

### File Placement Guidelines
1. **New MCP Tools**
   - Add implementation to `mcp/tools/`
   - Register in MCP Server handler

2. **Custom Prompts**
   - Store templates in `mcp/prompts/`
   - Add handlers in `mcpPromptHandler.tsx`

3. **Model Configurations**
   - Define in repository layer under `system/repositories/llm/`
   - Configure in LLM Gateway service

4. **Data Transformers**
   - Implement in `mcp/transformers/`
   - Register in MCP Server

## Getting Started

[TODO: Add setup and deployment instructions]

## Development

[TODO: Add development guidelines and contribution instructions]

## References

- [Model Context Protocol Specification](https://modelcontextprotocol.io/introduction)
- [LangChain Documentation](https://js.langchain.com/docs)
