import { parseCommand } from '../commandParser';
import { CommandAliases } from '../../../core/types/api/aliases/commandAliases';

describe('Command Parser', () => {
  describe('Alias Resolution', () => {
    it('should handle basic action aliases', () => {
      const result = parseCommand('show llms');
      expect(result.action).toBe('list');
      expect(result.object).toBe('llm');
    });

    it('should handle object aliases', () => {
      const result = parseCommand('list models');
      expect(result.action).toBe('list');
      expect(result.object).toBe('llm');
    });

    it('should handle shortcuts', () => {
      const result = parseCommand('status');
      expect(result.action).toBe('show');
      expect(result.object).toBe('system');
    });

    it('should preserve parameters after normalization', () => {
      const result = parseCommand('show models provider=bedrock');
      expect(result.action).toBe('list');
      expect(result.object).toBe('llm');
      expect(result.parameters).toEqual(['provider=bedrock']);
    });

    it('should preserve flags after normalization', () => {
      const result = parseCommand('display models --json --filter=active');
      expect(result.action).toBe('list');
      expect(result.object).toBe('llm');
      expect(result.flags).toEqual({
        json: true,
        filter: 'active'
      });
    });

    it('should throw on invalid actions', () => {
      expect(() => parseCommand('invalid models')).toThrow('Invalid action');
    });
  });

  describe('Case Sensitivity', () => {
    it('should handle mixed case actions', () => {
      const result = parseCommand('SHOW llms');
      expect(result.action).toBe('list');
      expect(result.object).toBe('llm');
    });

    it('should handle mixed case objects', () => {
      const result = parseCommand('list MODELS');
      expect(result.action).toBe('list');
      expect(result.object).toBe('llm');
    });

    it('should handle mixed case shortcuts', () => {
      const result = parseCommand('STATUS');
      expect(result.action).toBe('show');
      expect(result.object).toBe('system');
    });
  });

  describe('Multi-word Objects', () => {
    it('should handle multi-word objects with parameters', () => {
      const result = parseCommand('test connection service=bedrock');
      expect(result.action).toBe('test');
      expect(result.object).toBe('connection');
      expect(result.parameters).toEqual(['service=bedrock']);
    });

    it('should handle multi-word objects with flags', () => {
      const result = parseCommand('test connection --verbose');
      expect(result.action).toBe('test');
      expect(result.object).toBe('connection');
      expect(result.flags).toEqual({ verbose: true });
    });
  });

  describe('Command Priority', () => {
    it('should prioritize direct commands over shortcuts', () => {
      // 'test' is both a shortcut and a valid command
      const result = parseCommand('test connection service=bedrock');
      expect(result.action).toBe('test');
      expect(result.object).toBe('connection');
      expect(result.parameters).toEqual(['service=bedrock']);
    });
  });
}); 