import { userContext } from '../../../system/types/userTypes';

export function createUserContext(userId: string): userContext {
  if (!userId) {
    throw new Error('Missing userId');
  }

  // TODO: In the future, this will fetch from DynamoDB
  return {
    userId,
    userType: 'user',
    metadata: {
      lastAccess: new Date().toISOString()
    }
  };
}