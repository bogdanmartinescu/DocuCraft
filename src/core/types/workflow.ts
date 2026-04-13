/**
 * Workflow types — TypeScript DSL for multi-agent automation pipelines.
 */

import { BrigadeId, Timestamp } from './common';
import { AgentRole } from './agent';

// ─── Workflow definition ──────────────────────────────────────────────────────

export interface Workflow {
  id: BrigadeId;
  name: string;
  description?: string;
  version: string;
  inputSchema?: Record<string, unknown>; // JSON Schema for workflow input
  steps: WorkflowStep[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AgentStep {
  type: 'agent';
  name: string;
  agent: AgentRole | BrigadeId;
  task: string;                     // Task template with {{variable}} interpolation
  dependsOn?: string[];
  input?: Record<string, unknown>;
  outputKey?: string;               // Store result under this key in context
  timeout?: number;
  retries?: number;
}

export interface ParallelStep {
  type: 'parallel';
  name: string;
  branches: WorkflowStep[];
  dependsOn?: string[];
  joinStrategy: 'all' | 'any' | 'majority';
}

export interface BranchStep {
  type: 'branch';
  name: string;
  condition: string;               // JS expression evaluated against workflow context
  ifTrue: WorkflowStep;
  ifFalse?: WorkflowStep;
  dependsOn?: string[];
}

export interface LoopStep {
  type: 'loop';
  name: string;
  over: string;                    // Context variable name to iterate over
  body: WorkflowStep;
  maxIterations?: number;
  dependsOn?: string[];
}

export interface ApprovalStep {
  type: 'approval';
  name: string;
  message: string;
  timeoutMs?: number;              // Auto-reject after this duration
  dependsOn?: string[];
}

export type WorkflowStep =
  | AgentStep
  | ParallelStep
  | BranchStep
  | LoopStep
  | ApprovalStep;

// ─── Workflow execution ───────────────────────────────────────────────────────

export enum WorkflowRunStatus {
  Pending   = 'pending',
  Running   = 'running',
  Paused    = 'paused',      // Waiting at approval gate
  Completed = 'completed',
  Failed    = 'failed',
  Cancelled = 'cancelled',
}

export interface StepResult {
  stepName: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  output?: unknown;
  agentId?: BrigadeId;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  error?: string;
  tokensUsed?: number;
}

export interface WorkflowRun {
  id: BrigadeId;
  workflowId: BrigadeId;
  workflowName: string;
  status: WorkflowRunStatus;
  input: Record<string, unknown>;
  context: Record<string, unknown>; // Accumulated step outputs
  stepResults: Record<string, StepResult>;
  currentSteps: string[];
  resumeToken?: string;             // Non-null when paused at approval gate
  startedAt: Timestamp;
  completedAt?: Timestamp;
  error?: string;
  triggeredBy?: string;             // 'manual' | 'cron' | 'webhook' | 'api'
}
