export interface GatewayModelState {
  statuses: Array<{
    status: string;
    connections?: Array<{
      type: string;
      vendors: Array<{
        name: string;
        models: Array<{
          modelId: string;
          billing: string;
        }>;
      }>;
    }>;
    vendors?: Array<{
      name: string;
      models: Array<{
        modelId: string;
        billing: string;
      }>;
    }>;
  }>;
}

export interface GatewayModelAliases {
  aliases: Array<{
    modelId: string;
    alias: string;
  }>;
} 