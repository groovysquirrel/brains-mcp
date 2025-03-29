export class InitializationError extends Error {
    constructor(message: string, public context: Record<string, any>) {
      super(message);
      this.name = 'InitializationError';
    }
  }
  
  export class DatabaseError extends Error {
    constructor(message: string, public operation: string) {
      super(message);
      this.name = 'DatabaseError';
    }
  }