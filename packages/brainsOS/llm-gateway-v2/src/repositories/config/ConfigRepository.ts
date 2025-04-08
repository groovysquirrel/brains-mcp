import { ProviderConfig } from '../../types/Provider';
import { VendorConfig } from '../../types/Vendor';
import { ModelConfig } from '../../types/Model';
import { ModalityConfig } from '../../types/Modality';
import { GatewayModelState, GatewayModelAliases } from '../../types/GatewayState';

/**
 * Interface that defines methods for loading various configurations
 * This allows us to swap between different configuration sources
 * (local files, DynamoDB, etc.) without changing the rest of the code.
 */
export interface ConfigRepository {
  /**
   * Gets a provider's configuration
   * @param providerName - The name of the provider to load
   */
  getProviderConfig(providerName: string): Promise<ProviderConfig>;
  
  /**
   * Gets a vendor's configuration
   * @param vendorName - The name of the vendor to load
   */
  getVendorConfig(vendorName: string): Promise<VendorConfig>;
  
  /**
   * Gets a model's configuration by its ID
   * @param modelId - The unique identifier for the model
   * @param providerName - The name of the provider
   */
  getModelConfig(modelId: string, providerName: string): Promise<ModelConfig>;
  
  /**
   * Gets a model's configuration by its alias
   * @param alias - The alias to look up
   * @param providerName - The name of the provider
   */
  getModelConfigByAlias(alias: string, providerName: string): Promise<ModelConfig>;
  
  /**
   * Gets a modality's configuration
   * @param modalityName - The name of the modality
   */
  getModalityConfig(modalityName: string): Promise<ModalityConfig>;
  
  /**
   * Loads all vendor configurations
   */
  loadAllVendorConfigs(): Promise<Record<string, VendorConfig>>;
  
  /**
   * Loads all modality configurations
   */
  loadAllModalityConfigs(): Promise<ModalityConfig[]>;
  
  /**
   * Gets status configuration for a provider
   * @param providerName - The name of the provider
   */
  getStatusConfig(providerName: string): Promise<GatewayModelState>;
  
  /**
   * Gets alias configuration for a provider
   * @param providerName - The name of the provider
   */
  getAliasConfig(providerName: string): Promise<GatewayModelAliases>;
  
  /**
   * Checks if a model is ready for use
   * @param modelId - The model ID to check
   * @param providerName - The name of the provider
   */
  isModelReady(modelId: string, providerName: string): Promise<boolean>;
} 