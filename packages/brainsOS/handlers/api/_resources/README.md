# Resources API Handler

Uses RESTful URL patterns to manage versioned resources with a "latest" pointer system.

## URL Patterns
- GET /latest/resources/{store}/{type} - Get all latest versions
- GET /latest/resources/{store}/{type}/{name} - Get latest version of specific item
- GET /latest/resources/{store}/{type}/{name}/versions - Get all versions of specific item
- GET /latest/resources/{store}/{type}/{name}/{version} - Get specific version
- POST /latest/resources/{store}/{type} - Create/update/delete items
- POST /latest/resources/{store}/{type}/{name}/rename - Rename an item

Where:
- `{store}`: 'user' or 'system'
- `{type}`: resource type (e.g., 'prompts', 'agents', etc.)

## Key Features
- Maintains both versioned records and "latest" pointers
- Supports querying all versions of a specific resource
- Supports renaming while preserving version history
- Separates user and system data through the URL path
- Uses DynamoDB with composite keys: `{type}#{name}#{version}` and `{type}#latest#{name}`
- Includes validation using Zod schemas
- Falls back to defaults if no user data exists
- Handles both single-item and bulk operations

## Examples

```typescript
// Get all latest versions of prompts
GET /latest/resources/user/prompts

// Get latest version of specific prompt
GET /latest/resources/user/prompts/my-prompt

// Get all versions of specific prompt
GET /latest/resources/user/prompts/my-prompt/versions

// Get specific version
GET /latest/resources/user/prompts/my-prompt/1.0.0

// Create/update prompt (creates/updates both versioned and latest)
POST /latest/resources/user/prompts
{
  "operation": "create",
  "name": "my-prompt",
  "content": {
    "prompt": "This is my prompt",
    "defaultModel": "meta.llama3-70b-instruct-v1:0"
  },
  "version": "1.0.0",
  "createdBy": "user",
  "tags": ["demo", "test"]
}

// Rename a prompt (preserves all versions)
POST /latest/resources/user/prompts/my-prompt/rename
{
  "newName": "renamed-prompt"
}

// Delete specific version (preserves latest pointer)
POST /latest/resources/user/prompts
{
  "operation": "delete",
  "name": "my-prompt",
  "version": "1.0.0"
}
```

## Storage Pattern
Resources are stored in DynamoDB using three types of records:
1. Reference records: `ref#{type}#{name}` - Tracks version history and metadata
2. Latest pointers: `{type}#latest#{name}` - Points to current version
3. Versioned records: `{type}#{uuid}#{version}` - Immutable version content

This allows:
- Efficient querying of latest versions
- Maintaining complete version history
- Renaming without duplicating version content
- Consistent version numbering across renames

## Test Cases

### Basic Version Management
```bash
# 1. Create initial version
POST /latest/resources/user/prompts
{
  "name": "test-prompt",
  "content": "Version 1",
  "createdBy": "test-user"
}

# 2. Create multiple versions
POST /latest/resources/user/prompts
{
  "name": "test-prompt",
  "content": "Version 2",
  "createdBy": "test-user"
}

# 3. Verify version list
GET /latest/resources/user/prompts/test-prompt/versions
# Should show versions 1.0.0, 1.0.1
```

### Rename Operations
```bash
# 1. Create prompt with multiple versions
POST /latest/resources/user/prompts (create 2-3 versions)

# 2. Rename prompt
POST /latest/resources/user/prompts/test-prompt/rename
{
  "newName": "renamed-prompt"
}

# 3. Verify operations
GET /latest/resources/user/prompts/test-prompt 
# Should return 404

GET /latest/resources/user/prompts/renamed-prompt
# Should return latest version

GET /latest/resources/user/prompts/renamed-prompt/versions
# Should show all previous versions

# 4. Create new version after rename
POST /latest/resources/user/prompts
{
  "name": "renamed-prompt",
  "content": "New version after rename",
  "createdBy": "test-user"
}
# Should continue version numbering from previous versions
```

### Edge Cases
- Renaming to existing name should fail
- Deleting renamed prompt should clean up all versions
- Version numbering should continue correctly after rename
- All versions should remain accessible after rename


TESTS

