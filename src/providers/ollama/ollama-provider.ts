/**
 * Ollama provider — local models via HTTP API.
 */

import { BaseProvider } from '../base-provider';
import {
  ChatRequest,
  ChatResponse,
  ChatChunk,
  ModelInfo,
  ProviderType,
  OllamaConfig,
} from '../../core/types/provider';
import { ProviderError } from '../../core/errors';

interface OllamaMessage {
  role: string;
  content: string;
}

interface OllamaChatResponse {
  model: string;
  message: { role: string; content: string };
  done: boolean;
  prompt_eval_count?: number;
  eval_count?: number;
}

export class OllamaProvider extends BaseProvider {
  readonly type = ProviderType.Ollama;
  readonly defaultModel: string;
  private baseUrl: string;

  constructor(config: OllamaConfig) {
    super();
    this.defaultModel = config.defaultModel;
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const start = Date.now();
    const model = this.resolveModel(request);

    const messages: OllamaMessage[] = [];
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    for (const msg of request.messages) {
      messages.push({
        role: msg.role,
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
      });
    }

    try {
      const res = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, stream: false }),
      });

      if (!res.ok) {
        throw new ProviderError(`Ollama returned ${res.status}: ${await res.text()}`);
      }

      const data = (await res.json()) as OllamaChatResponse;

      return {
        id: `ollama-${Date.now()}`,
        content: data.message.content,
        usage: {
          inputTokens: data.prompt_eval_count ?? 0,
          outputTokens: data.eval_count ?? 0,
          totalTokens: (data.prompt_eval_count ?? 0) + (data.eval_count ?? 0),
        },
        model,
        provider: ProviderType.Ollama,
        stopReason: 'end_turn',
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      throw new ProviderError(`Ollama chat failed: ${(error as Error).message}`, error);
    }
  }

  async *stream(request: ChatRequest): AsyncIterable<ChatChunk> {
    const model = this.resolveModel(request);
    const messages: OllamaMessage[] = [];
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    for (const msg of request.messages) {
      messages.push({ role: msg.role, content: typeof msg.content === 'string' ? msg.content : '' });
    }

    try {
      const res = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, stream: true }),
      });

      if (!res.ok || !res.body) {
        throw new ProviderError(`Ollama stream failed: ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        for (const line of text.split('\n').filter(Boolean)) {
          try {
            const chunk = JSON.parse(line) as OllamaChatResponse;
            yield { delta: chunk.message?.content ?? '', finished: chunk.done };
          } catch { /* skip malformed lines */ }
        }
      }
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      throw new ProviderError(`Ollama stream failed: ${(error as Error).message}`, error);
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`);
      if (!res.ok) return [];
      const data = (await res.json()) as { models: Array<{ name: string }> };
      return data.models.map((m) => ({
        id: m.name,
        provider: ProviderType.Ollama,
        displayName: m.name,
        maxContextWindow: 8_192,
        maxOutputTokens: 4_096,
        capabilities: ['streaming'],
      }));
    } catch {
      return [];
    }
  }
}
