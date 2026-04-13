#!/usr/bin/env node
/**
 * Brigade CLI — command-line interface for the platform.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig } from '../core/config';
import { initLogger } from '../core/logger';
import { ProviderRegistry } from '../providers/provider-registry';
import { JsonFileStore } from '../storage/json-file-store';
import { WorkspaceManager } from '../storage/workspace-manager';
import { MemoryManager } from '../memory/memory-manager';
import { createDefaultSkillRegistry } from '../skills';
import { AgentRegistry } from '../agents/agent-registry';
import { AgentTeam } from '../teams/agent-team';
import { TeamOrchestrator } from '../teams/team-orchestrator';
import { BrigadeEventBus, eventBus } from '../core/events/event-bus';
import { AgentRole } from '../core/types/agent';
import path from 'path';

const program = new Command();

program
  .name('brigade')
  .description('Brigade — Business automation with AI agent teams')
  .version('0.1.0');

// ─── brigade run ─────────────────────────────────────────────────────────────
program
  .command('run <task>')
  .description('Run a task with the default agent team')
  .option('-m, --mode <mode>', 'Orchestration mode', 'orchestrator-worker')
  .option('-a, --agents <roles>', 'Comma-separated agent roles', 'planner,researcher,analyst,assistant')
  .action(async (task: string, opts: { mode: string; agents: string }) => {
    await withConfig(async ({ providers, store, workspace, memory, skills }) => {
      console.log(chalk.cyan(`\n🚀 Running task: ${task}\n`));

      const roles = opts.agents.split(',').map((r) => r.trim() as AgentRole);
      const registry = new AgentRegistry();
      const team = new AgentTeam({
        name: 'CLI Team',
        config: {
          orchestrationMode: opts.mode as 'orchestrator-worker',
          maxConcurrent: 3,
          maxSpawnDepth: 1,
          maxChildrenPerAgent: 3,
          sharedMemoryEnabled: true,
          timeout: 300_000,
        },
      });

      for (const role of roles) {
        const { agent, record } = registry.create({ name: `${role} agent`, role, skills: [] });
        team.addMember(agent, record.id, role === AgentRole.Planner || role === AgentRole.Assistant);
      }

      const orchestrator = new TeamOrchestrator(team, {
        memory,
        skills,
        store,
        provider: providers.getDefault(),
        workspace,
        eventBus,
      });

      const result = await orchestrator.run(task);
      console.log(chalk.green('\n✅ Task complete!\n'));
      console.log(chalk.white(JSON.stringify(result.aggregatedOutput, null, 2)));
    });
  });

// ─── brigade chat ────────────────────────────────────────────────────────────
program
  .command('chat')
  .description('Interactive chat with an agent')
  .option('-r, --role <role>', 'Agent role to chat with', 'assistant')
  .action(async (opts: { role: string }) => {
    await withConfig(async ({ providers, store, workspace, memory, skills }) => {
      const readline = await import('readline');
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

      console.log(chalk.cyan(`\nChatting with ${opts.role} agent. Type "exit" to quit.\n`));

      const registry = new AgentRegistry();
      const { agent, record } = registry.create({
        name: `${opts.role} agent`,
        role: opts.role as AgentRole,
        skills: [],
      });

      const sessionId = record.id;
      memory.shortTerm.createSession(record.id, sessionId);
      workspace.createWorkspace(record.id, opts.role as AgentRole);

      const { AgentContext } = await import('../agents/agent-context');
      const context = new AgentContext({
        agentId: record.id,
        sessionId,
        config: record.config,
        provider: providers.getDefault(),
        memory,
        skills,
        store,
        eventBus,
        workspace: workspace.getWorkspacePath(record.id),
      });
      agent.setContext(context);

      const ask = (): void => {
        rl.question(chalk.yellow('You: '), async (input: string) => {
          if (input.trim().toLowerCase() === 'exit') {
            console.log(chalk.cyan('\nGoodbye!\n'));
            rl.close();
            return;
          }

          const { AgentTask } = await import('../core/types/agent');
          void AgentTask; // type import only

          const { generateId } = await import('../core/utils/id');
          const task = { id: generateId(), description: input, sessionId };
          const result = await agent.run(task);
          console.log(chalk.green(`\nAgent: ${result.output}\n`));
          ask();
        });
      };

      ask();
    });
  });

// ─── brigade serve ───────────────────────────────────────────────────────────
program
  .command('serve')
  .description('Start the Brigade API server')
  .option('-p, --port <port>', 'Port number', '3000')
  .action(async (opts: { port: string }) => {
    await withConfig(async ({ config }) => {
      const { createServer } = await import('./server-cli');
      const port = parseInt(opts.port, 10);
      await createServer(config, port);
    });
  });

// ─── brigade skill list ──────────────────────────────────────────────────────
program
  .command('skill')
  .description('Manage skills')
  .command('list')
  .action(async () => {
    await withConfig(async ({ skills }) => {
      const all = skills.listAll();
      console.log(chalk.cyan(`\n📦 ${all.length} skills available:\n`));
      for (const skill of all) {
        const risk = skill.riskLevel === 'high' ? chalk.red('high') : skill.riskLevel === 'medium' ? chalk.yellow('medium') : chalk.green('low');
        console.log(`  ${chalk.bold(skill.name.padEnd(22))} ${risk.padEnd(15)} ${skill.description}`);
      }
      console.log();
    });
  });

// ─── brigade agent list ──────────────────────────────────────────────────────
program
  .command('agent')
  .description('Manage agents')
  .command('list')
  .action(() => {
    console.log(chalk.cyan('\n🤖 Built-in agent roles:\n'));
    for (const role of Object.values(AgentRole)) {
      console.log(`  ${chalk.bold(role)}`);
    }
    console.log();
  });

program.parseAsync(process.argv).catch((e) => {
  console.error(chalk.red(`\nError: ${(e as Error).message}\n`));
  process.exit(1);
});

// ─── Shared bootstrap helper ──────────────────────────────────────────────────
async function withConfig(
  fn: (deps: {
    config: Awaited<ReturnType<typeof loadConfig>>;
    providers: ProviderRegistry;
    store: JsonFileStore;
    workspace: WorkspaceManager;
    memory: MemoryManager;
    skills: ReturnType<typeof createDefaultSkillRegistry>;
  }) => Promise<void>,
): Promise<void> {
  try {
    const config = await loadConfig();
    initLogger({ level: config.logging?.level ?? 'info', pretty: config.logging?.pretty ?? true });

    const providers = ProviderRegistry.fromConfig(config.providers);
    const store = new JsonFileStore(config.storage.dataDir);
    const workspacesDir = path.join(config.storage.dataDir, 'workspaces');
    const workspace = new WorkspaceManager(workspacesDir);
    const memory = new MemoryManager(workspace, providers.getDefault());
    const skills = createDefaultSkillRegistry();

    await fn({ config, providers, store, workspace, memory, skills });
  } catch (e) {
    console.error(chalk.red(`\nError: ${(e as Error).message}\n`));
    process.exit(1);
  }
}
