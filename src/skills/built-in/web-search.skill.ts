import { z } from 'zod';
import { BaseSkill } from '../base-skill';
import { SkillContext, SkillDef, SkillExecutionResult } from '../../core/types/skill';

const inputSchema = z.object({
  query: z.string().min(1).describe('The search query'),
  maxResults: z.number().int().min(1).max(20).optional().default(5),
});

type Input = z.infer<typeof inputSchema>;

interface SearchResult { title: string; url: string; snippet: string; }

export class WebSearchSkill extends BaseSkill<Input, SearchResult[]> {
  protected inputSchema = inputSchema;

  readonly metadata: SkillDef = {
    name: 'web-search',
    displayName: 'Web Search',
    description: 'Search the web for information on a given query. Returns titles, URLs, and snippets.',
    version: '1.0.0',
    tags: ['research', 'web', 'search'],
    riskLevel: 'low',
    timeout: 15_000,
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The search query' },
        maxResults: { type: 'number', description: 'Max number of results (1-20)', default: 5 },
      },
      required: ['query'],
    },
    outputSchema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          url: { type: 'string' },
          snippet: { type: 'string' },
        },
      },
    },
  };

  async execute(input: Input, context: SkillContext): Promise<SkillExecutionResult<SearchResult[]>> {
    const apiKey = context.config['apiKey'] as string | undefined
      ?? process.env['SEARCH_API_KEY'];

    if (!apiKey) {
      // Fallback: use LLM to simulate search (useful for dev/testing)
      const response = await context.provider.chat({
        systemPrompt: 'You are a web search assistant. Provide realistic search results.',
        messages: [{
          role: 'user',
          content: `Simulate ${input.maxResults} web search results for: "${input.query}". Return JSON array with fields: title, url, snippet.`,
        }],
        maxTokens: 1024,
        jsonMode: true,
      });

      try {
        const results = JSON.parse(response.content) as SearchResult[];
        return { success: true, output: results, durationMs: 0, tokensUsed: response.usage.totalTokens };
      } catch {
        return { success: false, error: 'Failed to parse search results', durationMs: 0 };
      }
    }

    // Real search via Brave API (if key provided)
    try {
      const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(input.query)}&count=${input.maxResults}`;
      const res = await fetch(url, { headers: { 'X-Subscription-Token': apiKey, Accept: 'application/json' } });
      if (!res.ok) throw new Error(`Search API returned ${res.status}`);
      const data = await res.json() as { web?: { results?: Array<{ title: string; url: string; description: string }> } };
      const results: SearchResult[] = (data.web?.results ?? []).map((r) => ({
        title: r.title,
        url: r.url,
        snippet: r.description,
      }));
      return { success: true, output: results, durationMs: 0 };
    } catch (e) {
      return { success: false, error: (e as Error).message, durationMs: 0 };
    }
  }
}
