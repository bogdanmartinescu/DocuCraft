/**
 * Short-term (session) memory — bounded in-memory message store.
 */

import { ChatMessage } from '../core/types/provider';
import { SessionContext } from '../core/types/memory';
import { BrigadeId, Timestamp } from '../core/types/common';
import { generateId } from '../core/utils/id';

export class ShortTermMemory {
  private sessions = new Map<string, SessionContext>();

  createSession(agentId: BrigadeId, sessionId?: string): SessionContext {
    const id = sessionId ?? generateId();
    const session: SessionContext = {
      sessionId: id,
      agentId,
      messages: [],
      context: {},
      tokenCount: 0,
      createdAt: new Date().toISOString() as Timestamp,
      updatedAt: new Date().toISOString() as Timestamp,
    };
    this.sessions.set(id, session);
    return session;
  }

  getSession(sessionId: string): SessionContext | null {
    return this.sessions.get(sessionId) ?? null;
  }

  addMessage(sessionId: string, message: ChatMessage): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.messages.push(message);
    session.updatedAt = new Date().toISOString() as Timestamp;
    // Rough token estimation: 1 token ≈ 4 chars
    session.tokenCount += typeof message.content === 'string'
      ? Math.ceil(message.content.length / 4)
      : 100;
  }

  getMessages(sessionId: string): ChatMessage[] {
    return this.sessions.get(sessionId)?.messages ?? [];
  }

  /** Returns messages trimmed to stay within tokenBudget. */
  getMessagesWithinBudget(sessionId: string, tokenBudget: number): ChatMessage[] {
    const messages = this.getMessages(sessionId);
    const result: ChatMessage[] = [];
    let tokens = 0;
    // Take from the end (most recent) to fill the budget
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i]!;
      const msgTokens = typeof msg.content === 'string'
        ? Math.ceil(msg.content.length / 4)
        : 100;
      if (tokens + msgTokens > tokenBudget) break;
      result.unshift(msg);
      tokens += msgTokens;
    }
    return result;
  }

  setContext(sessionId: string, key: string, value: unknown): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.context[key] = value;
    }
  }

  getContext(sessionId: string): Record<string, unknown> {
    return this.sessions.get(sessionId)?.context ?? {};
  }

  clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  activeSessions(): number {
    return this.sessions.size;
  }

  /** Clean up sessions older than maxAgeMs */
  cleanup(maxAgeMs: number): number {
    const cutoff = Date.now() - maxAgeMs;
    let removed = 0;
    for (const [id, session] of this.sessions) {
      if (new Date(session.updatedAt).getTime() < cutoff) {
        this.sessions.delete(id);
        removed++;
      }
    }
    return removed;
  }
}
