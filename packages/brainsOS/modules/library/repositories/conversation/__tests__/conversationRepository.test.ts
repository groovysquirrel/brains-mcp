import { conversationRepository } from '../conversationRepository';

describe('ConversationRepository', () => {
  const testUser = {
    userId: 'test-user',
    userType: 'user' as const
  };

  beforeEach(() => {
    // Clear environment variables before each test
    delete process.env.BRAINS_OS_CONVERSATIONS;
  });

  it('should get empty history for new user', () => {
    const history = conversationRepository.getHistory(testUser.userId);
    expect(history).toEqual([]);
  });

  it('should update and retrieve conversation history', () => {
    const userMessage = 'Hello';
    const assistantResponse = 'Hi there!';

    conversationRepository.updateHistory(testUser.userId, userMessage, assistantResponse);
    const history = conversationRepository.getHistory(testUser.userId);

    expect(history).toHaveLength(2);
    expect(history[0].role).toBe('user');
    expect(history[0].content).toBe(userMessage);
    expect(history[1].role).toBe('assistant');
    expect(history[1].content).toBe(assistantResponse);
    expect(history[0].timestamp).toBeDefined();
    expect(history[1].timestamp).toBeDefined();
  });
});