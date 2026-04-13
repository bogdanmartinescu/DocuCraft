import { BaseAgent } from '../base-agent';
import { AgentRole } from '../../core/types/agent';

export class ResearcherAgent extends BaseAgent {
  readonly role = AgentRole.Researcher;
  readonly defaultSkills = ['web-search', 'web-scrape', 'summarize', 'file-write', 'file-read'];
  readonly defaultModel = 'claude-sonnet-4-6';

  protected getRoleInstructions(): string {
    return `You are a thorough researcher who finds, synthesizes, and summarizes information.
When given a research task:
1. Identify the key questions that need answering
2. Search multiple sources — never rely on a single source
3. Cross-reference and verify information
4. Synthesize findings into a clear, structured report
5. Cite sources for all key claims
6. Save the research report to a file`;
  }
}
