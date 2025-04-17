// Define the possible types of capability sections
export type CapabilityType = 'Defining' | 'Shared' | 'Enabling';

// Define possible color types based on legend markers
export type ColorMarker = '*' | '**' | '***' | '****' | '*****';
export type ColorType = string; // Allow any color string

// Base interface for color support
interface ColorableEntity {
  color?: ColorType;
}

// Interface for Level 2 capabilities (most granular level)
export interface Level2Capability extends ColorableEntity {
  name: string;
  description?: string;
}

// Interface for Level 1 capabilities which contain Level 2 capabilities
export interface Level1Capability extends ColorableEntity {
  name: string;
  description?: string;
  level2Capabilities: Level2Capability[];
}

// Interface for Value Streams which contain Level 1 capabilities
export interface ValueStream extends ColorableEntity {
  name: string;
  description?: string;
  level1Capabilities: Level1Capability[];
}

// Main interface for the parsed content structure
export interface ITRGObject {
  definingCapabilities: {
    valueStreams: ValueStream[];
  };
  sharedCapabilities: Level1Capability[];
  enablingCapabilities: Level1Capability[];
  legend?: {
    [key in ColorMarker]?: ColorType;
  };
  layout?: string[]; // Array of custom layout connections
}
