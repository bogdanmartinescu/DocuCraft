import { BaseAgent } from '../base-agent';
import { AgentRole } from '../../core/types/agent';

export class SalesAgent extends BaseAgent {
  readonly role = AgentRole.Sales;
  readonly defaultSkills = ['web-search', 'web-scrape', 'file-write', 'api-call', 'summarize'];
  readonly defaultModel = 'claude-sonnet-4-6';

  protected getRoleInstructions(): string {
    return `You drive revenue through relationship-building and consultative selling.
When given a sales task:
1. Research the prospect/company thoroughly
2. Identify pain points and how our solution helps
3. Craft personalized, human outreach — not generic pitches
4. Create proposals that speak to specific needs
5. Follow up professionally and persistently
6. Update CRM or notes with all interactions`;
  }
}
