/**
 * Brigade top-level configuration schema types.
 */

import { ProvidersConfig, RoutingConfig } from './provider';
import { DreamingConfig } from './memory';
import { TeamSetupConfig } from './team';
import { SchedulerConfig } from './scheduler';
import { ChannelsConfig } from './channel';
import { AgentConfig } from './agent';

export interface StorageConfig {
  type: 'json-file' | 'sqlite';
  dataDir: string;
  sqlitePath?: string;
}

export interface ShortTermMemoryConfig {
  maxMessages: number;
  maxTokens: number;
}

export interface MemoryConfig {
  shortTerm: ShortTermMemoryConfig;
  dailyNotesDir: string;
  longTermFile: string;        // Default: "MEMORY.md" (relative to workspace)
  dreaming: DreamingConfig;
}

export interface AgentsConfig {
  defaults: Partial<AgentConfig>;
  overrides?: Record<string, Partial<AgentConfig>>; // Role-keyed overrides
}

export interface SkillsConfig {
  builtIn: boolean;
  disabled?: string[];
  custom?: string[];           // Paths to custom skill directories
  config?: Record<string, Record<string, unknown>>; // Per-skill config
}

export interface GovernanceConfig {
  defaultToolPolicy?: { mode: 'allowlist' | 'denylist'; skills: string[] };
  approvalRequired?: string[];   // Skill names requiring human approval
  sandboxEnabled?: boolean;
  maxTokensPerTask?: number;
  maxCostPerTask?: number;       // USD
}

export interface ApiConfig {
  port: number;
  host: string;
  apiKey?: string;
  cors?: boolean;
  rateLimit?: { windowMs: number; max: number };
}

export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  pretty?: boolean;
}

/** Root Brigade configuration. Used in brigade.config.ts. */
export interface BrigadeConfig {
  name: string;
  version?: string;
  providers: ProvidersConfig;
  routing?: RoutingConfig;
  storage: StorageConfig;
  memory: MemoryConfig;
  teams?: Record<string, TeamSetupConfig>;
  agents?: AgentsConfig;
  skills?: SkillsConfig;
  governance?: GovernanceConfig;
  scheduler?: Partial<SchedulerConfig>;
  channels?: ChannelsConfig;
  api?: Partial<ApiConfig>;
  logging?: LoggingConfig;
}
