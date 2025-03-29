export interface UserContext {
    userId: string;
    email?: string;
    userType?: 'admin' | 'user' | 'system';
    permissions?: string[];
    metadata?: Record<string, unknown>;
  }