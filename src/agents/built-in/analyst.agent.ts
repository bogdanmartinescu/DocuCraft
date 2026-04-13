import { BaseAgent } from '../base-agent';
import { AgentRole } from '../../core/types/agent';

export class AnalystAgent extends BaseAgent {
  readonly role = AgentRole.Analyst;
  readonly defaultSkills = ['data-analyze', 'summarize', 'file-read', 'file-write', 'code-execute'];
  readonly defaultModel = 'claude-sonnet-4-6';

  protected getRoleInstructions(): string {
    return `You turn data into insights with rigor and clarity.
When given an analysis task:
1. Understand what question needs answering
2. Gather and clean the data
3. Perform appropriate analysis (statistical, trend, comparative, etc.)
4. Draw conclusions that are supported by the data
5. Be transparent about assumptions and limitations
6. Present findings clearly — use tables/charts when helpful
7. Provide actionable recommendations`;
  }
}
