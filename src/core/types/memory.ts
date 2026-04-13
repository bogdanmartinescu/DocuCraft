/**
 * Memory types — 4-tier memory system with Dreaming consolidation.
 */

import { BrigadeId, Timestamp } from './common';
import { ChatMessage } from './provider';

export enum MemoryTier {
  ShortTerm = 'short-term',
  Daily     = 'daily',
  LongTerm  = 'long-term',
}

export interface MemoryMetadata {
  agentId: BrigadeId;
  sessionId?: string;
  timestamp: Timestamp;
  source: string;           // Which skill/task produced this
  importance: number;       // 0.0 – 1.0
  tags: string[];
  accessCount: number;
  lastAccessed: Timestamp;
  expiresAt?: Timestamp;    // Auto-cleanup for short-term entries
}

export interface MemoryChunk {
  id: BrigadeId;
  tier: MemoryTier;
  content: string;
  metadata: MemoryMetadata;
}

export interface RecallOptions {
  tiers?: MemoryTier[];
  maxResults?: number;
  minImportance?: number;
  tags?: string[];
  dateRange?: { from?: Timestamp; to?: Timestamp };
  sessionId?: string;
}

// ─── Short-term (session) ─────────────────────────────────────────────────────

export interface SessionContext {
  sessionId: string;
  agentId: BrigadeId;
  messages: ChatMessage[];
  context: Record<string, unknown>;
  tokenCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Dreaming config and results ──────────────────────────────────────────────

export interface LightSleepConfig {
  minImportanceThreshold: number; // Prune entries below this score (default: 0.3)
  maxAgeDays: number;             // Max age of short-term entries to keep (default: 7)
}

export interface RemSleepConfig {
  crossReferenceDepth: number;    // How many entries to compare (default: 50)
  patternMinOccurrences: number;  // Min occurrences to call it a pattern (default: 3)
}

export interface DeepSleepConfig {
  maxLongTermEntries: number;     // Cap on MEMORY.md entries (default: 500)
  compactionStrategy: 'summarize' | 'deduplicate' | 'both';
}

export interface DreamingConfig {
  enabled: boolean;
  schedule: string;               // Cron expression, default "0 3 * * *"
  lightSleep: LightSleepConfig;
  remSleep: RemSleepConfig;
  deepSleep: DeepSleepConfig;
}

export interface DreamingResult {
  agentId: BrigadeId;
  prunedCount: number;
  patternsFound: number;
  promotedToLongTerm: number;
  compactedEntries: number;
  durationMs: number;
  ranAt: Timestamp;
}

// ─── Workspace files ──────────────────────────────────────────────────────────

export interface WorkspaceFiles {
  soul?: string;        // SOUL.md — personality
  agents?: string;      // AGENTS.md — behavioral rules
  user?: string;        // USER.md — info about the human user
  identity?: string;    // IDENTITY.md — agent name/emoji
  heartbeat?: string;   // HEARTBEAT.md — periodic task checklist
  memory?: string;      // MEMORY.md — long-term facts
}
