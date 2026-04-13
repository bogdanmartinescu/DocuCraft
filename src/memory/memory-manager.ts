/**
 * Memory manager — unified facade over all 4 memory tiers.
 */

import { ShortTermMemory } from './short-term';
import { DailyNotes } from './daily-notes';
import { LongTermMemory } from './long-term';
import { DreamingEngine } from './dreaming/dreaming-engine';
import { WorkspaceManager } from '../storage/workspace-manager';
import { BaseProvider } from '../providers/base-provider';
import { DreamingConfig, DreamingResult, RecallOptions } from '../core/types/memory';
import { BrigadeId } from '../core/types/common';
import { ChatMessage } from '../core/types/provider';

export class MemoryManager {
  public readonly shortTerm: ShortTermMemory;
  public readonly dailyNotes: DailyNotes;
  public readonly longTerm: LongTermMemory;
  private dreamingEngine: DreamingEngine;

  constructor(
    private readonly workspace: WorkspaceManager,
    private readonly provider: BaseProvider,
  ) {
    this.shortTerm = new ShortTermMemory();
    this.dailyNotes = new DailyNotes(workspace);
    this.longTerm = new LongTermMemory(workspace);
    this.dreamingEngine = new DreamingEngine(this.dailyNotes, this.longTerm, provider);
  }

  /**
   * Build context for an agent turn:
   * - Session messages (from short-term)
   * - Today + yesterday daily notes
   * - Relevant long-term memory excerpts
   */
  buildContext(
    agentId: BrigadeId,
    sessionId: string,
    query?: string,
    options: RecallOptions = {},
  ): string {
    const parts: string[] = [];

    // Long-term memory
    const ltm = this.longTerm.read(agentId);
    if (ltm && !ltm.includes('Nothing stored yet')) {
      const excerpts = query
        ? this.longTerm.search(agentId, query).slice(0, 5).join('\n')
        : ltm.slice(0, 2000);
      if (excerpts.trim()) {
        parts.push(`## Long-Term Memory\n${excerpts}`);
      }
    }

    // Recent daily notes
    const recent = this.dailyNotes.readRecent(agentId);
    if (recent.trim()) {
      parts.push(`## Recent Notes\n${recent.slice(0, 1000)}`);
    }

    return parts.join('\n\n');
  }

  /** Record a notable event to the daily notes */
  recordEvent(agentId: BrigadeId, note: string): void {
    this.dailyNotes.append(agentId, note);
  }

  /** Get session messages within token budget */
  getSessionMessages(
    sessionId: string,
    tokenBudget = 16000,
  ): ChatMessage[] {
    return this.shortTerm.getMessagesWithinBudget(sessionId, tokenBudget);
  }

  /** Add a message to the session */
  addSessionMessage(sessionId: string, message: ChatMessage): void {
    this.shortTerm.addMessage(sessionId, message);
  }

  /** Trigger the Dreaming consolidation for an agent */
  async triggerDreaming(
    agentId: BrigadeId,
    config: DreamingConfig,
  ): Promise<DreamingResult> {
    return this.dreamingEngine.consolidate(agentId, config);
  }

  /** Read SOUL.md for an agent */
  getSoul(agentId: BrigadeId): string {
    return this.workspace.readFile(agentId, 'SOUL.md') ?? '';
  }

  /** Read AGENTS.md behavioral rules */
  getAgentRules(agentId: BrigadeId): string {
    return this.workspace.readFile(agentId, 'AGENTS.md') ?? '';
  }

  /** Read HEARTBEAT.md checklist */
  getHeartbeat(agentId: BrigadeId): string {
    return this.workspace.readFile(agentId, 'HEARTBEAT.md') ?? '';
  }
}
