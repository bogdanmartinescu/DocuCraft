/**
 * Scheduler — manages cron jobs, heartbeat daemon, and one-shot tasks.
 */

import { CronJob } from 'cron';
import { CronJobConfig, HeartbeatConfig, ScheduledAction } from '../core/types/scheduler';
import { BrigadeId, Timestamp } from '../core/types/common';
import { BrigadeEventBus } from '../core/events/event-bus';
import { BaseStore, COLLECTIONS } from '../storage/base-store';
import { generateId } from '../core/utils/id';
import { getLogger } from '../core/logger';

const log = getLogger('scheduler');

export interface SchedulerDeps {
  store: BaseStore;
  eventBus: BrigadeEventBus;
  onAction: (action: ScheduledAction) => Promise<void>;
}

export class Scheduler {
  private cronJobs = new Map<BrigadeId, CronJob>();
  private heartbeatTimer?: NodeJS.Timeout;
  private running = false;

  constructor(private readonly deps: SchedulerDeps) {}

  async start(
    jobs: CronJobConfig[],
    heartbeat?: HeartbeatConfig,
  ): Promise<void> {
    this.running = true;
    log.info({ jobCount: jobs.length }, 'Scheduler starting');

    for (const job of jobs) {
      if (job.enabled) await this.scheduleJob(job);
    }

    if (heartbeat?.enabled) {
      this.startHeartbeat(heartbeat);
    }

    // Load persisted jobs from store
    const stored = await this.deps.store.list<CronJobConfig>(COLLECTIONS.CRON_JOBS);
    for (const job of stored.items) {
      if (job.enabled && !this.cronJobs.has(job.id)) {
        await this.scheduleJob(job);
      }
    }
  }

  stop(): void {
    this.running = false;
    for (const [, job] of this.cronJobs) {
      job.stop();
    }
    this.cronJobs.clear();
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
    log.info('Scheduler stopped');
  }

  async addJob(config: Omit<CronJobConfig, 'id' | 'runCount' | 'createdAt'>): Promise<CronJobConfig> {
    const job: CronJobConfig = {
      id: generateId(),
      runCount: 0,
      createdAt: new Date().toISOString() as Timestamp,
      ...config,
    };

    await this.deps.store.set(COLLECTIONS.CRON_JOBS, job.id, job);

    if (job.enabled) {
      await this.scheduleJob(job);
    }

    return job;
  }

  async removeJob(jobId: BrigadeId): Promise<void> {
    const cronJob = this.cronJobs.get(jobId);
    if (cronJob) {
      cronJob.stop();
      this.cronJobs.delete(jobId);
    }
    await this.deps.store.delete(COLLECTIONS.CRON_JOBS, jobId);
  }

  async listJobs(): Promise<CronJobConfig[]> {
    const stored = await this.deps.store.list<CronJobConfig>(COLLECTIONS.CRON_JOBS);
    return stored.items;
  }

  private async scheduleJob(config: CronJobConfig): Promise<void> {
    try {
      const job = new CronJob(
        config.schedule,
        async () => {
          log.info({ jobId: config.id, jobName: config.name }, 'Cron job fired');
          this.deps.eventBus.emit('scheduler:job:fired', {
            jobId: config.id,
            jobName: config.name,
            firedAt: new Date().toISOString() as Timestamp,
          });

          try {
            await this.deps.onAction(config.action);
            config.runCount++;
            config.lastRunAt = new Date().toISOString() as Timestamp;
            await this.deps.store.set(COLLECTIONS.CRON_JOBS, config.id, config);
          } catch (error) {
            const msg = (error as Error).message;
            log.error({ jobId: config.id, error: msg }, 'Cron job failed');
            this.deps.eventBus.emit('scheduler:job:error', { jobId: config.id, error: msg });
          }
        },
        null,
        true,
        config.timezone,
      );

      this.cronJobs.set(config.id, job);
      log.info({ jobId: config.id, schedule: config.schedule }, 'Cron job scheduled');
    } catch (e) {
      log.error({ jobId: config.id, error: (e as Error).message }, 'Failed to schedule cron job');
    }
  }

  private startHeartbeat(config: HeartbeatConfig): void {
    log.info({ intervalMs: config.intervalMs }, 'Heartbeat daemon started');
    this.heartbeatTimer = setInterval(async () => {
      if (!this.running) return;
      this.deps.eventBus.emit('heartbeat:fired', {
        firedAt: new Date().toISOString() as Timestamp,
        actionsTriggered: 0,
      });
      await this.deps.onAction({
        type: 'agent-task',
        agentId: config.agentId ?? 'default-assistant',
        task: 'Process the HEARTBEAT.md checklist and take any necessary actions.',
      });
    }, config.intervalMs);
  }
}
