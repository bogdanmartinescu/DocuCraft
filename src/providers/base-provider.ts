/**
 * Abstract base class for all AI model providers.
 * All providers normalise to ChatRequest / ChatResponse.
 */

import {
  ChatRequest,
  ChatResponse,
  ChatChunk,
  ModelInfo,
  ProviderType,
} from '../core/types/provider';

export abstract class BaseProvider {
  abstract readonly type: ProviderType;
  abstract readonly defaultModel: string;

  /** Send a chat request and return the full response. */
  abstract chat(request: ChatRequest): Promise<ChatResponse>;

  /** Stream a chat response chunk by chunk. */
  abstract stream(request: ChatRequest): AsyncIterable<ChatChunk>;

  /** List available models for this provider. */
  abstract listModels(): Promise<ModelInfo[]>;

  /** Check connectivity / auth. Returns true if healthy. */
  async healthCheck(): Promise<boolean> {
    try {
      const models = await this.listModels();
      return models.length > 0;
    } catch {
      return false;
    }
  }

  /** Resolve model: use request model, or fall back to provider default. */
  protected resolveModel(request: ChatRequest): string {
    return request.model ?? this.defaultModel;
  }
}
