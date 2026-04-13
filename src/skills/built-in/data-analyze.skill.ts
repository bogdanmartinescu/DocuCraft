import { z } from 'zod';
import { BaseSkill } from '../base-skill';
import { SkillContext, SkillDef, SkillExecutionResult } from '../../core/types/skill';

const inputSchema = z.object({
  data: z.string().describe('Data to analyze — CSV, JSON, or plain text'),
  question: z.string().describe('What to analyze or answer about the data'),
  outputFormat: z.enum(['text', 'json', 'markdown-table']).optional().default('text'),
});
type Input = z.infer<typeof inputSchema>;
interface AnalysisResult { answer: string; insights: string[]; recommendation?: string; }

export class DataAnalyzeSkill extends BaseSkill<Input, AnalysisResult> {
  protected inputSchema = inputSchema;

  readonly metadata: SkillDef = {
    name: 'data-analyze',
    displayName: 'Analyze Data',
    description: 'Perform data analysis and answer questions about datasets. Supports CSV, JSON, and plain text.',
    version: '1.0.0',
    tags: ['analysis', 'data', 'insights'],
    riskLevel: 'low',
    inputSchema: {
      type: 'object',
      properties: {
        data: { type: 'string', description: 'The data to analyze (CSV, JSON, or plain text)' },
        question: { type: 'string', description: 'What to analyze or what question to answer' },
        outputFormat: { type: 'string', enum: ['text', 'json', 'markdown-table'], default: 'text' },
      },
      required: ['data', 'question'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        answer: { type: 'string' },
        insights: { type: 'array', items: { type: 'string' } },
        recommendation: { type: 'string' },
      },
    },
  };

  async execute(input: Input, context: SkillContext): Promise<SkillExecutionResult<AnalysisResult>> {
    const response = await context.provider.chat({
      systemPrompt: 'You are a data analyst. Analyze the provided data and answer the question concisely. Return valid JSON.',
      messages: [{
        role: 'user',
        content: `Data:\n${input.data}\n\nQuestion: ${input.question}\n\nReturn JSON with: { "answer": "...", "insights": ["...", "..."], "recommendation": "..." }`,
      }],
      maxTokens: 2048,
      temperature: 0.2,
      jsonMode: true,
    });

    try {
      const result = JSON.parse(response.content) as AnalysisResult;
      return { success: true, output: result, durationMs: 0, tokensUsed: response.usage.totalTokens };
    } catch {
      return {
        success: true,
        output: { answer: response.content, insights: [], recommendation: undefined },
        durationMs: 0,
        tokensUsed: response.usage.totalTokens,
      };
    }
  }
}
