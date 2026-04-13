/**
 * Abstract BaseAgent — the perceive-plan-act-reflect cognitive loop.
 * All built-in and custom agents extend this class.
 */

import { AgentRole, AgentTask, AgentResult, AgentPlan } from '../core/types/agent';
import { MemoryChunk, MemoryTier } from '../core/types/memory';
import { AgentContext } from './agent-context';
import { generateId } from '../core/utils/id';
import { Timestamp } from '../core/types/common';

export abstract class BaseAgent {
  abstract readonly role: AgentRole;
  abstract readonly defaultSkills: string[];
  abstract readonly defaultModel?: string;

  protected context!: AgentContext;

  /** Inject context after construction (done by AgentRunner). */
  setContext(context: AgentContext): void {
    this.context = context;
  }

  /**
   * Main entry point — runs the full cognitive loop:
   * perceive → plan → act → reflect
   */
  async run(task: AgentTask): Promise<AgentResult> {
    const startTime = Date.now();

    this.context.eventBus.emit('agent:task:started', {
      agentId: this.context.agentId,
      taskId: task.id,
      description: task.description,
    });

    try {
      const memories = await this.perceive(task);
      const plan = await this.plan(task, memories);
      const output = await this.act(plan, task);
      await this.reflect(task, output);

      const result: AgentResult = {
        taskId: task.id,
        agentId: this.context.agentId,
        agentRole: this.role,
        status: 'completed',
        output,
        tokensUsed: 0, // accumulated by AgentRunner
        durationMs: Date.now() - startTime,
        completedAt: new Date().toISOString() as Timestamp,
      };

      this.context.eventBus.emit('agent:task:completed', {
        agentId: this.context.agentId,
        result,
      });

      return result;
    } catch (error) {
      const err = error as Error;
      this.context.eventBus.emit('agent:task:failed', {
        agentId: this.context.agentId,
        taskId: task.id,
        error: err.message,
      });

      return {
        taskId: task.id,
        agentId: this.context.agentId,
        agentRole: this.role,
        status: 'failed',
        output: null,
        tokensUsed: 0,
        durationMs: Date.now() - startTime,
        error: err.message,
        completedAt: new Date().toISOString() as Timestamp,
      };
    }
  }

  /**
   * Phase 1: Perceive — gather relevant memory and context for the task.
   */
  protected async perceive(task: AgentTask): Promise<MemoryChunk[]> {
    const context = this.context.memory.buildContext(
      this.context.agentId,
      this.context.sessionId,
      task.description,
    );

    // Store the perceived context as a memory chunk for reflection
    if (context.trim()) {
      return [{
        id: generateId(),
        tier: MemoryTier.ShortTerm,
        content: context,
        metadata: {
          agentId: this.context.agentId,
          sessionId: this.context.sessionId,
          timestamp: new Date().toISOString() as Timestamp,
          source: 'perceive',
          importance: 0.5,
          tags: ['context'],
          accessCount: 1,
          lastAccessed: new Date().toISOString() as Timestamp,
        },
      }];
    }
    return [];
  }

  /**
   * Phase 2: Plan — determine how to approach the task.
   * Default implementation returns a single-step plan.
   * Override in specialized agents for more sophisticated planning.
   */
  protected async plan(task: AgentTask, _memories: MemoryChunk[]): Promise<AgentPlan> {
    return {
      steps: [{ description: task.description }],
      reasoning: 'Execute the task directly.',
      estimatedSteps: 1,
    };
  }

  /**
   * Phase 3: Act — execute the plan using skills and the LLM.
   * This is implemented by AgentRunner in the tool-calling loop.
   * Override for custom execution behavior.
   */
  protected async act(plan: AgentPlan, task: AgentTask): Promise<unknown> {
    return this.executeWithTools(task, plan);
  }

  /**
   * Phase 4: Reflect — record what happened to memory.
   */
  protected async reflect(task: AgentTask, result: unknown): Promise<void> {
    const note = `Completed task: "${task.description.slice(0, 100)}" — ${typeof result === 'string' ? result.slice(0, 200) : JSON.stringify(result).slice(0, 200)}`;
    this.context.memory.recordEvent(this.context.agentId, note);
  }

  /**
   * Build the system prompt for this agent.
   * Combines SOUL.md + role instructions + skill list.
   */
  buildSystemPrompt(): string {
    const soul = this.context.memory.getSoul(this.context.agentId);
    const rules = this.context.memory.getAgentRules(this.context.agentId);
    const skillList = this.context.config.skills
      .map((s) => `- ${s}`)
      .join('\n');

    const parts = [
      soul || `You are an expert ${this.role} agent.`,
      rules ? `\n## Behavioral Rules\n${rules}` : '',
      skillList ? `\n## Available Skills\n${skillList}` : '',
      `\n## Your Role\nYou are a ${this.role} agent. ${this.getRoleInstructions()}`,
    ];

    return parts.filter(Boolean).join('\n');
  }

  /** Role-specific instructions — override in subclasses. */
  protected getRoleInstructions(): string {
    return 'Complete the given task to the best of your ability.';
  }

  /**
   * Core LLM + tool-calling loop.
   * Sends the task to the LLM, handles tool calls, loops until done.
   */
  private async executeWithTools(task: AgentTask, plan: AgentPlan): Promise<unknown> {
    const tools = this.context.skills.toToolDefs(this.context.config.skills);
    const memoryContext = this.context.memory.buildContext(
      this.context.agentId,
      this.context.sessionId,
      task.description,
    );

    const systemPrompt = this.buildSystemPrompt();
    const userContent = [
      memoryContext ? `## Context\n${memoryContext}\n` : '',
      `## Task\n${task.description}`,
      plan.steps.length > 1
        ? `\n## Plan\n${plan.steps.map((s, i) => `${i + 1}. ${s.description}`).join('\n')}`
        : '',
    ].filter(Boolean).join('\n');

    const messages = this.context.memory.getSessionMessages(this.context.sessionId);

    let response = await this.context.provider.chat({
      systemPrompt,
      messages: [
        ...messages,
        { role: 'user', content: userContent },
      ],
      tools,
      maxTokens: this.context.config.maxTokens ?? 8192,
      temperature: this.context.config.temperature ?? 0.7,
    });

    // Tool-calling loop
    let iterations = 0;
    const maxIterations = 10;

    while (response.stopReason === 'tool_use' && response.toolCalls?.length && iterations < maxIterations) {
      iterations++;
      const toolResults: Array<{ role: 'tool'; content: string; toolCallId: string }> = [];

      for (const toolCall of response.toolCalls) {
        this.context.eventBus.emit('agent:skill:invoked', {
          agentId: this.context.agentId,
          skillName: toolCall.name,
          taskId: task.id,
        });

        const skillResult = await this.context.skills
          .get(toolCall.name)
          .safeExecute(toolCall.input, {
            agentId: this.context.agentId,
            sessionId: this.context.sessionId,
            workspace: this.context.workspace,
            provider: this.context.provider,
            store: this.context.store,
            logger: this.context.logger,
            config: {},
          });

        this.context.eventBus.emit('agent:skill:result', {
          agentId: this.context.agentId,
          skillName: toolCall.name,
          success: skillResult.success,
          durationMs: skillResult.durationMs,
        });

        toolResults.push({
          role: 'tool',
          content: skillResult.success
            ? JSON.stringify(skillResult.output)
            : `Error: ${skillResult.error}`,
          toolCallId: toolCall.id,
        });
      }

      // Continue conversation with tool results
      response = await this.context.provider.chat({
        systemPrompt,
        messages: [
          ...messages,
          { role: 'user', content: userContent },
          {
            role: 'assistant',
            content: response.content,
            toolCalls: response.toolCalls,
          },
          ...toolResults,
        ],
        tools,
        maxTokens: this.context.config.maxTokens ?? 8192,
        temperature: this.context.config.temperature ?? 0.7,
      });
    }

    // Store the exchange in session memory
    this.context.memory.addSessionMessage(this.context.sessionId, {
      role: 'user',
      content: userContent,
    });
    this.context.memory.addSessionMessage(this.context.sessionId, {
      role: 'assistant',
      content: response.content,
    });

    return response.content;
  }
}
