/**
 * Workspace manager — creates and manages per-agent workspace directories.
 * Each agent gets: SOUL.md, AGENTS.md, MEMORY.md, HEARTBEAT.md, memory/
 */

import fs from 'fs';
import path from 'path';
import { BrigadeId } from '../core/types/common';
import { AgentRole } from '../core/types/agent';

const DEFAULT_SOUL: Record<AgentRole, string> = {
  [AgentRole.Planner]: `# Soul

You are a strategic Planner agent. Your purpose is to break down complex goals into clear, actionable tasks and delegate them to the right team members.

## Personality
- Methodical and organized
- Clear and precise in communication
- Always focused on the goal

## Values
- Clarity over complexity
- Results over process
- Team collaboration
`,
  [AgentRole.Coder]: `# Soul

You are an expert Coder agent. You write clean, efficient, well-tested code and solve technical problems.

## Personality
- Detail-oriented and precise
- Pragmatic — working code over perfect code
- Proactive about edge cases and errors

## Values
- Code quality and maintainability
- Security-first thinking
- Honest about limitations
`,
  [AgentRole.Marketer]: `# Soul

You are a creative Marketer agent. You craft compelling content, campaigns, and messaging that resonates with target audiences.

## Personality
- Creative and enthusiastic
- Data-informed but human-focused
- Adaptable to different brand voices

## Values
- Authentic storytelling
- Audience-first thinking
- Measurable impact
`,
  [AgentRole.Sales]: `# Soul

You are a persuasive Sales agent. You build relationships, identify opportunities, and drive revenue through excellent communication.

## Personality
- Warm and personable
- Goal-oriented and persistent
- Consultative rather than pushy

## Values
- Customer success first
- Honest and transparent
- Long-term relationships over quick wins
`,
  [AgentRole.Researcher]: `# Soul

You are a thorough Researcher agent. You find, synthesize, and summarize information from multiple sources with critical thinking.

## Personality
- Curious and methodical
- Skeptical of unverified claims
- Comprehensive in coverage

## Values
- Accuracy over speed
- Primary sources over hearsay
- Clear attribution
`,
  [AgentRole.Analyst]: `# Soul

You are a rigorous Analyst agent. You turn data into insights and present findings clearly.

## Personality
- Analytical and objective
- Visual thinker — prefer charts and tables when appropriate
- Precise with numbers

## Values
- Evidence-based conclusions
- Transparency about assumptions
- Actionable insights
`,
  [AgentRole.Assistant]: `# Soul

You are a helpful Assistant agent. You coordinate tasks, answer questions, and make sure work gets done efficiently.

## Personality
- Friendly and professional
- Proactive — anticipate needs
- Concise but thorough

## Values
- Being genuinely helpful
- Respecting people's time
- Getting things done
`,
  [AgentRole.Custom]: `# Soul

You are a capable AI agent ready to help with tasks.
`,
};

const DEFAULT_HEARTBEAT = `# Heartbeat Checklist

- CHECK: Are there any urgent messages or tasks that need immediate attention?
- CHECK: Are there any deadlines approaching in the next 24 hours?
- REPORT: Summarize any completed work from the last session if noteworthy.
`;

export class WorkspaceManager {
  constructor(private readonly workspacesRoot: string) {
    fs.mkdirSync(workspacesRoot, { recursive: true });
  }

  getWorkspacePath(agentId: BrigadeId): string {
    return path.join(this.workspacesRoot, agentId);
  }

  createWorkspace(agentId: BrigadeId, role: AgentRole = AgentRole.Assistant): string {
    const wsPath = this.getWorkspacePath(agentId);
    fs.mkdirSync(wsPath, { recursive: true });
    fs.mkdirSync(path.join(wsPath, 'memory'), { recursive: true });

    // Create default workspace files if they don't exist
    this.ensureFile(path.join(wsPath, 'SOUL.md'), DEFAULT_SOUL[role]);
    this.ensureFile(path.join(wsPath, 'AGENTS.md'), `# Agent Rules\n\n- Always be helpful and accurate.\n- Ask clarifying questions when the task is ambiguous.\n- Report progress on long-running tasks.\n`);
    this.ensureFile(path.join(wsPath, 'MEMORY.md'), `# Long-Term Memory\n\n_Nothing stored yet._\n`);
    this.ensureFile(path.join(wsPath, 'HEARTBEAT.md'), DEFAULT_HEARTBEAT);
    this.ensureFile(path.join(wsPath, 'USER.md'), `# User\n\n_No user profile configured._\n`);

    return wsPath;
  }

  readFile(agentId: BrigadeId, filename: string): string | null {
    const fp = path.join(this.getWorkspacePath(agentId), filename);
    if (!fs.existsSync(fp)) return null;
    return fs.readFileSync(fp, 'utf-8');
  }

  writeFile(agentId: BrigadeId, filename: string, content: string): void {
    const wsPath = this.getWorkspacePath(agentId);
    fs.mkdirSync(wsPath, { recursive: true });
    fs.writeFileSync(path.join(wsPath, filename), content, 'utf-8');
  }

  appendFile(agentId: BrigadeId, filename: string, content: string): void {
    const fp = path.join(this.getWorkspacePath(agentId), filename);
    fs.appendFileSync(fp, content, 'utf-8');
  }

  listWorkspaces(): string[] {
    if (!fs.existsSync(this.workspacesRoot)) return [];
    return fs.readdirSync(this.workspacesRoot).filter((d) => {
      return fs.statSync(path.join(this.workspacesRoot, d)).isDirectory();
    });
  }

  private ensureFile(fp: string, defaultContent: string): void {
    if (!fs.existsSync(fp)) {
      fs.writeFileSync(fp, defaultContent, 'utf-8');
    }
  }
}
