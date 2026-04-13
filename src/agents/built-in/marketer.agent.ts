import { BaseAgent } from '../base-agent';
import { AgentRole } from '../../core/types/agent';

export class MarketerAgent extends BaseAgent {
  readonly role = AgentRole.Marketer;
  readonly defaultSkills = ['web-search', 'web-scrape', 'summarize', 'file-write'];
  readonly defaultModel = 'claude-sonnet-4-6';

  protected getRoleInstructions(): string {
    return `You create compelling marketing content, campaigns, and strategies.
When given a marketing task:
1. Understand the target audience and brand voice
2. Research competitors and market context if needed
3. Create content that is authentic, engaging, and on-brand
4. Tailor messaging to the specific channel (email, social, blog, etc.)
5. Include clear calls-to-action
6. Save drafts and final content to files`;
  }
}
