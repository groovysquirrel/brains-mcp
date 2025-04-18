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
  logger.debug('Attempting to extract JSON from text', { textLength: text.length });
  
  // First, clean the text of any special tokens or markers
  const cleanedText = text
    .replace(/<\|assistant\|>/g, '') // Remove assistant tokens
    .replace(/<\|user\|>/g, '') // Remove user tokens
    .trim();
  
  // Try to parse as complete JSON first (common case)
  try {
    JSON.parse(cleanedText);
    logger.debug('Cleaned text is complete valid JSON');
    return cleanedText;
  } catch (e) {
    // Not a complete JSON object, continue with extraction
    logger.debug('Cleaned text is not a complete JSON object, trying extraction patterns');
  }
  
  // Patterns to match JSON blocks in different formats
  const patterns = [
    // Pattern 1: Standard code blocks with json tag
    /```json\s*([\s\S]*?)\s*```/g,
    
    // Pattern 2: Code blocks without language tag
    /```\s*([\s\S]*?)\s*```/g,
    
    // Pattern 3: Objects wrapped in opening/closing braces (find outer-most JSON object)
    /(\{[\s\S]*?\})/g,
    
    // Pattern 4: Find anything that starts with {"thoughts": and ends with a closing brace
    /(\{"thoughts":[\s\S]*?\})/g
  ];
  
  // If there appears to be multiple JSON objects, try to extract each one
  const allJsonMatches = [];
  
  // Try each pattern in order
  for (const pattern of patterns) {
    logger.debug('Trying extraction pattern', { pattern: pattern.toString() });
    
    let match;
    let matches = [];
    
    // Find all potential matches
    while ((match = pattern.exec(text)) !== null) {
      matches.push(match[1]);
    }
    
    // If we found matches, try each one
    if (matches.length > 0) {
      logger.debug('Found potential JSON matches', { count: matches.length });
      
      // Sort by length descending to try largest first
      matches.sort((a, b) => b.length - a.length);
      
      for (const potentialJson of matches) {
        try {
          // Test if this is valid JSON
          JSON.parse(potentialJson);
          logger.debug('Found valid JSON match', { length: potentialJson.length });
          allJsonMatches.push(potentialJson);
        } catch (e) {
          // Not valid JSON, try cleaning it first
          try {
            // Try to clean potential trailing/leading text
            const cleaned = potentialJson.replace(/([{\[].*[}\]])[^{\[\]}\r\n]*$/s, '$1');
            JSON.parse(cleaned);
            logger.debug('Found valid JSON after cleaning', { length: cleaned.length });
            allJsonMatches.push(cleaned);
          } catch (e2) {
            // Still not valid JSON, continue to next match
            logger.debug('Invalid JSON match, continuing', { 
              error: e instanceof Error ? e.message : String(e),
              potentialJsonPreview: potentialJson.substring(0, 100) + '...'
            });
            continue;
          }
        }
      }
    }
  }
  
  // If we found any valid JSON matches, return the best one
  if (allJsonMatches.length > 0) {
    logger.debug('Found multiple valid JSON matches', { count: allJsonMatches.length });
    
    // Check each match for the presence of 'command' and 'thoughts'
    // to find the most likely MCP command
    const withCommand = allJsonMatches.filter(json => {
      try {
        const parsed = JSON.parse(json);
        return parsed.command !== undefined && parsed.thoughts !== undefined;
      } catch {
        return false;
      }
    });
    
    if (withCommand.length > 0) {
      logger.debug('Found JSON with command and thoughts', { count: withCommand.length });
      return withCommand[0]; // Return the first one that has command and thoughts
    }
    
    // If none have both command and thoughts, return the first valid JSON
    logger.debug('Returning first valid JSON match', { length: allJsonMatches[0].length });
    return allJsonMatches[0];
  }
  
  logger.debug('No valid JSON found in text');
  return null;
}

/**
 * Parse an LLM response to extract MCP command
 * 
 * @param text - The LLM response text
 * @returns The parsed MCP response or null if no valid MCP command found
 */
export function parseMCPResponse(text: string): ParsedMCPResponse {
  try {
    logger.debug('Parsing MCP response', { textLength: text.length, textPreview: text.substring(0, 100) });
    
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
    logger.debug('Successfully parsed JSON', { 
      hasThoughts: !!parsed.thoughts,
      hasCommand: parsed.command !== undefined,
      commandType: parsed.command !== null ? typeof parsed.command : 'null'
    });
    
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
        } else {
          logger.debug('Found command with name', { commandName: parsed.command.name });
        }
        
        if (!parsed.command.args) {
          logger.debug('Command is missing args field, adding empty args object');
          parsed.command.args = {};
        }
      } else {
        logger.debug('Command is not an object', { commandType: typeof parsed.command });
      }
    } else {
      logger.debug('Command is null or undefined', { command: parsed.command });
    }
    
    return {
      thoughts: parsed.thoughts,
      command: parsed.command,
      original: text
    };
  } catch (error) {
    logger.error('Error parsing MCP response:', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      textPreview: text.substring(0, 200)
    });
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
    logger.debug('Extracted MCP command', { 
      commandName: parsedResponse.command.name,
      argsCount: Object.keys(parsedResponse.command.args || {}).length,
      requestId
    });
    
    commands.push({
      ...parsedResponse.command,
      requestId
    });
  } else {
    logger.debug('No command found in parsed response');
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