/**
 * Brigade — public API exports.
 */

// Core types
export * from './core/types/common';
export * from './core/types/agent';
export * from './core/types/team';
export * from './core/types/skill';
export * from './core/types/memory';
export * from './core/types/workflow';
export * from './core/types/scheduler';
export * from './core/types/channel';
export * from './core/types/provider';
export * from './core/types/config';

// Errors
export * from './core/errors';

// Event bus
export { BrigadeEventBus, eventBus } from './core/events/event-bus';

// Config
export { defineConfig, loadConfig, getConfig } from './core/config';

// Providers
export { BaseProvider } from './providers/base-provider';
export { ProviderRegistry } from './providers/provider-registry';
export { AnthropicProvider } from './providers/anthropic/anthropic-provider';
export { OpenAIProvider } from './providers/openai/openai-provider';
export { OllamaProvider } from './providers/ollama/ollama-provider';

// Storage
export { BaseStore } from './storage/base-store';
export { JsonFileStore } from './storage/json-file-store';
export { WorkspaceManager } from './storage/workspace-manager';

// Memory
export { MemoryManager } from './memory/memory-manager';

// Skills
export { BaseSkill } from './skills/base-skill';
export { SkillRegistry } from './skills/skill-registry';
export { createDefaultSkillRegistry } from './skills';

// Agents
export { BaseAgent } from './agents/base-agent';
export { AgentContext } from './agents/agent-context';
export { AgentRegistry } from './agents/agent-registry';
export { PlannerAgent } from './agents/built-in/planner.agent';
export { CoderAgent } from './agents/built-in/coder.agent';
export { MarketerAgent } from './agents/built-in/marketer.agent';
export { SalesAgent } from './agents/built-in/sales.agent';
export { ResearcherAgent } from './agents/built-in/researcher.agent';
export { AnalystAgent } from './agents/built-in/analyst.agent';
export { AssistantAgent } from './agents/built-in/assistant.agent';

// Teams
export { AgentTeam } from './teams/agent-team';
export { TeamOrchestrator } from './teams/team-orchestrator';

// Workflows
export { workflow } from './workflows/dsl/builder';

// Scheduler
export { Scheduler } from './scheduler/scheduler';

// Gateway
export { Gateway } from './gateway/gateway';
