# Transformation Service

The transformation service provides a flexible system for converting between different views of data models. It uses a repository pattern with a plugin architecture for implementations.

## Overview

The system supports:
- Multiple object types (e.g., 'itrg-bra', 'DataTable')
- Multiple views (e.g., markdown, object, dot, csv)
- Automatic chaining of transformations through common object formats
- Customizable transformer implementations

## Architecture

### Common Object Format Pattern

Each transformer type follows a common object format pattern:

1. **Common Object Format**: Each type (e.g., ITRG-BRA, DataTable) defines its own common object format
2. **Transformers Work in Pairs**:
   - One to convert FROM a specific format TO the common format
   - One to convert FROM the common format TO a specific format

### Example: ITRG-BRA Model

```
itrg-bra/
├── itrg-bra.d.ts           # Common object format definition
├── md-object.tsx           # markdown → common object
├── object-dot.tsx          # common object → dot
└── object-csv.tsx          # common object → csv
```

### Example: DataTable Model

```
DataTable/
├── types.ts                # Common table object format
├── csv-object.tsx          # csv → common table object
├── json-object.tsx         # json → common table object
├── md-object.tsx           # markdown → common table object
├── object-csv.tsx          # common table object → csv
├── object-json.tsx         # common table object → json
└── object-md.tsx           # common table object → markdown
```

## Implementation Pattern

### 1. Define Common Object Format

First, define the common object format for your type:

```typescript
// DataTable/types.ts
export interface TableObject {
  headers: string[];
  rows: Record<string, any>[];
  metadata?: {
    title?: string;
    description?: string;
  };
}
```

### 2. Implement Transformers

Implement transformers that convert to/from the common format:

```typescript
// DataTable/json-object.tsx
export class JsonToObjectTransformer implements Transformer {
  config: TransformerConfig = {
    name: 'json-to-object',
    description: 'Converts JSON array to table object',
    version: '1.0.0',
    objectType: 'DataTable',
    fromView: 'json',
    toView: 'object'
  };

  async transform(input: string): Promise<TransformerResult> {
    // Parse JSON and convert to TableObject
    const jsonData = JSON.parse(input);
    const headers = Object.keys(jsonData[0] || {});
    const rows = jsonData.map(obj => 
      headers.reduce((row, header) => {
        row[header] = obj[header] ?? '';
        return row;
      }, {} as Record<string, any>)
    );
    return {
      success: true,
      data: { headers, rows }
    };
  }

  validate(input: any): Promise<boolean> {
    // Validate JSON format and structure
    return Promise.resolve(
      typeof input === 'string' &&
      Array.isArray(JSON.parse(input)) &&
      JSON.parse(input).every(item => typeof item === 'object')
    );
  }
}
```

### 3. Register Transformers

Register transformers in the system:

```typescript
// DataTable/index.ts
export function registerDataTableTransformers(repository: TransformerRepository): void {
  repository.registerTransformer(new CsvToObjectTransformer());
  repository.registerTransformer(new JsonToObjectTransformer());
  repository.registerTransformer(new ObjectToCsvTransformer());
  // ... register other transformers
}
```

## Using Transformers

### Direct Transformation

```typescript
const transformer = await repository.getTransformer('DataTable', 'json', 'object');
const result = await transformer.transform(jsonData);
```

### Chained Transformation

The system can automatically chain transformations through the common format:

```typescript
// System will find path: json → object → markdown
const result = await repository.findTransformationPath('DataTable', 'json', 'markdown');
```

## Error Handling

Transformers provide detailed error information:

```typescript
{
  success: false,
  error: "Invalid JSON format",
  errorDetails: "Input must be a JSON array",
  metadata: {
    objectType: "DataTable",
    fromView: "json",
    toView: "object",
    processingTimeMs: 123,
    timestamp: "2024-04-16T12:00:00Z"
  }
}
```

## Best Practices

1. **Common Object Format**:
   - Define a clear, well-documented common object format
   - Include all necessary metadata
   - Make it extensible for future needs

2. **Transformer Implementation**:
   - Keep transformers focused on single responsibility
   - Validate input formats
   - Provide clear error messages
   - Include performance optimizations for large data

3. **Testing**:
   - Test each transformer independently
   - Test transformation chains
   - Include edge cases and error conditions

4. **Documentation**:
   - Document the common object format
   - Document supported input/output formats
   - Include examples of usage

## Future Enhancements

1. Support for more complex transformation chains
2. Validation of intermediate formats
3. Caching of common transformations
4. Performance metrics and optimization
5. Support for async transformations
6. GUI for transformer configuration