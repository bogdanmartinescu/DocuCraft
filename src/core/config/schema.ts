/**
 * Zod validation schema for Brigade configuration.
 */

import { z } from 'zod';

const providerTypeSchema = z.enum(['anthropic', 'openai', 'ollama']);

const anthropicConfigSchema = z.object({
  apiKey: z.string().min(1),
  defaultModel: z.string().default('claude-sonnet-4-6'),
  baseUrl: z.string().url().optional(),
});

const openaiConfigSchema = z.object({
  apiKey: z.string().min(1),
  defaultModel: z.string().default('gpt-4o'),
  organization: z.string().optional(),
  baseUrl: z.string().url().optional(),
});

const ollamaConfigSchema = z.object({
  baseUrl: z.string().url().default('http://localhost:11434'),
  defaultModel: z.string().default('llama3'),
});

const providersSchema = z.object({
  default: providerTypeSchema,
  anthropic: anthropicConfigSchema.optional(),
  openai: openaiConfigSchema.optional(),
  ollama: ollamaConfigSchema.optional(),
});

const routingRuleSchema = z.object({
  capability: z.string().optional(),
  costTier: z.enum(['low', 'medium', 'high']).optional(),
  provider: providerTypeSchema,
  model: z.string(),
  priority: z.number().optional(),
});

const routingSchema = z.object({
  rules: z.array(routingRuleSchema).default([]),
  fallbackChain: z.array(providerTypeSchema).default(['anthropic']),
});

const storageSchema = z.object({
  type: z.enum(['json-file', 'sqlite']).default('json-file'),
  dataDir: z.string().default('./data'),
  sqlitePath: z.string().optional(),
});

const dreamingSchema = z.object({
  enabled: z.boolean().default(true),
  schedule: z.string().default('0 3 * * *'),
  lightSleep: z.object({
    minImportanceThreshold: z.number().min(0).max(1).default(0.3),
    maxAgeDays: z.number().positive().default(7),
  }),
  remSleep: z.object({
    crossReferenceDepth: z.number().positive().default(50),
    patternMinOccurrences: z.number().positive().default(3),
  }),
  deepSleep: z.object({
    maxLongTermEntries: z.number().positive().default(500),
    compactionStrategy: z.enum(['summarize', 'deduplicate', 'both']).default('both'),
  }),
});

const memorySchema = z.object({
  shortTerm: z.object({
    maxMessages: z.number().positive().default(100),
    maxTokens: z.number().positive().default(32000),
  }),
  dailyNotesDir: z.string().default('./data/memory'),
  longTermFile: z.string().default('MEMORY.md'),
  dreaming: dreamingSchema,
});

const teamConfigSchema = z.object({
  orchestrationMode: z.enum(['orchestrator-worker', 'consensus', 'pipeline', 'autonomous']),
  maxConcurrent: z.number().positive().default(3),
  maxSpawnDepth: z.number().min(1).max(3).default(1),
  maxChildrenPerAgent: z.number().positive().default(3),
  sharedMemoryEnabled: z.boolean().default(true),
  timeout: z.number().positive().default(300_000),
  pipelineOrder: z.array(z.string()).optional(),
});

const teamMemberConfigSchema = z.object({
  role: z.string(),
  agentId: z.string().optional(),
  isLead: z.boolean().optional(),
  skills: z.array(z.string()).optional(),
});

const teamSetupSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  members: z.array(teamMemberConfigSchema),
  orchestration: teamConfigSchema,
});

const skillsSchema = z.object({
  builtIn: z.boolean().default(true),
  disabled: z.array(z.string()).default([]),
  custom: z.array(z.string()).default([]),
  config: z.record(z.string(), z.record(z.string(), z.unknown())).default({}),
});

const governanceSchema = z.object({
  defaultToolPolicy: z.object({
    mode: z.enum(['allowlist', 'denylist']),
    skills: z.array(z.string()),
  }).optional(),
  approvalRequired: z.array(z.string()).default([]),
  sandboxEnabled: z.boolean().default(false),
  maxTokensPerTask: z.number().optional(),
  maxCostPerTask: z.number().optional(),
});

const heartbeatSchema = z.object({
  enabled: z.boolean().default(true),
  intervalMs: z.number().positive().default(1_800_000),
  heartbeatFile: z.string().default('HEARTBEAT.md'),
  agentId: z.string().optional(),
});

const apiSchema = z.object({
  port: z.number().positive().default(3000),
  host: z.string().default('localhost'),
  apiKey: z.string().optional(),
  cors: z.boolean().default(true),
  rateLimit: z.object({
    windowMs: z.number().positive().default(60_000),
    max: z.number().positive().default(100),
  }).optional(),
});

const loggingSchema = z.object({
  level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  pretty: z.boolean().default(true),
});

export const brigadeConfigSchema = z.object({
  name: z.string(),
  version: z.string().default('1.0.0'),
  providers: providersSchema,
  routing: routingSchema.optional(),
  storage: storageSchema,
  memory: memorySchema,
  teams: z.record(z.string(), teamSetupSchema).optional(),
  skills: skillsSchema.optional(),
  governance: governanceSchema.optional(),
  scheduler: z.object({
    heartbeat: heartbeatSchema,
  }).optional(),
  channels: z.record(z.string(), z.unknown()).optional(),
  api: apiSchema.optional(),
  logging: loggingSchema.optional(),
});

export type ValidatedConfig = z.infer<typeof brigadeConfigSchema>;
