import { z } from 'zod';
import { execSync } from 'child_process';
import { BaseSkill } from '../base-skill';
import { SkillContext, SkillDef, SkillExecutionResult } from '../../core/types/skill';
import fs from 'fs';
import path from 'path';
import { generateId } from '../../core/utils/id';

const inputSchema = z.object({
  code: z.string().min(1),
  language: z.enum(['javascript', 'typescript', 'python', 'bash']),
  timeoutMs: z.number().positive().optional().default(30_000),
});
type Input = z.infer<typeof inputSchema>;
interface ExecResult { stdout: string; stderr: string; exitCode: number; }

export class CodeExecuteSkill extends BaseSkill<Input, ExecResult> {
  protected inputSchema = inputSchema;

  readonly metadata: SkillDef = {
    name: 'code-execute',
    displayName: 'Execute Code',
    description: 'Execute code in a sandboxed environment. Supports JavaScript, TypeScript, Python, and Bash.',
    version: '1.0.0',
    tags: ['code', 'execution', 'development'],
    riskLevel: 'high',
    timeout: 60_000,
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Code to execute' },
        language: { type: 'string', enum: ['javascript', 'typescript', 'python', 'bash'] },
        timeoutMs: { type: 'number', description: 'Execution timeout in ms', default: 30000 },
      },
      required: ['code', 'language'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        stdout: { type: 'string' },
        stderr: { type: 'string' },
        exitCode: { type: 'number' },
      },
    },
  };

  async execute(input: Input, context: SkillContext): Promise<SkillExecutionResult<ExecResult>> {
    const tmpDir = path.join(context.workspace, '.tmp');
    fs.mkdirSync(tmpDir, { recursive: true });

    const ext = { javascript: 'js', typescript: 'ts', python: 'py', bash: 'sh' }[input.language];
    const tmpFile = path.join(tmpDir, `exec_${generateId()}.${ext}`);

    try {
      fs.writeFileSync(tmpFile, input.code, 'utf-8');

      const cmd = {
        javascript: `node ${tmpFile}`,
        typescript: `ts-node ${tmpFile}`,
        python: `python3 ${tmpFile}`,
        bash: `bash ${tmpFile}`,
      }[input.language];

      let stdout = '';
      let stderr = '';
      let exitCode = 0;

      try {
        stdout = execSync(cmd, {
          timeout: input.timeoutMs,
          cwd: context.workspace,
          encoding: 'utf-8',
          maxBuffer: 1024 * 1024, // 1MB
        });
      } catch (e: unknown) {
        const err = e as { stdout?: string; stderr?: string; status?: number };
        stdout = err.stdout ?? '';
        stderr = err.stderr ?? (e as Error).message;
        exitCode = err.status ?? 1;
      }

      return { success: exitCode === 0, output: { stdout, stderr, exitCode }, durationMs: 0 };
    } finally {
      try { fs.unlinkSync(tmpFile); } catch { /* best-effort cleanup */ }
    }
  }
}
