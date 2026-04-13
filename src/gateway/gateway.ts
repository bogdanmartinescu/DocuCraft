/**
 * Gateway — the central process that bootstraps and runs Brigade.
 */

import { loadConfig, getConfig } from '../core/config';
import { initLogger, getLogger } from '../core/logger';
import { ProviderRegistry } from '../providers/provider-registry';
import { JsonFileStore } from '../storage/json-file-store';
import { WorkspaceManager } from '../storage/workspace-manager';
import { MemoryManager } from '../memory/memory-manager';
import { createDefaultSkillRegistry } from '../skills';
import { Scheduler } from '../scheduler/scheduler';
import { createServer } from '../api/server';
import { eventBus } from '../core/events/event-bus';
import { ScheduledAction } from '../core/types/scheduler';
import path from 'path';

const log = getLogger('gateway');

export class Gateway {
  private scheduler?: Scheduler;
  private server?: ReturnType<typeof createServer>;
  private httpServer?: ReturnType<(typeof import('http'))['createServer']>;

  async start(configPath?: string): Promise<void> {
    log.info('Brigade Gateway starting...');

    // 1. Load configuration
    const config = await loadConfig(configPath);
    initLogger({
      level: config.logging?.level ?? 'info',
      pretty: config.logging?.pretty ?? true,
    });

    // 2. Initialize core dependencies
    const providers = ProviderRegistry.fromConfig(config.providers);
    const store = new JsonFileStore(config.storage.dataDir);
    const workspacesDir = path.join(config.storage.dataDir, 'workspaces');
    const workspace = new WorkspaceManager(workspacesDir);
    const memory = new MemoryManager(workspace, providers.getDefault());
    const skills = createDefaultSkillRegistry();

    log.info({ providerCount: providers.listRegistered().length, skillCount: skills.count() }, 'Dependencies initialized');

    // 3. Start scheduler
    if (config.scheduler?.heartbeat) {
      this.scheduler = new Scheduler({
        store,
        eventBus,
        onAction: async (action: ScheduledAction) => {
          log.info({ actionType: action.type }, 'Scheduler action triggered');
          // Action dispatch handled here — extend as needed
        },
      });

      await this.scheduler.start([], config.scheduler.heartbeat);
    }

    // 4. Start API server
    const app = createServer({
      apiKey: config.api?.apiKey,
      corsEnabled: config.api?.cors,
      rateLimit: config.api?.rateLimit,
    });

    const port = config.api?.port ?? 3000;
    const host = config.api?.host ?? 'localhost';

    await new Promise<void>((resolve) => {
      const http = require('http') as typeof import('http');
      this.httpServer = http.createServer(app);
      this.httpServer.listen(port, () => {
        log.info({ port, host }, 'API server started');
        resolve();
      });
    });

    // 5. Emit ready event
    eventBus.emit('gateway:ready', {
      startedAt: new Date().toISOString(),
      port,
    });

    log.info(`✅ Brigade Gateway ready at http://${host}:${port}`);

    // 6. Graceful shutdown
    process.on('SIGINT', () => this.stop());
    process.on('SIGTERM', () => this.stop());
  }

  async stop(): Promise<void> {
    log.info('Gateway shutting down...');
    eventBus.emit('gateway:stopping', { reason: 'shutdown' });

    this.scheduler?.stop();
    this.httpServer?.close();

    log.info('Gateway stopped.');
    process.exit(0);
  }
}

// Auto-start when run directly
if (require.main === module) {
  new Gateway().start().catch((e) => {
    console.error('Fatal gateway error:', e);
    process.exit(1);
  });
}
