/**
 * AI Provider types — model-agnostic LLM abstraction layer.
 */

export enum ProviderType {
  Anthropic = 'anthropic',
  OpenAI = 'openai',
  Ollama = 'ollama',
}

export type ModelCapability =
  | 'tool-use'
  | 'vision'
  | 'long-context'
  | 'streaming'
  | 'json-mode'
  | 'embeddings';

export interface ModelInfo {
  id: string;
  provider: ProviderType;
  displayName: string;
  maxContextWindow: number;
  maxOutputTokens: number;
  capabilities: ModelCapability[];
  costPer1kInputTokens?: number;   // USD
  costPer1kOutputTokens?: number;  // USD
}

// ─── Normalized Chat API ──────────────────────────────────────────────────────

export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface TextContent {
  type: 'text';
  text: string;
}

export interface ImageContent {
  type: 'image';
  url?: string;
  base64?: string;
  mimeType?: string;
}

export type ContentBlock = TextContent | ImageContent;

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ChatMessage {
  role: MessageRole;
  content: string | ContentBlock[];
  toolCallId?: string;   // When role is 'tool'
  toolCalls?: ToolCall[]; // When role is 'assistant' with tool calls
}

export interface ToolDef {
  name: string;
  description: string;
  input_schema: Record<string, unknown>; // JSON Schema
}

export interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  tools?: ToolDef[];
  systemPrompt?: string;
  stream?: boolean;
  jsonMode?: boolean;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface ChatResponse {
  id: string;
  content: string;
  toolCalls?: ToolCall[];
  usage: TokenUsage;
  model: string;
  provider: ProviderType;
  stopReason: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence';
  latencyMs: number;
}

export interface ChatChunk {
  delta: string;
  toolCallDelta?: Partial<ToolCall>;
  finished: boolean;
}

// ─── Provider Config ──────────────────────────────────────────────────────────

export interface AnthropicConfig {
  apiKey: string;
  defaultModel: string;
  baseUrl?: string;
}

export interface OpenAIConfig {
  apiKey: string;
  defaultModel: string;
  organization?: string;
  baseUrl?: string;
}

export interface OllamaConfig {
  baseUrl: string;
  defaultModel: string;
}

export interface ProvidersConfig {
  default: ProviderType;
  anthropic?: AnthropicConfig;
  openai?: OpenAIConfig;
  ollama?: OllamaConfig;
}

// ─── Routing ──────────────────────────────────────────────────────────────────

export interface RoutingRule {
  /** If the request needs this capability, use this provider/model */
  capability?: ModelCapability;
  /** If the task cost tier matches, use this provider/model */
  costTier?: 'low' | 'medium' | 'high';
  provider: ProviderType;
  model: string;
  priority?: number; // Lower = higher priority
}

export interface FallbackChain {
  providers: ProviderType[];
}

export interface RoutingConfig {
  rules: RoutingRule[];
  fallbackChain: ProviderType[];
}

export interface RoutingRequest {
  preferredProvider?: ProviderType;
  preferredModel?: string;
  requiredCapabilities?: ModelCapability[];
  costTier?: 'low' | 'medium' | 'high';
}
