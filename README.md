# BRAINS OS - version MCP

A modern, serverless operating system for AI systems and agents, built with SST, React, and TypeScript. This project provides a robust framework for managing Large Language Models (LLMs) and specialized AI agents through the MCP (Model Control Protocol) with a unified command system and shared operating template.

## Overview

Brains MCP is designed to:
- Manage and orchestrate AI workflows through a visual interface
- Provide a unified command system for AI operations
- Enable secure, scalable deployment of AI subminds
- Support comprehensive prompt management and benchmarking
- Maintain strict data ownership and audit capabilities

## Key Features

### Current Version
- Visual flow editor for AI workflow design
- Unified command system for AI operations
- Secure authentication and authorization
- Real-time workflow execution
- Comprehensive audit logging

### Coming Soon
- Advanced prompt library with benchmarking capabilities
- MCP (Model Control Protocol) client/server implementation
- Enhanced state management and persistence
- Extended model support and integration
- Advanced templating system

## Architecture

The system is built on modern cloud-native technologies:
- **Frontend**: React with TypeScript and Flow-based UI
- **Backend**: AWS Lambda functions
- **Authentication**: AWS Cognito
- **Database**: DynamoDB
- **Infrastructure**: SST (Serverless Stack)

## Getting Started

### Prerequisites

- Node.js (v16 or later)
- AWS account with configured credentials
- Git

### Installation

1. Clone the repository:
   ```bash
   git clone [repository-url]
   cd brains-mcp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npx sst dev
   ```

### Test Environment Setup

1. Create your test environment file:
   ```bash
   cp .env.test.example .env.test
   chmod 600 .env.test  # Set secure file permissions
   ```

2. Configure your test environment by editing `.env.test`:
   ```bash
   # API Configuration
   API_STAGE=dev
   API_VERSION=latest
   API_BASE_URL=https://dev-api.yoururl-in-aws-route53.com

   # AWS Cognito Authentication (Required)
   COGNITO_USERNAME=your_test_username@example.com
   COGNITO_PASSWORD=your_test_password
   USER_POOL_ID=us-east-1_xxxxxx
   APP_CLIENT_ID=xxxxxxxxxxxxxxxxxx
   COGNITO_REGION=us-east-1
   IDENTITY_POOL_ID=us-east-1:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   API_GATEWAY_REGION=us-east-1
   ```

3. Create a test user in Cognito:
   ```bash
   # Sign up a new user
   aws cognito-idp sign-up \
     --region <COGNITO_REGION> \
     --client-id <APP_CLIENT_ID> \
     --username <COGNITO_USERNAME> \
     --password <COGNITO_PASSWORD>

   # Verify the user's email (requires admin privileges)
   aws cognito-idp admin-confirm-sign-up \
     --region <COGNITO_REGION> \
     --user-pool-id <USER_POOL_ID> \
     --username <COGNITO_USERNAME>
   ```

4. Verify your test setup:
   ```bash
   # Run a basic test to verify configuration
   ./packages/brainsOS/test_scripts/mcp/test_tools.sh
   ```

#### Security Notes

- Never commit `.env.test` to version control
- Keep test credentials secure and rotate them regularly
- Ensure `.env.test` has correct permissions (600)
- Review test scripts for any hardcoded sensitive data
- Use separate test credentials from production

#### Test Script Organization

```
packages/brainsOS/test_scripts/
├── mcp/                    # MCP-specific test scripts
├── resources/             # Resource API test scripts
├── services/             # Service API test scripts
└── test_utils.sh         # Common test utilities
```

#### Running Tests

1. Individual test scripts:
   ```bash
   # Run specific test suite
   ./packages/brainsOS/test_scripts/mcp/test_tools.sh
   
   # Run with specific starting point
   ./packages/brainsOS/test_scripts/mcp/test_tools.sh -5  # Start from step 5
   ```

2. Interactive features:
   - Press [Enter] to continue to next test
   - Press [R] to retry the last command
   - Press [Q] to quit the test suite

3. Reviewing results:
   - ✅ indicates passed tests
   - ❌ indicates failed tests
   - ⚠️ indicates warnings or important notices

#### Troubleshooting

1. Permission Issues:
   ```bash
   # Reset file permissions
   chmod 600 .env.test
   chmod 755 packages/brainsOS/test_scripts/*.sh
   ```

2. Authentication Errors:
   - Verify Cognito credentials in `.env.test`
   - Check API endpoint configuration
   - Ensure AWS region settings are correct

3. Common Issues:
   - Token expiration: Scripts handle this automatically
   - Rate limiting: Built-in delays prevent API throttling
   - Missing environment variables: Validation will catch these

## Project Structure

```
brains-mcp/
├── packages/
│   ├── frontend/           # React-based flow editor
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── nodes/
│   │   │   └── core/
│   │   └── ...
│   └── brainsOS/          # Core backend system
│       ├── commands/      # Command implementations
│       ├── core/         # Core services
│       ├── functions/    # API functions
│       └── utils/        # Shared utilities
├── infra/                # Infrastructure code
└── sst.config.ts        # SST configuration
```

## Development

### Local Development

```bash
npx sst dev
```

### Deployment

```bash
npx sst deploy --stage <stage>
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

[License Type] - See LICENSE file for details
