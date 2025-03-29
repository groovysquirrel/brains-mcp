# Versioned Repository Pattern

## Overview
The Versioned Repository pattern provides a consistent way to manage versioned resources (prompts, LLMs, transformers, etc.) in BrainsOS. It handles versioning, default loading, and CRUD operations for all versioned objects using a reference-based storage system.

## Key Features
- Automatic versioning (1.0.0, 1.0.1, etc.)
- Latest version pointers
- Default resource loading
- Type-safe operations
- Consistent CRUD interface

## Storage Pattern
Resources are stored using two types of records:

1. **Reference Records** (`ref#{type}#{displayName}`):
```typescript
interface VersionReference {
  id: string;               // Immutable UUID for storage
  name: string;            // Same as displayName for compatibility
  version: string;         // Same as latestVersion for compatibility
  displayName: string;      // User-friendly name (mutable)
  latestVersion: string;    // Track latest version
  versions: {              // Version history
    [version: string]: {
      createdAt: string;
      createdBy: string;
    }
  };
  metadata: {
    createdAt: string;
    lastModifiedAt: string;
    [key: string]: any;
  };
}
```

2. **Content Records** (`{type}#{uuid}#{version}`):
- Stores actual versioned content
- Uses UUID instead of name for immutable references
- Example: `prompt#123e4567-e89b-12d3-a456-426614174000#1.0.0`

### Benefits
- Efficient renaming (only updates reference record)
- Immutable version history
- No data duplication
- Backwards compatibility via latest pointers

## Example Flow

1. **Creating a Resource**:
```typescript
// 1. Generate reference
ref#prompt#my-prompt = {
  id: "123e4567-...",
  displayName: "my-prompt",
  latestVersion: "1.0.0",
  versions: {
    "1.0.0": { createdAt: "...", createdBy: "..." }
  }
}

// 2. Store content
prompt#123e4567-...#1.0.0 = {
  name: "my-prompt",
  version: "1.0.0",
  content: { ... }
}

// 3. Update latest pointer (backwards compatibility)
prompt#latest#my-prompt = { ... }
```

2. **Renaming a Resource**:
```typescript
// Only updates the reference record
ref#prompt#new-name = {
  id: "123e4567-...",  // Same UUID
  displayName: "new-name",
  // ... versions remain unchanged
}

// Content records are unaffected
prompt#123e4567-...#1.0.0  // Stays the same
```

3. **Accessing Versions**:
```typescript
// 1. Get reference
const ref = await getItem("ref#prompt#my-prompt");

// 2. Access specific version using UUID
const content = await getItem(`prompt#${ref.id}#1.0.0`);
```

## Migration Notes
The reference system maintains backwards compatibility by:
1. Keeping latest pointers updated
2. Preserving name-based access patterns
3. Adding UUID-based storage underneath
4. Supporting gradual migration of existing data

## Best Practices
1. Always use repository methods instead of direct DynamoDB access
2. Use display names in APIs and UIs
3. Store UUIDs only in reference records
4. Maintain backwards compatibility for legacy code
5. Use proper error handling for reference lookups

## Usage Example
```typescript
class PromptRepository extends VersionedRepository<Prompt> {
  protected typeName = 'prompt';
  protected dataType = 'prompt';
  protected tableName: string;

  async getPrompts(userId: string): Promise<Prompt[]> {
    const prompts = await this.queryItems(userId, `${this.typeName}#latest#`);
    return prompts.length ? prompts : this.loadDefaults(userId);
  }
}

// Using the repository
const repo = PromptRepository.getInstance('user');
const prompts = await repo.getPrompts(userId);
```

## Default Resources
Each repository can load default resources when none exist:
1. Checks for existing resources
2. If empty, loads defaults from `data/defaults/{type}.json`
3. Saves defaults with proper versioning
4. Updates latest pointers

## Type Safety
Resources must implement the `BaseVersionedObject` interface:
```typescript
interface BaseVersionedObject {
  name: string;
  version: string;
  createdBy: string;
  metadata?: {
    createdAt?: string;
    lastModifiedAt?: string;
    [key: string]: any;
  };
}
```

## Repository Methods
- `getItems`: Get all items or specific versions
- `saveWithVersion`: Save item with versioning
- `deleteItem`: Delete specific versions
- `queryItems`: Query items by prefix
- `loadDefaults`: Load default resources

## Example Default JSON
```json
{
  "prompts": [
    {
      "name": "example-prompt",
      "version": "1.0.0",
      "createdBy": "system",
      "content": {
        "prompt": "Example prompt text",
        "defaultModel": "gpt-4"
      },
      "tags": ["default", "example"]
    }
  ]
}
```

## Creating New Repositories
Follow these steps to create a new versioned repository:

1. **Define the Type Interface**
```typescript
// types/myResourceTypes.ts
import { BaseVersionedObject } from '../repositories/base/versionedRepository';

export interface MyResource extends BaseVersionedObject {
  type: 'myresource';  // Literal type for your resource
  content: {
    // Resource-specific fields
    field1?: string;
    field2?: number;
  };
  tags?: string[];
}
```

2. **Create the Repository Class**
```typescript
// repositories/myresource/myResourceRepository.ts
import { Resource } from "sst";
import { MyResource } from '../../types/myResourceTypes';
import { VersionedRepository } from '../base/versionedRepository';

class MyResourceRepository extends VersionedRepository<MyResource> {
  protected typeName = 'myresource';
  protected dataType = 'myresource';
  protected tableName: string;
  private static instances: Record<string, MyResourceRepository> = {};

  private constructor(storageType: 'user' | 'system' = 'system') {
    super();
    this.tableName = storageType === 'user' ? Resource.userData.name : Resource.systemData.name;
  }

  static getInstance(storageType: 'user' | 'system' = 'system'): MyResourceRepository {
    if (!this.instances[storageType]) {
      this.instances[storageType] = new MyResourceRepository(storageType);
    }
    return this.instances[storageType];
  }

  // Resource-specific methods
  async getResources(userId: string): Promise<MyResource[]> {
    const resources = await this.queryItems(userId, `${this.typeName}#latest#`);
    return resources.length ? resources : this.loadDefaults(userId);
  }

  async createResource(userId: string, input: Omit<MyResource, 'version' | 'metadata'>): Promise<MyResource> {
    const resource = await this.newWithVersion(userId, input);
    await this.saveWithVersion(userId, resource);
    return resource;
  }
}

// Export instances
export const systemMyResourceRepository = MyResourceRepository.getInstance('system');
export const userMyResourceRepository = MyResourceRepository.getInstance('user');
```

3. **Add Default Resources**
```json
// data/defaults/defaultMyResources.json
{
  "myresources": [
    {
      "name": "default-resource",
      "version": "1.0.0",
      "createdBy": "system",
      "type": "myresource",
      "content": {
        "field1": "default value",
        "field2": 42
      },
      "tags": ["default"]
    }
  ]
}
```

4. **Update Data Index**
```typescript
// data/dataIndex.ts
import defaultMyResources from './defaults/defaultMyResources.json';

export const defaults = {
  // ... existing defaults
  myresources: defaultMyResources.myresources
} as const;
```

5. **Add to Resource Handler** (if using API)
```typescript
// functions/api/resources/resourcesHandler.tsx
case 'myresources':
  const myResourceRepo = isUserStore ? userMyResourceRepository : systemMyResourceRepository;
  objects = await myResourceRepo.getResources(iamUserId);
  break;
```

## Checklist for New Repositories
- [ ] Type interface extending BaseVersionedObject
- [ ] Repository class extending VersionedRepository
- [ ] Default resources JSON file
- [ ] Updated data index
- [ ] API handler integration (if needed)
- [ ] Tests for the new repository


TESTS

# 1. Create a new prompt
npx aws-api-gateway-cli-test \
--user-pool-id='us-east-1_ILoc6G1pf' \
--app-client-id='17h3pq2ua0p28akm05sde9ttnt' \
--cognito-region='us-east-1' \
--identity-pool-id='us-east-1:ab1ed509-bcc9-486d-9d7a-52f8be8c87d1' \
--invoke-url='https://dev-api.brains.patternsatscale.com' \
--api-gateway-region='us-east-1' \
--username='justin_dev@patternsatscale.com' \
--password='gr00vyT@STE' \
--path-template='/latest/resources/user/prompts' \
--method='POST' \
--body='{
  "operation": "create",
  "name": "test-prompt",
  "version": "1.0.0",
  "createdBy": "test-user",
  "content": {
    "prompt": "This is a test prompt",
    "defaultModel": "gpt-4"
  },
  "tags": ["test"]
}'

# 2. Get all prompts
npx aws-api-gateway-cli-test \
--user-pool-id='us-east-1_ILoc6G1pf' \
--app-client-id='17h3pq2ua0p28akm05sde9ttnt' \
--cognito-region='us-east-1' \
--identity-pool-id='us-east-1:ab1ed509-bcc9-486d-9d7a-52f8be8c87d1' \
--invoke-url='https://dev-api.brains.patternsatscale.com' \
--api-gateway-region='us-east-1' \
--username='justin_dev@patternsatscale.com' \
--password='gr00vyT@STE' \
--path-template='/latest/resources/user/prompts' \
--method='GET'

# 3. Get specific prompt version
npx aws-api-gateway-cli-test \
--user-pool-id='us-east-1_ILoc6G1pf' \
--app-client-id='17h3pq2ua0p28akm05sde9ttnt' \
--cognito-region='us-east-1' \
--identity-pool-id='us-east-1:ab1ed509-bcc9-486d-9d7a-52f8be8c87d1' \
--invoke-url='https://dev-api.brains.patternsatscale.com' \
--api-gateway-region='us-east-1' \
--username='justin_dev@patternsatscale.com' \
--password='gr00vyT@STE' \
--path-template='/latest/resources/user/prompts/test-prompt/1.0.0' \
--method='GET'

# 4. Get all versions of a prompt
npx aws-api-gateway-cli-test \
--user-pool-id='us-east-1_ILoc6G1pf' \
--app-client-id='17h3pq2ua0p28akm05sde9ttnt' \
--cognito-region='us-east-1' \
--identity-pool-id='us-east-1:ab1ed509-bcc9-486d-9d7a-52f8be8c87d1' \
--invoke-url='https://dev-api.brains.patternsatscale.com' \
--api-gateway-region='us-east-1' \
--username='justin_dev@patternsatscale.com' \
--password='gr00vyT@STE' \
--path-template='/latest/resources/user/prompts/test-prompt/versions' \
--method='GET'

# 5. Update a prompt
npx aws-api-gateway-cli-test \
--user-pool-id='us-east-1_ILoc6G1pf' \
--app-client-id='17h3pq2ua0p28akm05sde9ttnt' \
--cognito-region='us-east-1' \
--identity-pool-id='us-east-1:ab1ed509-bcc9-486d-9d7a-52f8be8c87d1' \
--invoke-url='https://dev-api.brains.patternsatscale.com' \
--api-gateway-region='us-east-1' \
--username='justin_dev@patternsatscale.com' \
--password='gr00vyT@STE' \
--path-template='/latest/resources/user/prompts' \
--method='POST' \
--body='{
  "operation": "update",
  "name": "test-prompt",
  "version": "1.0.1",
  "createdBy": "test-user",
  "content": {
    "prompt": "This is an updated test prompt",
    "defaultModel": "gpt-4"
  },
  "tags": ["test", "updated"]
}'

# 6. Rename a prompt
npx aws-api-gateway-cli-test \
--user-pool-id='us-east-1_ILoc6G1pf' \
--app-client-id='17h3pq2ua0p28akm05sde9ttnt' \
--cognito-region='us-east-1' \
--identity-pool-id='us-east-1:ab1ed509-bcc9-486d-9d7a-52f8be8c87d1' \
--invoke-url='https://dev-api.brains.patternsatscale.com' \
--api-gateway-region='us-east-1' \
--username='justin_dev@patternsatscale.com' \
--password='gr00vyT@STE' \
--path-template='/latest/resources/user/prompts' \
--method='POST' \
--body='{
  "operation": "rename",
  "name": "test-prompt",
  "newName": "renamed-test-prompt"
}'

# 7. Delete a specific version
npx aws-api-gateway-cli-test \
--user-pool-id='us-east-1_ILoc6G1pf' \
--app-client-id='17h3pq2ua0p28akm05sde9ttnt' \
--cognito-region='us-east-1' \
--identity-pool-id='us-east-1:ab1ed509-bcc9-486d-9d7a-52f8be8c87d1' \
--invoke-url='https://dev-api.brains.patternsatscale.com' \
--api-gateway-region='us-east-1' \
--username='justin_dev@patternsatscale.com' \
--password='gr00vyT@STE' \
--path-template='/latest/resources/user/prompts' \
--method='POST' \
--body='{
  "operation": "delete",
  "name": "renamed-test-prompt",
  "version": "1.0.0"
}'

# 8. Delete all versions
npx aws-api-gateway-cli-test \
--user-pool-id='us-east-1_ILoc6G1pf' \
--app-client-id='17h3pq2ua0p28akm05sde9ttnt' \
--cognito-region='us-east-1' \
--identity-pool-id='us-east-1:ab1ed509-bcc9-486d-9d7a-52f8be8c87d1' \
--invoke-url='https://dev-api.brains.patternsatscale.com' \
--api-gateway-region='us-east-1' \
--username='justin_dev@patternsatscale.com' \
--password='gr00vyT@STE' \
--path-template='/latest/resources/user/prompts' \
--method='POST' \
--body='{
  "operation": "delete",
  "name": "renamed-test-prompt"
}'