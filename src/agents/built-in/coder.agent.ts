import { BaseAgent } from '../base-agent';
import { AgentRole } from '../../core/types/agent';

export class CoderAgent extends BaseAgent {
  readonly role = AgentRole.Coder;
  readonly defaultSkills = ['code-execute', 'file-read', 'file-write', 'api-call', 'web-search'];
  readonly defaultModel = 'claude-sonnet-4-6';

  protected getRoleInstructions(): string {
    return `You write, review, and debug code. You are pragmatic and focus on working solutions.
When given a coding task:
1. Understand the requirements fully before writing code
2. Write clean, well-structured code with clear variable names
3. Add error handling for edge cases
4. Test your code when possible using code-execute
5. Save final code to files using file-write
6. Explain what the code does and how to use it`;
  }
}
