/**
 * MCP Parser
 * 
 * Utility functions for parsing and extracting MCP commands from LLM responses.
 * This parser handles the extraction and validation of MCP commands following
 * the Model Context Protocol standard.
 */

import { Logger } from './logging/Logger';

// Initialize logger
const logger = new Logger('MCPParser');

/**
 * Interface for MCP command structure
 */
export interface MCPCommand {
  name: string;
  args: Record<string, any>;
  requestId?: string;
}

/**
 * Interface for parsed MCP response
 */
export interface ParsedMCPResponse {
  thoughts?: {
    text?: string;
    reasoning?: string;
    plan?: string[];
    criticism?: string;
    speak?: string;
  };
  command?: MCPCommand | null;
  original: string;
}

/**
 * Extract JSON from a text string that may contain markdown or other content
 * 
 * @param text - The text to extract JSON from
 * @returns The extracted JSON string or null if no JSON found
 */
function extractJsonFromText(text: string): string | null {
  // Pattern to match JSON blocks including those in markdown code blocks
  const jsonBlockRegex = /```(?:json)?\s*(\{[\s\S]*?\})\s*```|(\{[\s\S]*?\})/g;
  
  let match;
  while ((match = jsonBlockRegex.exec(text)) !== null) {
    const jsonStr = match[1] || match[2];
    try {
      // Test if this is valid JSON
      JSON.parse(jsonStr);
      return jsonStr;
    } catch (e) {
      // Not valid JSON, continue looking
      continue;
    }
  }
  
  return null;
}

/**
 * Parse an LLM response to extract MCP command
 * 
 * @param text - The LLM response text
 * @returns The parsed MCP response or null if no valid MCP command found
 */
export function parseMCPResponse(text: string): ParsedMCPResponse | null {
  try {
    // Extract JSON if the response contains it
    const jsonStr = extractJsonFromText(text);
    
    if (!jsonStr) {
      logger.debug('No JSON found in response');
      return {
        original: text
      };
    }
    
    // Parse the JSON
    const parsed = JSON.parse(jsonStr);
    
    // Validate that it follows MCP format
    if (typeof parsed !== 'object' || parsed === null) {
      logger.debug('Parsed JSON is not an object');
      return {
        original: text
      };
    }
    
    // Check for thoughts section
    if (!parsed.thoughts) {
      logger.debug('No thoughts section found in MCP response');
    }
    
    // Check for command section
    if (parsed.command !== null && parsed.command !== undefined) {
      if (typeof parsed.command === 'object' && parsed.command !== null) {
        if (!parsed.command.name) {
          logger.debug('Command is missing required name field');
        }
        
        if (!parsed.command.args) {
          logger.debug('Command is missing args field');
          parsed.command.args = {};
        }
      }
    }
    
    return {
      thoughts: parsed.thoughts,
      command: parsed.command,
      original: text
    };
  } catch (error) {
    logger.error('Error parsing MCP response:', error);
    return {
      original: text
    };
  }
}

/**
 * Extract all MCP commands from an LLM response
 * 
 * @param text - The LLM response text
 * @returns Array of extracted MCP commands
 */
export function extractMCPCommands(text: string): MCPCommand[] {
  const parsedResponse = parseMCPResponse(text);
  const commands: MCPCommand[] = [];
  
  if (parsedResponse?.command) {
    // Add a unique request ID
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    commands.push({
      ...parsedResponse.command,
      requestId
    });
  }
  
  return commands;
}

/**
 * Validate if a command name is valid
 * 
 * @param commandName - The command name to validate
 * @param availableCommands - List of available command names
 * @returns True if the command is valid
 */
export function isValidCommand(commandName: string, availableCommands: string[]): boolean {
  return availableCommands.includes(commandName);
}

/**
 * Generate a unique request ID
 * 
 * @returns A unique request ID string
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
} 