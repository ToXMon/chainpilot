// Database interface — all DB access goes through this contract
// Two implementations: json.ts (local dev/testing) and prisma.ts (production)
// Switch via DATABASE environment variable

export interface DatabaseInterface {
  // Conversations
  createConversation(title: string): Promise<Conversation>;
  getConversation(id: string): Promise<Conversation | null>;
  listConversations(): Promise<Conversation[]>;
  deleteConversation(id: string): Promise<void>;

  // Messages
  addMessage(conversationId: string, role: string, content: string): Promise<Message>;
  getMessages(conversationId: string): Promise<Message[]>;
}

// Re-export types from centralized types module
export type { Conversation, Message } from '../types';
