/**
 * OpenAI provider — GPT-4o, GPT-4-mini, etc.
 */

import OpenAI from 'openai';
import { BaseProvider } from '../base-provider';
import {
  ChatRequest,
  ChatResponse,
  ChatChunk,
  ChatMessage,
  ModelInfo,
  ProviderType,
  ToolCall,
  OpenAIConfig,
} from '../../core/types/provider';
import { ProviderError } from '../../core/errors';

export class OpenAIProvider extends BaseProvider {
  readonly type = ProviderType.OpenAI;
  readonly defaultModel: string;
  private client: OpenAI;

  constructor(config: OpenAIConfig) {
    super();
    this.defaultModel = config.defaultModel;
    this.client = new OpenAI({
      apiKey: config.apiKey,
      organization: config.organization,
      baseURL: config.baseUrl,
    });
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const start = Date.now();
    const model = this.resolveModel(request);

    try {
      const messages = this.toOpenAIMessages(request);
      const tools = request.tools?.map((t) => ({
        type: 'function' as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: t.input_schema,
        },
      }));

      const response = await this.client.chat.completions.create({
        model,
        messages,
        max_tokens: request.maxTokens,
        temperature: request.temperature,
        tools: tools?.length ? tools : undefined,
        response_format: request.jsonMode ? { type: 'json_object' } : undefined,
      });

      const choice = response.choices[0];
      if (!choice) throw new ProviderError('OpenAI returned no choices');

      const content = choice.message.content ?? '';
      const toolCalls: ToolCall[] = (choice.message.tool_calls ?? []).map((tc) => ({
        id: tc.id,
        name: tc.function.name,
        input: JSON.parse(tc.function.arguments) as Record<string, unknown>,
      }));

      return {
        id: response.id,
        content,
        toolCalls: toolCalls.length ? toolCalls : undefined,
        usage: {
          inputTokens: response.usage?.prompt_tokens ?? 0,
          outputTokens: response.usage?.completion_tokens ?? 0,
          totalTokens: response.usage?.total_tokens ?? 0,
        },
        model,
        provider: ProviderType.OpenAI,
        stopReason: this.mapFinishReason(choice.finish_reason),
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      throw new ProviderError(`OpenAI chat failed: ${(error as Error).message}`, error);
    }
  }

  async *stream(request: ChatRequest): AsyncIterable<ChatChunk> {
    const model = this.resolveModel(request);

    try {
      const stream = await this.client.chat.completions.create({
        model,
        messages: this.toOpenAIMessages(request),
        max_tokens: request.maxTokens,
        temperature: request.temperature,
        stream: true,
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content ?? '';
        const finished = chunk.choices[0]?.finish_reason != null;
        yield { delta, finished };
      }
    } catch (error) {
      throw new ProviderError(`OpenAI stream failed: ${(error as Error).message}`, error);
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    return [
      {
        id: 'gpt-4o',
        provider: ProviderType.OpenAI,
        displayName: 'GPT-4o',
        maxContextWindow: 128_000,
        maxOutputTokens: 16_384,
        capabilities: ['tool-use', 'vision', 'streaming', 'json-mode'],
        costPer1kInputTokens: 0.005,
        costPer1kOutputTokens: 0.015,
      },
      {
        id: 'gpt-4o-mini',
        provider: ProviderType.OpenAI,
        displayName: 'GPT-4o Mini',
        maxContextWindow: 128_000,
        maxOutputTokens: 16_384,
        capabilities: ['tool-use', 'streaming', 'json-mode'],
        costPer1kInputTokens: 0.00015,
        costPer1kOutputTokens: 0.0006,
      },
    ];
  }

  private toOpenAIMessages(request: ChatRequest): OpenAI.Chat.ChatCompletionMessageParam[] {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }

    for (const msg of request.messages) {
      if (msg.role === 'system') {
        messages.push({ role: 'system', content: typeof msg.content === 'string' ? msg.content : '' });
      } else if (msg.role === 'user') {
        messages.push({ role: 'user', content: typeof msg.content === 'string' ? msg.content : '' });
      } else if (msg.role === 'assistant') {
        if (msg.toolCalls?.length) {
          messages.push({
            role: 'assistant',
            content: typeof msg.content === 'string' ? msg.content : null,
            tool_calls: msg.toolCalls.map((tc) => ({
              id: tc.id,
              type: 'function' as const,
              function: { name: tc.name, arguments: JSON.stringify(tc.input) },
            })),
          });
        } else {
          messages.push({ role: 'assistant', content: typeof msg.content === 'string' ? msg.content : '' });
        }
      } else if (msg.role === 'tool') {
        messages.push({
          role: 'tool',
          tool_call_id: msg.toolCallId ?? '',
          content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
        });
      }
    }

    return messages;
  }

  private mapFinishReason(reason: string | null): ChatResponse['stopReason'] {
    switch (reason) {
      case 'stop': return 'end_turn';
      case 'tool_calls': return 'tool_use';
      case 'length': return 'max_tokens';
      default: return 'end_turn';
    }
  }
}
