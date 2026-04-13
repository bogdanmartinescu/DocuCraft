/**
 * Team types — multi-agent groups and orchestration config.
 */

import { BrigadeId, Timestamp } from './common';
import { AgentResult, AgentRole } from './agent';

export type OrchestrationMode =
  | 'orchestrator-worker'  // Planner decomposes, workers execute
  | 'consensus'            // All agents work independently, vote on best result
  | 'pipeline'             // Sequential agent chain (A → B → C)
  | 'autonomous';          // Each agent independently monitors for work

export interface TeamConfig {
  orchestrationMode: OrchestrationMode;
  maxConcurrent: number;          // Max agents running simultaneously
  maxSpawnDepth: number;          // Nested sub-agent depth limit (default: 1)
  maxChildrenPerAgent: number;    // Max active children per agent session
  sharedMemoryEnabled: boolean;
  timeout: number;                // Team-level timeout in ms for entire task
  pipelineOrder?: AgentRole[];    // Agent execution order for pipeline mode
}

export interface TeamMemberConfig {
  role: AgentRole;
  agentId?: BrigadeId;   // Specific agent instance; auto-created if omitted
  isLead?: boolean;          // The orchestrator agent (default: planner or assistant)
  skills?: string[];         // Override skills for this member
}

export interface TeamSetupConfig {
  name: string;
  description?: string;
  members: TeamMemberConfig[];
  orchestration: TeamConfig;
}

export interface TeamMember {
  agentId: BrigadeId;
  role: AgentRole;
  isLead: boolean;
  joinedAt: Timestamp;
}

export interface TeamRecord {
  id: BrigadeId;
  name: string;
  description?: string;
  config: TeamConfig;
  members: TeamMember[];
  status: 'idle' | 'running' | 'paused';
  currentRunId?: BrigadeId;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TeamResult {
  teamId: BrigadeId;
  runId: BrigadeId;
  taskDescription: string;
  status: 'completed' | 'failed' | 'partial';
  agentResults: AgentResult[];
  aggregatedOutput: unknown;
  totalTokensUsed: number;
  totalDurationMs: number;
  completedAt: Timestamp;
}

/** A queued task waiting for an agent in a team */
export interface QueuedTask {
  id: BrigadeId;
  sessionId: string;
  agentId?: BrigadeId;
  agentRole?: AgentRole;
  task: string;
  input?: Record<string, unknown>;
  priority: number;
  enqueuedAt: Timestamp;
  parentTaskId?: BrigadeId;
}
