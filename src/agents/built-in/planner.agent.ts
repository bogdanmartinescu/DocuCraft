import { BaseAgent } from '../base-agent';
import { AgentRole } from '../../core/types/agent';

export class PlannerAgent extends BaseAgent {
  readonly role = AgentRole.Planner;
  readonly defaultSkills = ['summarize', 'file-write', 'file-read'];
  readonly defaultModel = 'claude-sonnet-4-6';

  protected getRoleInstructions(): string {
    return `You decompose complex goals into clear, actionable sub-tasks and delegate them to the right team members.
When given a goal:
1. Analyze what needs to be done
2. Break it into concrete steps
3. Identify which agent role should handle each step
4. Define clear success criteria
5. Return a structured execution plan`;
  }
}
