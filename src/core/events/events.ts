/**
 * All typed events emitted across the Brigade platform.
 */

import { BrigadeId, Artifact, Timestamp } from '../types/common';
import { AgentRole, AgentResult } from '../types/agent';
import { TeamResult } from '../types/team';
import { WorkflowRunStatus } from '../types/workflow';
import { DreamingResult } from '../types/memory';

export interface BrigadeEvents {
  // ─── Agent events ──────────────────────────────────────────────────────────
  'agent:created':        { agentId: BrigadeId; role: AgentRole; name: string };
  'agent:task:started':   { agentId: BrigadeId; taskId: BrigadeId; description: string };
  'agent:skill:invoked':  { agentId: BrigadeId; skillName: string; taskId: BrigadeId };
  'agent:skill:result':   { agentId: BrigadeId; skillName: string; success: boolean; durationMs: number };
  'agent:task:completed': { agentId: BrigadeId; result: AgentResult };
  'agent:task:failed':    { agentId: BrigadeId; taskId: BrigadeId; error: string };
  'agent:artifact':       { agentId: BrigadeId; artifact: Artifact };

  // ─── Team events ───────────────────────────────────────────────────────────
  'team:created':         { teamId: BrigadeId; name: string };
  'team:run:started':     { teamId: BrigadeId; runId: BrigadeId; task: string };
  'team:run:completed':   { teamId: BrigadeId; result: TeamResult };
  'team:run:failed':      { teamId: BrigadeId; runId: BrigadeId; error: string };
  'team:agent:spawned':   { teamId: BrigadeId; parentId: BrigadeId; childId: BrigadeId; depth: number };

  // ─── Workflow events ────────────────────────────────────────────────────────
  'workflow:run:started':   { runId: BrigadeId; workflowId: BrigadeId; workflowName: string };
  'workflow:step:started':  { runId: BrigadeId; stepName: string };
  'workflow:step:completed':{ runId: BrigadeId; stepName: string; output: unknown };
  'workflow:step:failed':   { runId: BrigadeId; stepName: string; error: string };
  'workflow:paused':        { runId: BrigadeId; stepName: string; resumeToken: string };
  'workflow:resumed':       { runId: BrigadeId; stepName: string };
  'workflow:run:completed': { runId: BrigadeId; status: WorkflowRunStatus };

  // ─── Scheduler events ──────────────────────────────────────────────────────
  'scheduler:job:fired':    { jobId: BrigadeId; jobName: string; firedAt: Timestamp };
  'scheduler:job:error':    { jobId: BrigadeId; error: string };
  'heartbeat:fired':        { firedAt: Timestamp; actionsTriggered: number };

  // ─── Memory events ─────────────────────────────────────────────────────────
  'memory:chunk:added':    { agentId: BrigadeId; tier: string; chunkId: BrigadeId };
  'memory:dreaming:started':{ agentId: BrigadeId };
  'memory:dreaming:done':  { agentId: BrigadeId; result: DreamingResult };

  // ─── Channel events ────────────────────────────────────────────────────────
  'channel:message:received': { channelType: string; senderId: string; content: string };
  'channel:message:sent':     { channelType: string; channelId: string };

  // ─── Gateway events ────────────────────────────────────────────────────────
  'gateway:ready':  { startedAt: Timestamp; port?: number };
  'gateway:stopping': { reason?: string };
}
