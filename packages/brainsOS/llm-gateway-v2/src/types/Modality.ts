export interface ModalityConfig {
  name: string;
  inputValidation: {
    requiredFields: string[];
    messageValidation?: {
      requiredFields: string[];
      allowedRoles: string[];
    };
  };
  outputValidation: {
    requiredFields: string[];
    optionalFields: string[];
  };
  defaults?: Record<string, unknown>;
} 