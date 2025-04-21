/**
 * MCP Parser
 * 
 * Utility functions for parsing and extracting MCP commands from LLM responses.
 * This parser handles the extraction and validation of MCP commands following
 * the Model Context Protocol standard.
 */

import { Logger } from '../../../../shared/Logger';

// Initialize logger
const logger = new Logger('BRAIN - MCPParser', 'warn');

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
 * Clean response content from the LLM by removing special tokens and artifacts
 * 
 * This method removes:
 * - Special tokens like <|assistant|> or <|user|>
 * - Duplicated JSON objects
 * - Extraneous text outside the main JSON structure
 * 
 * @param content - The raw content from the LLM response
 * @returns Cleaned content ready for command extraction
 */
export function cleanResponseContent(content: string): string {
  if (!content) return content;
  
  // Log original content preview for debugging
  logger.debug('Cleaning response content', {
    contentPreview: content.substring(0, 50) + '...',
    contentLength: content.length
  });
  
  // Remove all types of special tokens that might appear in LLM responses
  let cleaned = content
      // Basic role markers
      .replace(/<\|assistant\|>/g, '')
      .replace(/<\|user\|>/g, '')
      .replace(/<\|system\|>/g, '')
      
      // Complex anthropic markers (seen in the response examples)
      .replace(/<\|assistant<\|end_header_id\|>>/g, '')
      .replace(/<\|assistant<\|im_start\|>\|>/g, '')
      .replace(/<\|im_end\|>/g, '')
      .replace(/<\|im_start\|>/g, '')
      .replace(/<\|im_sep\|>/g, '')
      
      // Other common markers
      .replace(/<\|endoftext\|>/g, '')
      .replace(/<\|endofprompt\|>/g, '')
      
      // Handle nested anthropic markers as seen in the example
      .replace(/<\|assistant<\|[^>]+\|>>/g, '')
      
      // Any remaining special tokens with this pattern
      .replace(/<\|[^>]+\|>/g, '')
      .trim();
  
  // Check if there appear to be duplicated JSON objects (common with some LLMs)
  const jsonStartCount = (cleaned.match(/\{\s*"thoughts"/g) || []).length;
  
  if (jsonStartCount > 1) {
      logger.warn('Detected potential duplicate JSON objects', { count: jsonStartCount });
      
      // Try to extract just the first complete JSON object
      const jsonMatch = /\{[\s\S]*?\}\s*(?=\{|$)/.exec(cleaned);
      if (jsonMatch) {
          logger.warn('Extracted first JSON object', { 
              matchLength: jsonMatch[0].length,
              fullLength: cleaned.length
          });
          cleaned = jsonMatch[0].trim();
      }
  }
  
  // Remove any trailing non-JSON text (e.g., "Your random number is 43")
  // This matches a valid JSON structure and removes anything after it
  const trailingTextMatch = /^(\{[\s\S]*\})[^{}]*$/.exec(cleaned);
  if (trailingTextMatch) {
      cleaned = trailingTextMatch[1];
  }
  
  // Log the cleaning results
  logger.debug('Cleaned response content', {
      originalLength: content.length,
      cleanedLength: cleaned.length,
      diff: content.length - cleaned.length
  });
  
  return cleaned;
}

/**
 * Extract JSON from a text string that may contain markdown or other content
 * 
 * @param text - The text to extract JSON from
 * @returns The extracted JSON string or null if no JSON found
 */
function extractJsonFromText(text: string): string | null {
  // First, clean the text of any special tokens or markers
  const cleanedText = text
    .replace(/<\|assistant\|>/g, '') // Remove assistant tokens
    .replace(/<\|user\|>/g, '') // Remove user tokens
    .trim();
  
  // Try to parse as complete JSON first (common case)
  try {
    JSON.parse(cleanedText);
    return cleanedText;
  } catch (e) {
    // Not a complete JSON object, continue with extraction
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
    let match;
    let matches = [];
    
    // Find all potential matches
    while ((match = pattern.exec(text)) !== null) {
      matches.push(match[1]);
    }
    
    // If we found matches, try each one
    if (matches.length > 0) {
      // Sort by length descending to try largest first
      matches.sort((a, b) => b.length - a.length);
      
      for (const potentialJson of matches) {
        try {
          // Test if this is valid JSON
          JSON.parse(potentialJson);
          allJsonMatches.push(potentialJson);
        } catch (e) {
          // Not valid JSON, try cleaning it first
          try {
            // Try to clean potential trailing/leading text
            const cleaned = potentialJson.replace(/([{\[].*[}\]])[^{\[\]}\r\n]*$/s, '$1');
            JSON.parse(cleaned);
            allJsonMatches.push(cleaned);
          } catch (e2) {
            // Still not valid JSON, continue to next match
            continue;
          }
        }
      }
    }
  }
  
  // If we found any valid JSON matches, return the best one
  if (allJsonMatches.length > 0) {
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
      return withCommand[0]; // Return the first one that has command and thoughts
    }
    
    // If none have both command and thoughts, return the first valid JSON
    return allJsonMatches[0];
  }
  
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
    // Extract JSON if the response contains it
    const jsonStr = extractJsonFromText(text);
    
    if (!jsonStr) {
      return {
        original: text
      };
    }
    
    // Parse the JSON
    const parsed = JSON.parse(jsonStr);
    
    // Validate that it follows MCP format
    if (typeof parsed !== 'object' || parsed === null) {
      return {
        original: text
      };
    }
    
    // Create a properly formatted command if present
    if (parsed.command !== null && parsed.command !== undefined) {
      if (typeof parsed.command === 'object' && parsed.command !== null) {
        if (!parsed.command.args) {
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
  // First clean the response content to remove artifacts
  const cleanedText = cleanResponseContent(text);
  
  // Then parse the response to extract commands
  const parsedResponse = parseMCPResponse(cleanedText);
  const commands: MCPCommand[] = [];
  
  if (parsedResponse?.command) {
    // Add a unique request ID
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    logger.info('Extracted MCP command', { 
      commandName: parsedResponse.command.name,
      argsCount: Object.keys(parsedResponse.command.args || {}).length,
      requestId
    });
    
    commands.push({
      ...parsedResponse.command,
      requestId
    });
  } else {
    logger.info('No command found in parsed response');
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