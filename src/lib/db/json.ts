// JSON flat-file database implementation for local dev, testing, staging
// Data stored in /data/ directory as JSON files
// Activated when DATABASE=json environment variable is set

import { DatabaseInterface } from './interface';
import { Conversation, Message } from '../types';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

export class JsonDatabase implements DatabaseInterface {
  private ensureDataDir(): void {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  private readJson<T>(file: string): T[] {
    this.ensureDataDir();
    const filePath = path.join(DATA_DIR, file);
    if (!fs.existsSync(filePath)) return [];
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }

  private writeJson<T>(file: string, data: T[]): void {
    this.ensureDataDir();
    fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2));
  }

  async createConversation(title: string): Promise<Conversation> {
    const conversations = this.readJson<Conversation>('conversations.json');
    const conversation: Conversation = {
      id: crypto.randomUUID(),
      title,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    conversations.push(conversation);
    this.writeJson('conversations.json', conversations);
    return conversation;
  }

  async getConversation(id: string): Promise<Conversation | null> {
    const conversations = this.readJson<Conversation>('conversations.json');
    return conversations.find(c => c.id === id) || null;
  }

  async listConversations(): Promise<Conversation[]> {
    return this.readJson<Conversation>('conversations.json').sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  async deleteConversation(id: string): Promise<void> {
    const conversations = this.readJson<Conversation>('conversations.json');
    this.writeJson('conversations.json', conversations.filter(c => c.id !== id));
    const messages = this.readJson<Message>('messages.json');
    this.writeJson('messages.json', messages.filter(m => m.conversationId !== id));
  }

  async addMessage(conversationId: string, role: string, content: string): Promise<Message> {
    const messages = this.readJson<Message>('messages.json');
    const message: Message = {
      id: crypto.randomUUID(),
      conversationId,
      role,
      content,
      createdAt: new Date().toISOString(),
    };
    messages.push(message);
    this.writeJson('messages.json', messages);
    // Update conversation timestamp
    const conversations = this.readJson<Conversation>('conversations.json');
    const idx = conversations.findIndex(c => c.id === conversationId);
    if (idx >= 0) {
      conversations[idx].updatedAt = new Date().toISOString();
      this.writeJson('conversations.json', conversations);
    }
    return message;
  }

  async getMessages(conversationId: string): Promise<Message[]> {
    return this.readJson<Message>('messages.json')
      .filter(m => m.conversationId === conversationId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }
}
