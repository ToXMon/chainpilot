// Prisma production database implementation
// Wraps existing Prisma client to satisfy DatabaseInterface
// Activated when DATABASE=prisma (default) or DATABASE is not set

import { DatabaseInterface } from './interface';
import { Conversation, Message } from '../types';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class PrismaDatabase implements DatabaseInterface {
  async createConversation(title: string): Promise<Conversation> {
    const row = await prisma.conversation.create({ data: { title } });
    return { id: row.id, title: row.title, createdAt: row.createdAt!.toISOString(), updatedAt: row.updatedAt!.toISOString() };
  }

  async getConversation(id: string): Promise<Conversation | null> {
    const row = await prisma.conversation.findUnique({ where: { id } });
    if (!row) return null;
    return { id: row.id, title: row.title, createdAt: row.createdAt!.toISOString(), updatedAt: row.updatedAt!.toISOString() };
  }

  async listConversations(): Promise<Conversation[]> {
    const rows = await prisma.conversation.findMany({ orderBy: { updatedAt: 'desc' } });
    return rows.map(r => ({ id: r.id, title: r.title, createdAt: r.createdAt!.toISOString(), updatedAt: r.updatedAt!.toISOString() }));
  }

  async deleteConversation(id: string): Promise<void> {
    await prisma.message.deleteMany({ where: { conversationId: id } });
    await prisma.conversation.delete({ where: { id } });
  }

  async addMessage(conversationId: string, role: string, content: string): Promise<Message> {
    const row = await prisma.message.create({ data: { conversationId, role, content } });
    return { id: row.id, conversationId: row.conversationId, role: row.role, content: row.content, createdAt: row.createdAt!.toISOString() };
  }

  async getMessages(conversationId: string): Promise<Message[]> {
    const rows = await prisma.message.findMany({ where: { conversationId }, orderBy: { createdAt: 'asc' } });
    return rows.map(r => ({ id: r.id, conversationId: r.conversationId, role: r.role, content: r.content, createdAt: r.createdAt!.toISOString() }));
  }
}
