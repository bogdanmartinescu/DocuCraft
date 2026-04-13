/**
 * TypeScript workflow DSL — fluent builder for multi-agent pipelines.
 *
 * Usage:
 *   const wf = workflow('onboarding')
 *     .step('research', { agent: 'researcher', task: 'Research {{company}}' })
 *     .parallel('outreach', [
 *       { name: 'email', agent: 'marketer', task: 'Write email for {{company}}' },
 *       { name: 'crm',   agent: 'sales',    task: 'Add {{company}} to CRM' },
 *     ])
 *     .build();
 */

import {
  Workflow,
  WorkflowStep,
  AgentStep,
  ParallelStep,
  ApprovalStep,
} from '../../core/types/workflow';
import { AgentRole } from '../../core/types/agent';
import { generateId } from '../../core/utils/id';
import { Timestamp } from '../../core/types/common';

export interface StepConfig {
  name: string;
  agent: AgentRole | string;
  task: string;
  dependsOn?: string[];
  timeout?: number;
  retries?: number;
  approvalRequired?: boolean;
  outputKey?: string;
}

export class WorkflowBuilder {
  private steps: WorkflowStep[] = [];
  private _description?: string;
  private _inputSchema?: Record<string, unknown>;

  constructor(private readonly name: string) {}

  description(desc: string): this {
    this._description = desc;
    return this;
  }

  input(schema: Record<string, unknown>): this {
    this._inputSchema = schema;
    return this;
  }

  step(config: StepConfig): this {
    if (config.approvalRequired) {
      // Insert approval gate before this step
      const gate: ApprovalStep = {
        type: 'approval',
        name: `approve-${config.name}`,
        message: `Approve execution of step: ${config.name}`,
        dependsOn: config.dependsOn,
      };
      this.steps.push(gate);
    }

    const agentStep: AgentStep = {
      type: 'agent',
      name: config.name,
      agent: config.agent,
      task: config.task,
      dependsOn: config.approvalRequired
        ? [`approve-${config.name}`]
        : config.dependsOn,
      timeout: config.timeout,
      retries: config.retries,
      outputKey: config.outputKey,
    };
    this.steps.push(agentStep);
    return this;
  }

  parallel(name: string, branches: StepConfig[], options?: { dependsOn?: string[] }): this {
    const parallel: ParallelStep = {
      type: 'parallel',
      name,
      branches: branches.map((b): AgentStep => ({
        type: 'agent',
        name: b.name,
        agent: b.agent,
        task: b.task,
        timeout: b.timeout,
      })),
      dependsOn: options?.dependsOn,
      joinStrategy: 'all',
    };
    this.steps.push(parallel);
    return this;
  }

  approvalGate(name: string, message: string, dependsOn?: string[]): this {
    const gate: ApprovalStep = {
      type: 'approval',
      name,
      message,
      dependsOn,
    };
    this.steps.push(gate);
    return this;
  }

  build(): Workflow {
    const now = new Date().toISOString() as Timestamp;
    return {
      id: generateId(),
      name: this.name,
      description: this._description,
      version: '1.0.0',
      inputSchema: this._inputSchema,
      steps: this.steps,
      createdAt: now,
      updatedAt: now,
    };
  }
}

/** Factory function to start building a workflow. */
export function workflow(name: string): WorkflowBuilder {
  return new WorkflowBuilder(name);
}
