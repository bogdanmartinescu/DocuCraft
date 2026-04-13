import { z } from 'zod';
import { BaseSkill } from '../base-skill';
import { SkillContext, SkillDef, SkillExecutionResult } from '../../core/types/skill';

const inputSchema = z.object({
  text: z.string().min(1),
  maxWords: z.number().int().positive().optional().default(200),
  style: z.enum(['bullet-points', 'paragraph', 'tldr']).optional().default('paragraph'),
  focusOn: z.string().optional(),
});
type Input = z.infer<typeof inputSchema>;

export class SummarizeSkill extends BaseSkill<Input, string> {
  protected inputSchema = inputSchema;

  readonly metadata: SkillDef = {
    name: 'summarize',
    displayName: 'Summarize Text',
    description: 'Summarize long text or documents into a concise format.',
    version: '1.0.0',
    tags: ['text', 'analysis', 'summarization'],
    riskLevel: 'low',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to summarize' },
        maxWords: { type: 'number', description: 'Maximum words in summary', default: 200 },
        style: { type: 'string', enum: ['bullet-points', 'paragraph', 'tldr'], default: 'paragraph' },
        focusOn: { type: 'string', description: 'Specific aspect to focus on' },
      },
      required: ['text'],
    },
    outputSchema: { type: 'string' },
  };

  async execute(input: Input, context: SkillContext): Promise<SkillExecutionResult<string>> {
    const focus = input.focusOn ? ` Focus specifically on: ${input.focusOn}.` : '';
    const styleInstr = {
      'bullet-points': 'Use bullet points.',
      'paragraph': 'Write in flowing paragraphs.',
      'tldr': 'Write a single TLDR sentence followed by 3 key points.',
    }[input.style];

    const response = await context.provider.chat({
      systemPrompt: 'You are a precise summarization assistant.',
      messages: [{
        role: 'user',
        content: `Summarize the following text in at most ${input.maxWords} words. ${styleInstr}${focus}\n\n---\n${input.text}`,
      }],
      maxTokens: Math.min(input.maxWords * 6, 2048),
      temperature: 0.3,
    });

    return {
      success: true,
      output: response.content,
      durationMs: 0,
      tokensUsed: response.usage.totalTokens,
    };
  }
}
