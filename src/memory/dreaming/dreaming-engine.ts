/**
 * Dreaming engine — 3-phase nightly memory consolidation.
 *
 * Phase 1 (Light Sleep): Score and prune short-term / daily memories.
 * Phase 2 (REM Sleep):   Cross-reference entries, find recurring patterns.
 * Phase 3 (Deep Sleep):  Promote high-value memories to MEMORY.md, compact.
 */

import { DreamingConfig, DreamingResult } from '../../core/types/memory';
import { BrigadeId, Timestamp } from '../../core/types/common';
import { DailyNotes } from '../daily-notes';
import { LongTermMemory } from '../long-term';
import { BaseProvider } from '../../providers/base-provider';
import { scoreMemoryChunk } from './scoring';
import { getLogger } from '../../core/logger';

const log = getLogger('dreaming');

export class DreamingEngine {
  constructor(
    private readonly dailyNotes: DailyNotes,
    private readonly longTerm: LongTermMemory,
    private readonly provider: BaseProvider,
  ) {}

  async consolidate(
    agentId: BrigadeId,
    config: DreamingConfig,
  ): Promise<DreamingResult> {
    const start = Date.now();
    log.info({ agentId }, 'Dreaming started');

    // Phase 1: Light Sleep — score and collect noteworthy entries from daily notes
    const { scored, pruned } = await this.lightSleep(agentId, config);

    // Phase 2: REM Sleep — ask the LLM to find patterns across scored entries
    const patterns = await this.remSleep(agentId, scored, config);

    // Phase 3: Deep Sleep — promote patterns and compact MEMORY.md
    const promoted = await this.deepSleep(agentId, patterns, config);

    const result: DreamingResult = {
      agentId,
      prunedCount: pruned,
      patternsFound: patterns.length,
      promotedToLongTerm: promoted,
      compactedEntries: 0,
      durationMs: Date.now() - start,
      ranAt: new Date().toISOString() as Timestamp,
    };

    log.info({ agentId, result }, 'Dreaming complete');
    return result;
  }

  private async lightSleep(
    agentId: BrigadeId,
    config: DreamingConfig,
  ): Promise<{ scored: string[]; pruned: number }> {
    const allNotes = this.dailyNotes.readAll(agentId);
    if (!allNotes.trim()) return { scored: [], pruned: 0 };

    // Split into bullet-point entries
    const entries = allNotes
      .split('\n')
      .filter((line) => line.trim().startsWith('-') || line.trim().startsWith('*'));

    const threshold = config.lightSleep.minImportanceThreshold;
    const scored: string[] = [];
    let pruned = 0;

    for (const entry of entries) {
      const score = scoreMemoryChunk({
        content: entry,
        timestamp: new Date().toISOString(),
        accessCount: 1,
        importance: 0.5,
        tags: [],
        alreadyInLongTerm: false,
      });

      if (score >= threshold) {
        scored.push(entry);
      } else {
        pruned++;
      }
    }

    return { scored, pruned };
  }

  private async remSleep(
    agentId: BrigadeId,
    scored: string[],
    config: DreamingConfig,
  ): Promise<string[]> {
    if (scored.length < config.remSleep.patternMinOccurrences) {
      return scored.slice(0, 10); // Still promote top entries
    }

    try {
      const response = await this.provider.chat({
        systemPrompt: 'You are a memory consolidation system. Analyze the provided memory entries and extract the most important facts, decisions, and recurring patterns worth preserving long-term. Be concise.',
        messages: [{
          role: 'user',
          content: `Here are recent memory entries for agent ${agentId}:\n\n${scored.slice(0, config.remSleep.crossReferenceDepth).join('\n')}\n\nExtract the top 5-10 most important facts or patterns worth adding to long-term memory. Return them as a bulleted list.`,
        }],
        maxTokens: 1024,
        temperature: 0.3,
      });

      return response.content
        .split('\n')
        .filter((l) => l.trim().startsWith('-') || l.trim().startsWith('*'))
        .map((l) => l.trim());
    } catch {
      // Fall back to top scored entries if LLM call fails
      return scored.slice(0, 10);
    }
  }

  private async deepSleep(
    agentId: BrigadeId,
    patterns: string[],
    config: DreamingConfig,
  ): Promise<number> {
    if (patterns.length === 0) return 0;

    const existing = this.longTerm.read(agentId);
    const entryCount = this.longTerm.countEntries(agentId);

    if (entryCount >= config.deepSleep.maxLongTermEntries) {
      // Compact: ask LLM to summarise MEMORY.md
      try {
        const compacted = await this.provider.chat({
          systemPrompt: 'You are a memory compaction system. Summarise the provided long-term memory into the most essential facts, removing redundancy.',
          messages: [{
            role: 'user',
            content: `Compact this long-term memory into at most ${Math.floor(config.deepSleep.maxLongTermEntries * 0.8)} key facts:\n\n${existing}`,
          }],
          maxTokens: 4096,
          temperature: 0.2,
        });
        this.longTerm.replace(agentId, `# Long-Term Memory\n\n${compacted.content}\n`);
      } catch { /* keep existing if compaction fails */ }
    }

    // Append new patterns
    for (const pattern of patterns) {
      this.longTerm.append(agentId, pattern);
    }

    return patterns.length;
  }
}
