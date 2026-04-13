/**
 * Skill types — the capability units that agents use as tools.
 */

import { BrigadeId, Timestamp } from './common';
import { BaseProvider } from '../../providers/base-provider';
import { BaseStore } from '../../storage/base-store';
import { Logger } from 'pino';

export type RiskLevel = 'low' | 'medium' | 'high';
export type SkillSource = 'built-in' | 'markdown' | 'npm' | 'local';

export interface SkillDef {
  name: string;                         // e.g., "web-search"
  displayName: string;                  // e.g., "Web Search"
  description: string;
  version: string;
  author?: string;
  tags: string[];
  inputSchema: Record<string, unknown>; // JSON Schema
  outputSchema: Record<string, unknown>;
  requiredCapabilities?: string[];
  riskLevel: RiskLevel;
  timeout?: number;                     // ms
  examples?: SkillExample[];
}

export interface SkillExample {
  description: string;
  input: Record<string, unknown>;
  expectedOutput?: Record<string, unknown>;
}

export interface SkillMetadata extends SkillDef {
  source: SkillSource;
  installedAt?: Timestamp;
  lastUsed?: Timestamp;
  usageCount: number;
}

export interface SkillContext {
  agentId: BrigadeId;
  sessionId: string;
  workspace: string;              // Absolute path to agent workspace
  provider: BaseProvider;
  store: BaseStore;
  logger: Logger;
  config: Record<string, unknown>; // Skill-specific config from brigade.config.ts
}

export interface SkillExecutionResult<T = unknown> {
  success: boolean;
  output?: T;
  error?: string;
  durationMs: number;
  tokensUsed?: number;
}

/** Parsed representation of a SKILL.md file */
export interface SkillMarkdownDef {
  name: string;
  version: string;
  author?: string;
  description: string;
  tags?: string[];
  riskLevel?: RiskLevel;
  requiresEnv?: string[];
  requiresBins?: string[];
  instructions: string;           // Markdown body — the "how-to" for the LLM
}
