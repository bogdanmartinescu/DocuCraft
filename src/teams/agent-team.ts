/**
 * AgentTeam — a group of agents with a shared goal and shared memory.
 */

import { TeamRecord, TeamMember, TeamConfig } from '../core/types/team';
import { BrigadeId, Timestamp } from '../core/types/common';
import { AgentRole } from '../core/types/agent';
import { BaseAgent } from '../agents/base-agent';
import { generateId } from '../core/utils/id';

export class AgentTeam {
  public readonly id: BrigadeId;
  public readonly name: string;
  public readonly description?: string;
  public readonly config: TeamConfig;
  private _members = new Map<BrigadeId, { agent: BaseAgent; member: TeamMember }>();

  constructor(params: {
    id?: BrigadeId;
    name: string;
    description?: string;
    config: TeamConfig;
  }) {
    this.id = params.id ?? generateId();
    this.name = params.name;
    this.description = params.description;
    this.config = params.config;
  }

  addMember(agent: BaseAgent, agentId: BrigadeId, isLead = false): void {
    const member: TeamMember = {
      agentId,
      role: agent.role,
      isLead,
      joinedAt: new Date().toISOString() as Timestamp,
    };
    this._members.set(agentId, { agent, member });
  }

  removeMember(agentId: BrigadeId): void {
    this._members.delete(agentId);
  }

  getAgent(agentId: BrigadeId): BaseAgent | undefined {
    return this._members.get(agentId)?.agent;
  }

  getAgentByRole(role: AgentRole): { agent: BaseAgent; agentId: BrigadeId } | undefined {
    for (const [agentId, { agent }] of this._members) {
      if (agent.role === role) return { agent, agentId };
    }
    return undefined;
  }

  getLead(): { agent: BaseAgent; agentId: BrigadeId } | undefined {
    for (const [agentId, { agent, member }] of this._members) {
      if (member.isLead) return { agent, agentId };
    }
    // Fallback: planner or assistant
    return this.getAgentByRole(AgentRole.Planner) ?? this.getAgentByRole(AgentRole.Assistant);
  }

  get members(): TeamMember[] {
    return [...this._members.values()].map((v) => v.member);
  }

  get memberCount(): number {
    return this._members.size;
  }

  toRecord(status: TeamRecord['status'] = 'idle'): TeamRecord {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      config: this.config,
      members: this.members,
      status,
      createdAt: new Date().toISOString() as Timestamp,
      updatedAt: new Date().toISOString() as Timestamp,
    };
  }
}
