// Common table object format
export interface TableObject {
  headers: string[];
  rows: Record<string, string>[];
  metadata?: {
    title?: string;
    description?: string;
  };
}

// Type guard for table formats
export function isValidTableFormat(format: string): format is 'csv' | 'json' | 'markdown'; 