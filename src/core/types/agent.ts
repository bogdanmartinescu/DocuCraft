/**
 * Agent types — roles, configuration, tasks, results.
 */

import { BrigadeId, Artifact, Timestamp } from './common';
import { ProviderType } from './provider';

export enum AgentRole {
  Planner    = 'planner',
  Coder      = 'coder',
  Marketer   = 'marketer',
  Sales      = 'sales',
  Researcher = 'researcher',
  Analyst    = 'analyst',
  Assistant  = 'assistant',
  Custom     = 'custom',
}

export interface AgentCapability {
  name: string;
  description: string;
  requiredSkills: string[];
}

export interface ToolPolicy {
  mode: 'allowlist' | 'denylist';
  skills: string[];
  approvalRequired?: string[]; // Skill names needing human approval
}

export interface AgentConfig {
  id?: BrigadeId;
  name: string;
  role: AgentRole;
  description?: string;
  model?: string;
  provider?: ProviderType;
  skills: string[];           // Skill names assigned to this agent
  personality?: string;       // SOUL.md content or file path
  rules?: string[];           // Behavioral rules (AGENTS.md lines)
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
  toolPolicy?: ToolPolicy;
  workspaceDir?: string;      // Override default workspace path
}

export interface AgentTask {
  id: BrigadeId;
  description: string;
  input?: Record<string, unknown>;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  deadline?: Timestamp;
  parentTaskId?: BrigadeId;  // For sub-tasks from orchestrator
  requiredSkills?: string[];
  sessionId?: string;
}

export interface PlannedStep {
  description: string;
  skillName?: string;
  delegateTo?: AgentRole;
  input?: Record<string, unknown>;
  reasoning?: string;
}

export interface AgentPlan {
  steps: PlannedStep[];
  reasoning: string;
  estimatedSteps: number;
}

export interface AgentResult {
  taskId: BrigadeId;
  agentId: BrigadeId;
  agentRole: AgentRole;
  status: 'completed' | 'failed' | 'partial';
  output: unknown;
  artifacts?: Artifact[];
  tokensUsed: number;
  durationMs: number;
  error?: string;
  completedAt: Timestamp;
}

/** Stored agent instance record */
export interface AgentRecord {
  id: BrigadeId;
  config: AgentConfig;
  status: 'idle' | 'running' | 'paused' | 'error';
  currentTaskId?: BrigadeId;
  totalTasksCompleted: number;
  totalTokensUsed: number;
  lastActiveAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
