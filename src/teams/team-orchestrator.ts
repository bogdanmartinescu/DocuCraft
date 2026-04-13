/**
 * TeamOrchestrator — coordinates multi-agent task execution.
 *
 * Supported modes:
 *   orchestrator-worker: Planner decomposes → workers execute → results merged
 *   consensus:           All agents attempt → vote on best result
 *   pipeline:            Sequential agent chain (A → B → C)
 *   autonomous:          Each agent independently handles its domain
 */

import { AgentTeam } from './agent-team';
import { TaskQueue } from './task-queue';
import { AgentContext } from '../agents/agent-context';
import { BaseAgent } from '../agents/base-agent';
import { AgentTask, AgentResult, AgentRole } from '../core/types/agent';
import { TeamResult } from '../core/types/team';
import { BrigadeId, Timestamp } from '../core/types/common';
import { BrigadeEventBus } from '../core/events/event-bus';
import { MemoryManager } from '../memory/memory-manager';
import { SkillRegistry } from '../skills/skill-registry';
import { BaseStore } from '../storage/base-store';
import { BaseProvider } from '../providers/base-provider';
import { WorkspaceManager } from '../storage/workspace-manager';
import { generateId } from '../core/utils/id';
import { Semaphore } from '../core/utils/concurrency';
import { getLogger } from '../core/logger';

const log = getLogger('team-orchestrator');

export interface OrchestratorDeps {
  memory: MemoryManager;
  skills: SkillRegistry;
  store: BaseStore;
  provider: BaseProvider;
  workspace: WorkspaceManager;
  eventBus: BrigadeEventBus;
}

export class TeamOrchestrator {
  private queue: TaskQueue;
  private semaphore: Semaphore;

  constructor(
    private readonly team: AgentTeam,
    private readonly deps: OrchestratorDeps,
  ) {
    this.queue = new TaskQueue();
    this.semaphore = new Semaphore(team.config.maxConcurrent);
  }

  async run(task: string, input?: Record<string, unknown>): Promise<TeamResult> {
    const runId = generateId();
    const startTime = Date.now();

    this.deps.eventBus.emit('team:run:started', {
      teamId: this.team.id,
      runId,
      task,
    });

    log.info({ teamId: this.team.id, runId, task }, 'Team run started');

    try {
      let agentResults: AgentResult[];

      switch (this.team.config.orchestrationMode) {
        case 'orchestrator-worker':
          agentResults = await this.runOrchestratorWorker(task, input, runId);
          break;
        case 'pipeline':
          agentResults = await this.runPipeline(task, input, runId);
          break;
        case 'consensus':
          agentResults = await this.runConsensus(task, input, runId);
          break;
        case 'autonomous':
          agentResults = await this.runAutonomous(task, input, runId);
          break;
        default:
          agentResults = await this.runOrchestratorWorker(task, input, runId);
      }

      const result: TeamResult = {
        teamId: this.team.id,
        runId,
        taskDescription: task,
        status: agentResults.every((r) => r.status !== 'failed') ? 'completed' : 'partial',
        agentResults,
        aggregatedOutput: this.aggregateResults(agentResults),
        totalTokensUsed: agentResults.reduce((sum, r) => sum + r.tokensUsed, 0),
        totalDurationMs: Date.now() - startTime,
        completedAt: new Date().toISOString() as Timestamp,
      };

      this.deps.eventBus.emit('team:run:completed', { teamId: this.team.id, result });
      return result;
    } catch (error) {
      const err = error as Error;
      this.deps.eventBus.emit('team:run:failed', {
        teamId: this.team.id,
        runId,
        error: err.message,
      });
      throw error;
    }
  }

  private async runOrchestratorWorker(
    task: string,
    input: Record<string, unknown> | undefined,
    _runId: BrigadeId,
  ): Promise<AgentResult[]> {
    const results: AgentResult[] = [];

    // Step 1: Lead agent (Planner/Assistant) decomposes the task
    const lead = this.team.getLead();
    if (!lead) {
      // No lead — run the task with the first available agent
      const firstMember = this.team.members[0];
      if (firstMember) {
        const result = await this.executeAgentTask(
          firstMember.agentId, firstMember.role, task, input,
        );
        return [result];
      }
      return [];
    }

    const planTask: AgentTask = {
      id: generateId(),
      description: `Create a step-by-step execution plan for the following goal. For each step, specify which agent role should handle it (planner/coder/marketer/sales/researcher/analyst/assistant) and what they should do.\n\nGoal: ${task}`,
      input,
      priority: 'high',
    };

    const planResult = await this.executeAgentTask(lead.agentId, lead.agent.role, planTask.description, input);
    results.push(planResult);

    // Step 2: Parse the plan and delegate sub-tasks
    if (planResult.status === 'completed' && typeof planResult.output === 'string') {
      const subTasks = this.parsePlanIntoTasks(planResult.output);

      // Execute sub-tasks with bounded concurrency
      const workerResults = await Promise.all(
        subTasks.map((sub) => this.semaphore.run(async () => {
          const targetMember = this.team.members.find((m) => m.role === sub.role)
            ?? this.team.members.find((m) => !m.isLead);

          if (!targetMember) return null;
          return this.executeAgentTask(targetMember.agentId, targetMember.role, sub.task, input);
        }))
      );

      results.push(...workerResults.filter((r): r is AgentResult => r !== null));
    }

    return results;
  }

  private async runPipeline(
    task: string,
    input: Record<string, unknown> | undefined,
    _runId: BrigadeId,
  ): Promise<AgentResult[]> {
    const results: AgentResult[] = [];
    const order = this.team.config.pipelineOrder ?? this.team.members.map((m) => m.role);
    let currentInput = task;

    for (const role of order) {
      const member = this.team.members.find((m) => m.role === role);
      if (!member) continue;

      const result = await this.executeAgentTask(member.agentId, role, currentInput, input);
      results.push(result);

      // Pass output to next agent
      if (result.status === 'completed' && typeof result.output === 'string') {
        currentInput = `Previous agent output:\n${result.output}\n\nContinue with: ${task}`;
      }
    }

    return results;
  }

  private async runConsensus(
    task: string,
    input: Record<string, unknown> | undefined,
    _runId: BrigadeId,
  ): Promise<AgentResult[]> {
    // All agents work on the same task independently
    const results = await Promise.all(
      this.team.members.map((member) =>
        this.semaphore.run(() =>
          this.executeAgentTask(member.agentId, member.role, task, input)
        )
      )
    );

    return results;
  }

  private async runAutonomous(
    task: string,
    input: Record<string, unknown> | undefined,
    _runId: BrigadeId,
  ): Promise<AgentResult[]> {
    // Each agent handles the portion of the task matching their role
    const results = await Promise.all(
      this.team.members.map((member) => {
        const roleTask = `Handle the ${member.role} aspects of: ${task}`;
        return this.semaphore.run(() =>
          this.executeAgentTask(member.agentId, member.role, roleTask, input)
        );
      })
    );

    return results;
  }

  private async executeAgentTask(
    agentId: BrigadeId,
    role: AgentRole,
    taskDescription: string,
    _input?: Record<string, unknown>,
  ): Promise<AgentResult> {
    const agent = this.team.getAgent(agentId);
    if (!agent) {
      return {
        taskId: generateId(),
        agentId,
        agentRole: role,
        status: 'failed',
        output: null,
        tokensUsed: 0,
        durationMs: 0,
        error: `Agent ${agentId} not found`,
        completedAt: new Date().toISOString() as Timestamp,
      };
    }

    const sessionId = generateId();
    this.deps.memory.shortTerm.createSession(agentId, sessionId);
    this.deps.workspace.createWorkspace(agentId, role);

    const context = new AgentContext({
      agentId,
      sessionId,
      config: { name: role, role, skills: agent.defaultSkills },
      provider: this.deps.provider,
      memory: this.deps.memory,
      skills: this.deps.skills,
      store: this.deps.store,
      eventBus: this.deps.eventBus,
      workspace: this.deps.workspace.getWorkspacePath(agentId),
      teamId: this.team.id,
    });

    agent.setContext(context);

    const task: AgentTask = {
      id: generateId(),
      description: taskDescription,
      sessionId,
    };

    return agent.run(task);
  }

  private parsePlanIntoTasks(planText: string): Array<{ role: AgentRole; task: string }> {
    const tasks: Array<{ role: AgentRole; task: string }> = [];
    const lines = planText.split('\n');
    const rolePattern = new RegExp(
      `(${Object.values(AgentRole).join('|')})`,
      'i'
    );

    for (const line of lines) {
      const trimmed = line.replace(/^[\d\-*.]+\s*/, '').trim();
      if (!trimmed) continue;

      const roleMatch = trimmed.match(rolePattern);
      if (roleMatch) {
        const role = roleMatch[1]!.toLowerCase() as AgentRole;
        const task = trimmed.replace(rolePattern, '').replace(/[:\-]/g, '').trim();
        if (task) tasks.push({ role, task });
      }
    }

    // If no roles found, assign all steps to assistant
    if (tasks.length === 0) {
      const steps = lines.filter((l) => /^\d+\./.test(l.trim()));
      for (const step of steps) {
        tasks.push({ role: AgentRole.Assistant, task: step.trim() });
      }
    }

    return tasks;
  }

  private aggregateResults(results: AgentResult[]): unknown {
    const successful = results.filter((r) => r.status === 'completed');
    if (successful.length === 0) return null;
    if (successful.length === 1) return successful[0]!.output;

    return {
      summary: `${successful.length} agents completed tasks`,
      outputs: successful.map((r) => ({
        agent: r.agentRole,
        output: r.output,
      })),
    };
  }
}
