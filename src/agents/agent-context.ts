/**
 * AgentContext — everything an agent needs to perceive, plan, act, and reflect.
 */

import { BrigadeId } from '../core/types/common';
import { AgentConfig } from '../core/types/agent';
import { BaseProvider } from '../providers/base-provider';
import { MemoryManager } from '../memory/memory-manager';
import { SkillRegistry } from '../skills/skill-registry';
import { BaseStore } from '../storage/base-store';
import { BrigadeEventBus } from '../core/events/event-bus';
import { Logger } from 'pino';
import { getLogger } from '../core/logger';

export class AgentContext {
  public readonly agentId: BrigadeId;
  public readonly sessionId: string;
  public readonly config: AgentConfig;
  public readonly provider: BaseProvider;
  public readonly memory: MemoryManager;
  public readonly skills: SkillRegistry;
  public readonly store: BaseStore;
  public readonly eventBus: BrigadeEventBus;
  public readonly workspace: string;
  public readonly logger: Logger;
  public teamId?: BrigadeId;

  constructor(params: {
    agentId: BrigadeId;
    sessionId: string;
    config: AgentConfig;
    provider: BaseProvider;
    memory: MemoryManager;
    skills: SkillRegistry;
    store: BaseStore;
    eventBus: BrigadeEventBus;
    workspace: string;
    teamId?: BrigadeId;
  }) {
    this.agentId = params.agentId;
    this.sessionId = params.sessionId;
    this.config = params.config;
    this.provider = params.provider;
    this.memory = params.memory;
    this.skills = params.skills;
    this.store = params.store;
    this.eventBus = params.eventBus;
    this.workspace = params.workspace;
    this.teamId = params.teamId;
    this.logger = getLogger(`agent:${params.config.role}`);
  }
}
