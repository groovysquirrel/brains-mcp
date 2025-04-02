import { BedrockClient, ListFoundationModelsCommand } from "@aws-sdk/client-bedrock";
import { listModels, testConnection, BedrockServiceError } from '../bedrockClient';

jest.mock('@aws-sdk/client-bedrock');

describe('Bedrock Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('testConnection', () => {
    it('should return true on successful connection', async () => {
      (BedrockClient.prototype.send as jest.Mock).mockResolvedValueOnce({
        modelSummaries: []
      });

      const result = await testConnection();
      expect(result).toBe(true);
    });

    it('should throw BedrockServiceError on connection failure', async () => {
      (BedrockClient.prototype.send as jest.Mock).mockRejectedValueOnce(
        new Error('Connection failed')
      );

      await expect(testConnection()).rejects.toThrow(BedrockServiceError);
    });
  });

  describe('listModels', () => {
    it('should return filtered models when provider is specified', async () => {
      (BedrockClient.prototype.send as jest.Mock).mockResolvedValueOnce({
        modelSummaries: [
          { modelId: 'anthropic.claude-3', providerName: 'Anthropic' },
          { modelId: 'meta.llama2', providerName: 'Meta' }
        ]
      });

      const models = await listModels('anthropic');
      expect(models).toHaveLength(1);
      expect(models[0].modelId).toBe('anthropic.claude-3');
    });
  });
});