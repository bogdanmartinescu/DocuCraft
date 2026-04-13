import { z } from 'zod';
import { BaseSkill } from '../base-skill';
import { SkillContext, SkillDef, SkillExecutionResult } from '../../core/types/skill';

const inputSchema = z.object({
  url: z.string().url(),
  extractionGoal: z.string().optional().describe('What specific information to extract'),
  maxLength: z.number().int().positive().optional().default(5000),
});
type Input = z.infer<typeof inputSchema>;
interface ScrapeResult { url: string; title: string; content: string; extractedData?: string; }

export class WebScrapeSkill extends BaseSkill<Input, ScrapeResult> {
  protected inputSchema = inputSchema;

  readonly metadata: SkillDef = {
    name: 'web-scrape',
    displayName: 'Web Scrape',
    description: 'Fetch and extract content from a URL. Can optionally extract specific information.',
    version: '1.0.0',
    tags: ['research', 'web', 'scraping'],
    riskLevel: 'low',
    timeout: 20_000,
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to scrape' },
        extractionGoal: { type: 'string', description: 'What to extract from the page' },
        maxLength: { type: 'number', description: 'Max content length in chars', default: 5000 },
      },
      required: ['url'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string' },
        title: { type: 'string' },
        content: { type: 'string' },
        extractedData: { type: 'string' },
      },
    },
  };

  async execute(input: Input, context: SkillContext): Promise<SkillExecutionResult<ScrapeResult>> {
    try {
      const res = await fetch(input.url, {
        headers: { 'User-Agent': 'Brigade/1.0 (research bot)' },
        signal: AbortSignal.timeout(15_000),
      });

      if (!res.ok) {
        return { success: false, error: `HTTP ${res.status}`, durationMs: 0 };
      }

      const html = await res.text();

      // Simple HTML-to-text extraction (strip tags)
      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, input.maxLength);

      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch?.[1]?.trim() ?? input.url;

      let extractedData: string | undefined;
      if (input.extractionGoal) {
        const response = await context.provider.chat({
          systemPrompt: 'You are a precise data extraction assistant.',
          messages: [{
            role: 'user',
            content: `From this web page content, extract: ${input.extractionGoal}\n\nContent:\n${text}`,
          }],
          maxTokens: 1024,
          temperature: 0.1,
        });
        extractedData = response.content;
      }

      return { success: true, output: { url: input.url, title, content: text, extractedData }, durationMs: 0 };
    } catch (e) {
      return { success: false, error: (e as Error).message, durationMs: 0 };
    }
  }
}
