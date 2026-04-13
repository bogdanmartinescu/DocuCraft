/**
 * Agent registry — create and look up agents by role or ID.
 */

import { BaseAgent } from './base-agent';
import { AgentRole, AgentConfig, AgentRecord } from '../core/types/agent';
import { BrigadeId, Timestamp } from '../core/types/common';
import { PlannerAgent } from './built-in/planner.agent';
import { CoderAgent } from './built-in/coder.agent';
import { MarketerAgent } from './built-in/marketer.agent';
import { SalesAgent } from './built-in/sales.agent';
import { ResearcherAgent } from './built-in/researcher.agent';
import { AnalystAgent } from './built-in/analyst.agent';
import { AssistantAgent } from './built-in/assistant.agent';
import { generateId } from '../core/utils/id';
import { AgentError } from '../core/errors';

const ROLE_FACTORIES: Record<AgentRole, () => BaseAgent> = {
  [AgentRole.Planner]:    () => new PlannerAgent(),
  [AgentRole.Coder]:      () => new CoderAgent(),
  [AgentRole.Marketer]:   () => new MarketerAgent(),
  [AgentRole.Sales]:      () => new SalesAgent(),
  [AgentRole.Researcher]: () => new ResearcherAgent(),
  [AgentRole.Analyst]:    () => new AnalystAgent(),
  [AgentRole.Assistant]:  () => new AssistantAgent(),
  [AgentRole.Custom]:     () => new AssistantAgent(), // fallback
};

export class AgentRegistry {
  private agents = new Map<BrigadeId, BaseAgent>();
  private records = new Map<BrigadeId, AgentRecord>();

  create(config: AgentConfig): { agent: BaseAgent; record: AgentRecord } {
    const id = config.id ?? generateId();
    const factory = ROLE_FACTORIES[config.role];
    if (!factory) throw new AgentError(`Unknown agent role: ${config.role}`);

    const agent = factory();
    const record: AgentRecord = {
      id,
      config: { ...config, id },
      status: 'idle',
      totalTasksCompleted: 0,
      totalTokensUsed: 0,
      createdAt: new Date().toISOString() as Timestamp,
      updatedAt: new Date().toISOString() as Timestamp,
    };

    this.agents.set(id, agent);
    this.records.set(id, record);
    return { agent, record };
  }

  get(id: BrigadeId): BaseAgent {
    const agent = this.agents.get(id);
    if (!agent) throw new AgentError(`Agent not found: ${id}`);
    return agent;
  }

  getRecord(id: BrigadeId): AgentRecord {
    const record = this.records.get(id);
    if (!record) throw new AgentError(`Agent record not found: ${id}`);
    return record;
  }

  getByRole(role: AgentRole): BaseAgent | undefined {
    for (const [id, agent] of this.agents) {
      if (agent.role === role) return agent;
    }
    return undefined;
  }

  listRecords(): AgentRecord[] {
    return [...this.records.values()];
  }

  remove(id: BrigadeId): void {
    this.agents.delete(id);
    this.records.delete(id);
  }

  createDefault(roles: AgentRole[]): AgentRecord[] {
    return roles.map((role) => {
      const { record } = this.create({
        name: `${role.charAt(0).toUpperCase() + role.slice(1)} Agent`,
        role,
        skills: ROLE_FACTORIES[role]
          ? (new (class extends (ROLE_FACTORIES[role]!() as unknown as { constructor: new () => BaseAgent }).constructor() {} as unknown as new () => BaseAgent))
            ? []
            : []
          : [],
      });
      return record;
    });
  }
}
