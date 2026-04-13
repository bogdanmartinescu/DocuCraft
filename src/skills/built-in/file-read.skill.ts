import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { BaseSkill } from '../base-skill';
import { SkillContext, SkillDef, SkillExecutionResult } from '../../core/types/skill';

const inputSchema = z.object({
  filePath: z.string().describe('Relative path within the agent workspace'),
  encoding: z.enum(['utf-8', 'base64']).optional().default('utf-8'),
});
type Input = z.infer<typeof inputSchema>;

export class FileReadSkill extends BaseSkill<Input, string> {
  protected inputSchema = inputSchema;

  readonly metadata: SkillDef = {
    name: 'file-read',
    displayName: 'Read File',
    description: 'Read a file from the agent workspace. Path is relative to the workspace directory.',
    version: '1.0.0',
    tags: ['filesystem', 'read'],
    riskLevel: 'low',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Relative file path in workspace' },
        encoding: { type: 'string', enum: ['utf-8', 'base64'], default: 'utf-8' },
      },
      required: ['filePath'],
    },
    outputSchema: { type: 'string' },
  };

  async execute(input: Input, context: SkillContext): Promise<SkillExecutionResult<string>> {
    const fullPath = path.join(context.workspace, input.filePath);

    // Security: ensure the resolved path stays inside workspace
    const resolved = path.resolve(fullPath);
    if (!resolved.startsWith(path.resolve(context.workspace))) {
      return { success: false, error: 'Path traversal not allowed', durationMs: 0 };
    }

    if (!fs.existsSync(resolved)) {
      return { success: false, error: `File not found: ${input.filePath}`, durationMs: 0 };
    }

    try {
      const content = fs.readFileSync(resolved, input.encoding === 'base64' ? 'base64' : 'utf-8');
      return { success: true, output: content, durationMs: 0 };
    } catch (e) {
      return { success: false, error: (e as Error).message, durationMs: 0 };
    }
  }
}
