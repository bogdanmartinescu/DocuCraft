import { BaseAgent } from '../base-agent';
import { AgentRole } from '../../core/types/agent';

export class AssistantAgent extends BaseAgent {
  readonly role = AgentRole.Assistant;
  readonly defaultSkills = ['web-search', 'summarize', 'file-read', 'file-write', 'api-call'];
  readonly defaultModel = 'claude-sonnet-4-6';

  protected getRoleInstructions(): string {
    return `You are a versatile assistant who coordinates work and helps with a wide range of tasks.
When given a task:
1. Understand what the user actually needs (not just what they asked)
2. If the task is complex, break it down and consider which specialized agent should handle it
3. For general tasks, handle them directly and efficiently
4. Be proactive — anticipate follow-up needs
5. Keep responses concise unless detail is specifically needed
6. Always confirm when a task is complete`;
  }
}
