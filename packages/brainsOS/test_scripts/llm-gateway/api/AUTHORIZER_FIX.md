# Fixing API Gateway Authentication Issues

## Current Issue

The LLM Gateway API has an authentication issue where the user ID is not being passed from the Authorizer to the Lambda function. This causes the error:

```
Error: Missing required user ID. Authorization required.
```

## Temporary Solutions

1. **Parse JWT Token Directly** (implemented)
   - The API handler now parses the JWT token directly from the `Authorization` header
   - It extracts the user ID from the `sub` claim in the token
   - This is a workaround rather than the ideal solution

2. **Include User ID in Request Body** 
   - The new test script (`api_with_extracted_user.test.sh`) automatically includes the user ID in the request body
   - This approach works but requires client-side knowledge of the user ID

## Permanent Solution: Infrastructure Update

To fix this properly, update the API Gateway configuration in the infrastructure:

### 1. Update the API Gateway Route

Edit `/Users/pats/Development/brains-mcp/infra/apps/llm-gateway.ts`:

```typescript
// LLM Gateway API routes
brainsOS_API.route("POST /llm-gateway/{action}", {
  authorizer: "api-gateway-authorizer",  // Add this line
  permissions: [ bedrockPermissions ],
  link: [userData],
  handler: "packages/brainsOS/handlers/api/llm-gateway/gatewayHandler.handler",
  copyFiles: [{ from: "packages/brainsOS/llm-gateway-v2/config/", to: "config" }]
});
```

### 2. Ensure Authorizer Context is Passed

The authorizer needs to be configured to pass the user context to the Lambda function. Make sure the authorizer in `handlers/auth/authorizer.ts` includes a `context` object with the user ID:

```typescript
const generatePolicy = (principalId: string, effect: string, resource: string, email: string): AuthResponse => {
  const authResponse: AuthResponse = {
    principalId,
    context: { 
      userId: principalId,  // Ensure this is present
      email
    }
  };
  
  // Rest of the function...
};
```

### 3. Deploy the Updated Infrastructure

After making these changes, deploy the updated infrastructure:

```bash
cd infra
sst deploy --stage dev
```

## Testing the Fix

After deploying the fix, use the standard test script to validate that the API authorizer correctly passes the user ID:

```bash
cd packages/brainsOS/test_scripts/llm-gateway/api
./api.test.sh
```

The API should now receive the user ID via the authorizer context without needing to pass it explicitly in the request body.

## Additional Recommendations

1. **Consistent Authorization Model**: Use the same authorization model for WebSocket and REST APIs
2. **Access Logs**: Enable access logging on the API Gateway to debug future authentication issues
3. **Test Both Auth Methods**: Test with both explicit user IDs and authorizer-provided user IDs
4. **Documentation**: Update the API documentation to clarify the authentication requirements 