/**
 * Scheduler types — cron jobs, heartbeat daemon, one-shot tasks.
 */

import { BrigadeId, Timestamp } from './common';

export type ScheduleType = 'cron' | 'interval' | 'fixed';

export type ScheduledAction =
  | { type: 'workflow'; workflowId: BrigadeId; input?: Record<string, unknown> }
  | { type: 'agent-task'; agentId: BrigadeId; task: string }
  | { type: 'team-task'; teamId: BrigadeId; task: string }
  | { type: 'webhook'; url: string; method?: string; headers?: Record<string, string>; body?: unknown }
  | { type: 'dreaming'; agentId?: BrigadeId }; // undefined agentId = all agents

export interface CronJobConfig {
  id: BrigadeId;
  name: string;
  schedule: string;           // Cron expression OR "every 30m" OR "daily at 09:00"
  type: ScheduleType;
  action: ScheduledAction;
  enabled: boolean;
  timezone?: string;
  lastRunAt?: Timestamp;
  nextRunAt?: Timestamp;
  runCount: number;
  createdAt: Timestamp;
}

export interface OneShotConfig {
  id: BrigadeId;
  name: string;
  executeAt: Timestamp;
  action: ScheduledAction;
  deleteAfterRun: boolean;    // Default: true
  createdAt: Timestamp;
}

export interface HeartbeatConfig {
  enabled: boolean;
  intervalMs: number;         // Default: 1_800_000 (30 min)
  heartbeatFile: string;      // Default: "HEARTBEAT.md"
  agentId?: BrigadeId;     // Which agent processes heartbeat (default: assistant)
}

export interface HeartbeatDirective {
  type: 'CHECK' | 'REPORT' | 'TRIGGER' | 'REMIND';
  instruction: string;
  condition?: string;
}

export interface HeartbeatResult {
  processedAt: Timestamp;
  directives: HeartbeatDirective[];
  actionsTriggered: number;
  messageSent: boolean;
}

export interface SchedulerConfig {
  heartbeat: HeartbeatConfig;
  jobs: CronJobConfig[];
  oneShots?: OneShotConfig[];
}
