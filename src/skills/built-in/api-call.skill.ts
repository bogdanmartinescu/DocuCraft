import { z } from 'zod';
import { BaseSkill } from '../base-skill';
import { SkillContext, SkillDef, SkillExecutionResult } from '../../core/types/skill';

const inputSchema = z.object({
  url: z.string().url(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).optional().default('GET'),
  headers: z.record(z.string()).optional(),
  body: z.unknown().optional(),
  timeoutMs: z.number().positive().optional().default(15_000),
});
type Input = z.infer<typeof inputSchema>;
interface ApiResponse { status: number; headers: Record<string, string>; body: unknown; }

export class ApiCallSkill extends BaseSkill<Input, ApiResponse> {
  protected inputSchema = inputSchema;

  readonly metadata: SkillDef = {
    name: 'api-call',
    displayName: 'HTTP API Call',
    description: 'Make an HTTP request to an external API. Supports GET, POST, PUT, PATCH, DELETE.',
    version: '1.0.0',
    tags: ['integration', 'http', 'api'],
    riskLevel: 'medium',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'The full URL to call' },
        method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], default: 'GET' },
        headers: { type: 'object', additionalProperties: { type: 'string' } },
        body: { description: 'Request body (will be JSON-serialized)' },
        timeoutMs: { type: 'number', default: 15000 },
      },
      required: ['url'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        status: { type: 'number' },
        headers: { type: 'object' },
        body: {},
      },
    },
  };

  async execute(input: Input, _ctx: SkillContext): Promise<SkillExecutionResult<ApiResponse>> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), input.timeoutMs);

    try {
      const res = await fetch(input.url, {
        method: input.method,
        headers: { 'Content-Type': 'application/json', ...input.headers },
        body: input.body != null ? JSON.stringify(input.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timer);

      const responseHeaders: Record<string, string> = {};
      res.headers.forEach((v, k) => { responseHeaders[k] = v; });

      let body: unknown;
      const ct = res.headers.get('content-type') ?? '';
      if (ct.includes('application/json')) {
        body = await res.json();
      } else {
        body = await res.text();
      }

      return { success: res.ok, output: { status: res.status, headers: responseHeaders, body }, durationMs: 0 };
    } catch (e) {
      clearTimeout(timer);
      return { success: false, error: (e as Error).message, durationMs: 0 };
    }
  }
}
