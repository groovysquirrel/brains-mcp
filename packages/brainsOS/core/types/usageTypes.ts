// Basic token usage structure
export interface TokenUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
}

// Component-specific usage with metadata
export interface ComponentUsage extends TokenUsage {
    componentType: string;
    modelId: string;
    vendor: string;
    timestamp: string;
}

// Complete usage tracking for a builder call
export interface BuilderUsage {
    requestId: string;
    timestamp: string;
    builderName: string;
    components: ComponentUsage[];
    totalUsage: TokenUsage;
    // Future fields for cost analysis
    // estimatedCost?: {
    //     total: number;
    //     currency: string;
    //     breakdown: Record<string, number>;
    // }
}