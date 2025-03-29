# DynamoDB Data Access Patterns

## Table Structure
- Partition Key: `userId`
- Sort Key: `typeName`

This structure efficiently supports our versioning system while maintaining data isolation per user.

## Key Patterns
- Versioned records: `{type}#{name}#{version}` (e.g., "prompt#my-prompt#1.0.0")
- Latest pointers: `{type}#latest#{name}` (e.g., "prompt#latest#my-prompt")

## Query Optimization Notes

### Version Queries
When fetching version lists (e.g., `/latest/resources/user/prompts/gr00vy/versions`), we optimize by:
1. Using `ProjectionExpression` to fetch only version and metadata fields
2. Using `FilterExpression` to exclude 'latest' pointers at the DB level
3. Leveraging the table's natural structure where:
   - `userId` partitions isolate user data
   - `begins_with(typeName, ...)` efficiently filters versions

```typescript
// Efficient version query example
const command = new QueryCommand({
  TableName: this.tableName,
  KeyConditionExpression: 'userId = :userId AND begins_with(typeName, :typePrefix)',
  ProjectionExpression: 'version, metadata',
  FilterExpression: 'NOT contains(typeName, :latest)',
  ExpressionAttributeValues: {
    ':userId': userId,
    ':typePrefix': `${type}#${name}#`,
    ':latest': '#latest#'
  }
});
```

### GSI Considerations
While Global Secondary Indexes (GSIs) can be useful for some access patterns, they aren't needed for version queries because:
1. We always have the `userId` from authentication
2. Queries are always scoped to a single user's partition
3. The sort key (`typeName`) already supports efficient prefix queries
4. Adding a GSI would create unnecessary data duplication and cost

### RCU Optimization
To minimize Read Capacity Unit (RCU) consumption:
1. Only fetch needed attributes via `ProjectionExpression`
2. Filter 'latest' pointers at query time
3. Use the table's natural partitioning by `userId`
4. Leverage sort key patterns for efficient version filtering

This approach provides optimal performance while maintaining data isolation and minimizing costs.
