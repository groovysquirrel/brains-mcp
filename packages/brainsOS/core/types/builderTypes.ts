export interface Builder {
  id?: string;
  type?: 'builder';
  name: string;
  version: string;
  description?: string;
  created?: string;
  modified?: string;
  userid?: string;
  metadata?: Record<string, unknown>;
  parameters?: Record<string, unknown>;
}

// Add any additional types or interfaces related to builders here 