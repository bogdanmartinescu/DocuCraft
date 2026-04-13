/**
 * Provider registry — registers and resolves AI model providers.
 */

import { BaseProvider } from './base-provider';
import { ProviderType, RoutingRequest, ProvidersConfig } from '../core/types/provider';
import { AnthropicProvider } from './anthropic/anthropic-provider';
import { OpenAIProvider } from './openai/openai-provider';
import { OllamaProvider } from './ollama/ollama-provider';
import { ProviderError } from '../core/errors';

export class ProviderRegistry {
  private providers = new Map<ProviderType, BaseProvider>();
  private defaultType: ProviderType = ProviderType.Anthropic;

  register(provider: BaseProvider): void {
    this.providers.set(provider.type, provider);
  }

  setDefault(type: ProviderType): void {
    if (!this.providers.has(type)) {
      throw new ProviderError(`Cannot set default to unregistered provider: ${type}`);
    }
    this.defaultType = type;
  }

  get(type: ProviderType): BaseProvider {
    const provider = this.providers.get(type);
    if (!provider) {
      throw new ProviderError(`Provider not registered: ${type}`);
    }
    return provider;
  }

  getDefault(): BaseProvider {
    return this.get(this.defaultType);
  }

  resolve(request: RoutingRequest): BaseProvider {
    if (request.preferredProvider && this.providers.has(request.preferredProvider)) {
      return this.get(request.preferredProvider);
    }
    return this.getDefault();
  }

  listRegistered(): ProviderType[] {
    return [...this.providers.keys()];
  }

  async healthCheck(): Promise<Record<ProviderType, boolean>> {
    const results: Partial<Record<ProviderType, boolean>> = {};
    for (const [type, provider] of this.providers) {
      results[type] = await provider.healthCheck();
    }
    return results as Record<ProviderType, boolean>;
  }

  /** Factory: create and register all providers from config. */
  static fromConfig(config: ProvidersConfig): ProviderRegistry {
    const registry = new ProviderRegistry();

    if (config.anthropic) {
      registry.register(new AnthropicProvider(config.anthropic));
    }
    if (config.openai) {
      registry.register(new OpenAIProvider(config.openai));
    }
    if (config.ollama) {
      registry.register(new OllamaProvider(config.ollama));
    }

    registry.setDefault(config.default);
    return registry;
  }
}
