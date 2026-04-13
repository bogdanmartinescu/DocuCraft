# Brigade

**Open-source, self-hosted business automation platform powered by teams of AI agents.**

Brigade lets you build teams of specialized AI agents — Planner, Coder, Marketer, Sales, Researcher, Analyst, and Assistant — that collaborate autonomously to complete business workflows. Inspired by OpenClaw, built TypeScript-first with strong types, a fluent workflow DSL, model-agnostic providers, and a 4-tier memory system with nightly Dreaming consolidation.

---

## Features

| Feature | Description |
|---|---|
| **Multi-Agent Teams** | 7 built-in roles; teams with orchestrator-worker, consensus, pipeline, or autonomous modes |
| **Skills System** | 8 built-in skills (web-search, file-read/write, code-execute, api-call, summarize, data-analyze, web-scrape); extensible |
| **4-Tier Memory** | Short-term (session), daily notes, long-term (MEMORY.md), + nightly Dreaming consolidation |
| **Workflow DSL** | TypeScript-first fluent DSL with parallel steps, approval gates, and variable interpolation |
| **Model-Agnostic** | Anthropic Claude (default), OpenAI GPT, local Ollama — swap per agent |
| **Autonomous Scheduler** | Cron jobs, heartbeat daemon (HEARTBEAT.md), one-shot tasks |
| **REST API** | Express API with auth, rate limiting, and health endpoints |
| **CLI** | `brigade run`, `brigade chat`, `brigade serve`, `brigade skill list` |
| **Self-Hosted** | Runs on any VPS (2 GB RAM minimum); your data never leaves your machine |

---

## Quick Start

```bash
git clone https://github.com/bogdanmartinescu/Brigade
cd Brigade
npm install
cp .env.example .env           # Add your ANTHROPIC_API_KEY
cp brigade.config.example.ts brigade.config.ts

# Run a task with the default team
npx ts-node src/cli/index.ts run "Research the top 5 CRM tools and write a comparison report"

# Interactive chat with an agent
npx ts-node src/cli/index.ts chat --role researcher

# Start the API server
npx ts-node src/cli/index.ts serve
```

---

## Agent Roles

| Role | Capabilities | Default Skills |
|---|---|---|
| **Planner** | Goal decomposition, task delegation, planning | summarize, file-read/write |
| **Coder** | Write, review, and execute code | code-execute, file-read/write, api-call, web-search |
| **Marketer** | Content creation, campaigns, copywriting | web-search, web-scrape, summarize, file-write |
| **Sales** | Outreach, proposals, CRM updates | web-search, web-scrape, file-write, api-call |
| **Researcher** | Multi-source research, synthesis, reports | web-search, web-scrape, summarize, file-read/write |
| **Analyst** | Data analysis, insights, reporting | data-analyze, summarize, file-read/write, code-execute |
| **Assistant** | General tasks, coordination, scheduling | web-search, summarize, file-read/write, api-call |

---

## Example Workflow (TypeScript DSL)

```typescript
import { workflow } from 'brigade';

const onboarding = workflow('customer-onboarding')
  .description('Onboard a new enterprise customer end-to-end')
  .step({
    name: 'research',
    agent: 'researcher',
    task: 'Research {{companyName}} — industry, size, recent news, key contacts',
  })
  .step({
    name: 'proposal',
    agent: 'sales',
    task: 'Draft a personalized proposal for {{companyName}} using the research',
    dependsOn: ['research'],
    approvalRequired: true,
  })
  .parallel('outreach', [
    { name: 'email-sequence', agent: 'marketer', task: 'Write 3-email onboarding sequence for {{companyName}}' },
    { name: 'crm-entry',      agent: 'sales',    task: 'Create CRM record for {{companyName}} with all details' },
  ], { dependsOn: ['proposal'] })
  .step({
    name: 'setup',
    agent: 'coder',
    task: 'Write configuration and setup script for {{companyName}} environment',
    dependsOn: ['outreach'],
  })
  .build();
```

---

## Memory System

Brigade implements a 4-tier memory architecture:

```
┌─────────────────┐
│  Short-Term     │  In-memory session messages (bounded by token limit)
├─────────────────┤
│  Daily Notes    │  memory/YYYY-MM-DD.md  — what happened today
├─────────────────┤
│  Long-Term      │  MEMORY.md — durable facts and decisions
├─────────────────┤
│  Dreaming       │  Nightly 3-phase consolidation (Light Sleep → REM → Deep Sleep)
└─────────────────┘
```

**Dreaming** (inspired by OpenClaw) runs nightly at 3 AM by default:
1. **Light Sleep** — score and prune low-value short-term entries
2. **REM Sleep** — cross-reference entries, find patterns via LLM
3. **Deep Sleep** — promote high-value insights to MEMORY.md, compact if needed

---

## Directory Structure

```
src/
  core/           Types, errors, event bus, config (Zod), logger, utils
  providers/      Anthropic, OpenAI, Ollama adapters + model router
  memory/         4-tier memory system + Dreaming engine
  skills/         BaseSkill, registry, 8 built-in skills
  agents/         BaseAgent (perceive-plan-act-reflect), 7 built-in agents
  teams/          AgentTeam, TeamOrchestrator, TaskQueue
  workflows/      TypeScript DSL builder, YAML parser, workflow engine
  scheduler/      Cron jobs, heartbeat daemon, one-shot tasks
  channels/       HTTP, CLI, Slack, Discord, Telegram, WebSocket adapters
  storage/        JSON file store, SQLite store, workspace manager
  api/            Express REST API
  cli/            Commander.js CLI
  gateway/        Central process — boots everything
```

---

## REST API

```
GET  /api/health               Health check
GET  /api/agents               List agents
POST /api/agents               Create agent
POST /api/agents/:id/run       Run a task with an agent
POST /api/agents/:id/chat      Chat (streaming SSE)
GET  /api/teams                List teams
POST /api/teams                Create team
POST /api/teams/:id/run        Run a task with a team
GET  /api/skills               List available skills
POST /api/workflows/:id/run    Start a workflow run
POST /api/workflows/:id/runs/:runId/approve  Approve a gate
GET  /api/scheduler/jobs       List scheduled jobs
POST /api/scheduler/jobs       Create a cron job
```

---

## Daily Development Roadmap

| Day | Milestone |
|---|---|
| **1** | Project bootstrap: remove old files, package.json, tsconfig, core types |
| **2** | Event bus, config loader (Zod), logger, utility functions |
| **3** | BaseProvider, Anthropic adapter with streaming |
| **4** | OpenAI + Ollama adapters, model router with fallback chains |
| **5** | Storage: JSON file store, SQLite option, workspace manager |
| **6** | Memory: short-term, daily notes, long-term (MEMORY.md) |
| **7** | Dreaming engine: 3-phase consolidation + importance scoring |
| **8** | Skills system: BaseSkill, registry, SKILL.md parser |
| **9** | 8 built-in skills (web-search, file-read/write, code-execute, api-call, summarize, data-analyze, web-scrape) |
| **10** | BaseAgent + perceive-plan-act-reflect loop, AgentRunner |
| **11** | Planner + Researcher agents; system prompts, SOUL.md loader |
| **12** | Coder, Marketer, Sales, Analyst, Assistant agents |
| **13** | AgentTeam, delegation logic, lane-based task queue |
| **14** | TeamOrchestrator: orchestrator-worker mode end-to-end |
| **15** | Consensus + pipeline orchestration modes, spawn manager |
| **16** | Workflow DSL builder + compiler |
| **17** | Workflow engine: step/parallel/branch/loop execution, approval gates |
| **18** | Scheduler: cron manager, heartbeat daemon, one-shot tasks |
| **19** | REST API: Express server, middleware, all route groups |
| **20** | OpenAPI spec + Swagger UI; CLI with all 10 commands |
| **21** | HTTP + WebSocket + CLI channel adapters |
| **22** | Slack, Discord, Telegram channel adapters |
| **23** | Gateway: central process, session manager, process manager |
| **24** | Remaining 12 built-in skills (email, calendar, PDF, image, translate, etc.) |
| **25** | Integration tests, documentation, `brigade init` templates |

---

## Configuration

Copy `brigade.config.example.ts` to `brigade.config.ts` and fill in your values.

Key sections:

- **`providers`** — configure Anthropic, OpenAI, or Ollama
- **`teams`** — define team compositions and orchestration modes
- **`skills`** — enable/disable skills, add per-skill config
- **`memory.dreaming`** — tune the nightly consolidation
- **`scheduler`** — heartbeat interval and pre-defined cron jobs
- **`governance`** — approval gates for high-risk actions

---

## License

MIT — free to use, modify, and self-host.

---

*Built as an open-source alternative to OpenClaw — TypeScript-first, fully typed, and business-focused.*
