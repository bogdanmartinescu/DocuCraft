import { defineConfig } from './src/core/config';

export default defineConfig({
  name: 'my-company-automation',
  version: '1.0.0',

  providers: {
    default: 'anthropic',
    anthropic: {
      apiKey: process.env['ANTHROPIC_API_KEY']!,
      defaultModel: 'claude-sonnet-4-6',
    },
    openai: {
      apiKey: process.env['OPENAI_API_KEY']!,
      defaultModel: 'gpt-4o',
    },
    ollama: {
      baseUrl: 'http://localhost:11434',
      defaultModel: 'llama3',
    },
  },

  storage: {
    type: 'json-file',
    dataDir: './data',
  },

  memory: {
    shortTerm: { maxMessages: 100, maxTokens: 32_000 },
    dailyNotesDir: './data/memory',
    longTermFile: 'MEMORY.md',
    dreaming: {
      enabled: true,
      schedule: '0 3 * * *',
      lightSleep: { minImportanceThreshold: 0.3, maxAgeDays: 7 },
      remSleep: { crossReferenceDepth: 50, patternMinOccurrences: 3 },
      deepSleep: { maxLongTermEntries: 500, compactionStrategy: 'both' },
    },
  },

  teams: {
    default: {
      name: 'Default Team',
      orchestration: {
        orchestrationMode: 'orchestrator-worker',
        maxConcurrent: 3,
        maxSpawnDepth: 1,
        maxChildrenPerAgent: 3,
        sharedMemoryEnabled: true,
        timeout: 300_000,
      },
      members: [
        { role: 'assistant', isLead: true },
        { role: 'planner' },
        { role: 'researcher' },
        { role: 'analyst' },
        { role: 'coder' },
        { role: 'marketer' },
        { role: 'sales' },
      ],
    },
  },

  skills: {
    builtIn: true,
    disabled: [],
    custom: [],
    config: {
      'web-search': { apiKey: process.env['SEARCH_API_KEY'] },
      'code-execute': { sandbox: true, allowedLanguages: ['javascript', 'typescript', 'python'] },
    },
  },

  governance: {
    approvalRequired: ['email-send', 'social-post', 'database-query'],
    sandboxEnabled: false,
    maxTokensPerTask: 100_000,
  },

  scheduler: {
    heartbeat: {
      enabled: true,
      intervalMs: 1_800_000,
      heartbeatFile: 'HEARTBEAT.md',
    },
  },

  api: {
    port: 3000,
    host: 'localhost',
    apiKey: process.env['BRIGADE_API_KEY'],
    cors: true,
  },

  logging: {
    level: 'info',
    pretty: true,
  },
});
