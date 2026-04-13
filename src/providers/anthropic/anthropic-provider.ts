/**
 * Anthropic Claude provider — the default Brigade provider.
 */

import Anthropic from '@anthropic-ai/sdk';
import { BaseProvider } from '../base-provider';
import {
  ChatRequest,
  ChatResponse,
  ChatChunk,
  ChatMessage,
  ModelInfo,
  ProviderType,
  ToolCall,
  AnthropicConfig,
} from '../../core/types/provider';
import { ProviderError } from '../../core/errors';

export class AnthropicProvider extends BaseProvider {
  readonly type = ProviderType.Anthropic;
  readonly defaultModel: string;
  private client: Anthropic;

  constructor(config: AnthropicConfig) {
    super();
    this.defaultModel = config.defaultModel;
    this.client = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const start = Date.now();
    const model = this.resolveModel(request);

    try {
      const messages = this.toAnthropicMessages(request.messages);
      const tools = request.tools?.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.input_schema as Anthropic.Tool['input_schema'],
      }));

      const response = await this.client.messages.create({
        model,
        max_tokens: request.maxTokens ?? 4096,
        temperature: request.temperature,
        system: request.systemPrompt,
        messages,
        tools: tools?.length ? tools : undefined,
      });

      const content = response.content
        .filter((b) => b.type === 'text')
        .map((b) => (b as Anthropic.TextBlock).text)
        .join('');

      const toolCalls: ToolCall[] = response.content
        .filter((b) => b.type === 'tool_use')
        .map((b) => {
          const block = b as Anthropic.ToolUseBlock;
          return {
            id: block.id,
            name: block.name,
            input: block.input as Record<string, unknown>,
          };
        });

      return {
        id: response.id,
        content,
        toolCalls: toolCalls.length ? toolCalls : undefined,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        },
        model,
        provider: ProviderType.Anthropic,
        stopReason: this.mapStopReason(response.stop_reason),
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      throw new ProviderError(`Anthropic chat failed: ${(error as Error).message}`, error);
    }
  }

  async *stream(request: ChatRequest): AsyncIterable<ChatChunk> {
    const model = this.resolveModel(request);

    try {
      const stream = await this.client.messages.stream({
        model,
        max_tokens: request.maxTokens ?? 4096,
        temperature: request.temperature,
        system: request.systemPrompt,
        messages: this.toAnthropicMessages(request.messages),
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          yield { delta: event.delta.text, finished: false };
        }
      }

      yield { delta: '', finished: true };
    } catch (error) {
      throw new ProviderError(`Anthropic stream failed: ${(error as Error).message}`, error);
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    return [
      {
        id: 'claude-opus-4-6',
        provider: ProviderType.Anthropic,
        displayName: 'Claude Opus 4.6',
        maxContextWindow: 200_000,
        maxOutputTokens: 32_000,
        capabilities: ['tool-use', 'vision', 'streaming', 'long-context'],
        costPer1kInputTokens: 0.015,
        costPer1kOutputTokens: 0.075,
      },
      {
        id: 'claude-sonnet-4-6',
        provider: ProviderType.Anthropic,
        displayName: 'Claude Sonnet 4.6',
        maxContextWindow: 200_000,
        maxOutputTokens: 16_000,
        capabilities: ['tool-use', 'vision', 'streaming', 'long-context'],
        costPer1kInputTokens: 0.003,
        costPer1kOutputTokens: 0.015,
      },
      {
        id: 'claude-haiku-4-5-20251001',
        provider: ProviderType.Anthropic,
        displayName: 'Claude Haiku 4.5',
        maxContextWindow: 200_000,
        maxOutputTokens: 8_000,
        capabilities: ['tool-use', 'streaming'],
        costPer1kInputTokens: 0.0008,
        costPer1kOutputTokens: 0.004,
      },
    ];
  }

  private toAnthropicMessages(messages: ChatMessage[]): Anthropic.MessageParam[] {
    const result: Anthropic.MessageParam[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') continue; // system handled separately

      if (msg.role === 'tool') {
        result.push({
          role: 'user',
          content: [{
            type: 'tool_result',
            tool_use_id: msg.toolCallId ?? '',
            content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
          }],
        });
      } else if (msg.role === 'assistant' && msg.toolCalls?.length) {
        const content: Anthropic.ContentBlock[] = [];
        if (typeof msg.content === 'string' && msg.content) {
          content.push({ type: 'text', text: msg.content });
        }
        for (const tc of msg.toolCalls) {
          content.push({ type: 'tool_use', id: tc.id, name: tc.name, input: tc.input });
        }
        result.push({ role: 'assistant', content });
      } else {
        result.push({
          role: msg.role as 'user' | 'assistant',
          content: typeof msg.content === 'string'
            ? msg.content
            : msg.content.map((b) =>
                b.type === 'text'
                  ? { type: 'text' as const, text: b.text }
                  : { type: 'image' as const, source: { type: 'base64' as const, media_type: 'image/jpeg' as const, data: b.base64 ?? '' } }
              ),
        });
      }
    }

    return result;
  }

  private mapStopReason(
    reason: string | null,
  ): ChatResponse['stopReason'] {
    switch (reason) {
      case 'end_turn': return 'end_turn';
      case 'tool_use': return 'tool_use';
      case 'max_tokens': return 'max_tokens';
      default: return 'end_turn';
    }
  }
}
