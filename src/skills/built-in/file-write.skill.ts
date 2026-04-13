import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { BaseSkill } from '../base-skill';
import { SkillContext, SkillDef, SkillExecutionResult } from '../../core/types/skill';

const inputSchema = z.object({
  filePath: z.string().describe('Relative path within the agent workspace'),
  content: z.string().describe('Content to write'),
  mode: z.enum(['write', 'append']).optional().default('write'),
});
type Input = z.infer<typeof inputSchema>;

export class FileWriteSkill extends BaseSkill<Input, { path: string; bytes: number }> {
  protected inputSchema = inputSchema;

  readonly metadata: SkillDef = {
    name: 'file-write',
    displayName: 'Write File',
    description: 'Write or append content to a file in the agent workspace.',
    version: '1.0.0',
    tags: ['filesystem', 'write'],
    riskLevel: 'medium',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Relative file path in workspace' },
        content: { type: 'string', description: 'Content to write' },
        mode: { type: 'string', enum: ['write', 'append'], default: 'write' },
      },
      required: ['filePath', 'content'],
    },
    outputSchema: {
      type: 'object',
      properties: { path: { type: 'string' }, bytes: { type: 'number' } },
    },
  };

  async execute(input: Input, context: SkillContext): Promise<SkillExecutionResult<{ path: string; bytes: number }>> {
    const fullPath = path.join(context.workspace, input.filePath);
    const resolved = path.resolve(fullPath);

    if (!resolved.startsWith(path.resolve(context.workspace))) {
      return { success: false, error: 'Path traversal not allowed', durationMs: 0 };
    }

    try {
      fs.mkdirSync(path.dirname(resolved), { recursive: true });
      if (input.mode === 'append') {
        fs.appendFileSync(resolved, input.content, 'utf-8');
      } else {
        fs.writeFileSync(resolved, input.content, 'utf-8');
      }
      return { success: true, output: { path: input.filePath, bytes: input.content.length }, durationMs: 0 };
    } catch (e) {
      return { success: false, error: (e as Error).message, durationMs: 0 };
    }
  }
}
