/**
 * Channel types — messaging platform adapters.
 */

import { BrigadeId, Timestamp } from './common';

export enum ChannelType {
  HTTP      = 'http',
  CLI       = 'cli',
  Slack     = 'slack',
  Discord   = 'discord',
  Telegram  = 'telegram',
  WebSocket = 'websocket',
}

export interface Attachment {
  name: string;
  mimeType: string;
  url?: string;
  base64?: string;
  size?: number;
}

export interface InboundMessage {
  id: BrigadeId;
  channelType: ChannelType;
  channelId: string;           // Platform-specific channel/room ID
  senderId: string;            // Platform-specific user ID
  senderName: string;
  content: string;
  attachments?: Attachment[];
  threadId?: string;
  replyToId?: string;
  metadata: Record<string, unknown>;
  receivedAt: Timestamp;
}

export interface OutboundMessage {
  channelType: ChannelType;
  channelId: string;
  recipientId?: string;
  content: string;
  attachments?: Attachment[];
  threadId?: string;
  metadata?: Record<string, unknown>;
}

export interface RoutingRule {
  id: string;
  channelType?: ChannelType;
  channelId?: string;
  pattern?: string;            // Regex pattern to match message content
  agentId?: BrigadeId;
  teamId?: BrigadeId;
  agentRole?: string;
  priority: number;
}

// ─── Channel configs ──────────────────────────────────────────────────────────

export interface SlackChannelConfig {
  botToken: string;
  signingSecret: string;
  appToken?: string;           // For socket mode
}

export interface DiscordChannelConfig {
  botToken: string;
  guildId?: string;
}

export interface TelegramChannelConfig {
  botToken: string;
}

export interface WebSocketChannelConfig {
  port: number;
  path?: string;
}

export interface ChannelsConfig {
  http?: { enabled: boolean };
  cli?: { enabled: boolean };
  slack?: SlackChannelConfig & { enabled: boolean };
  discord?: DiscordChannelConfig & { enabled: boolean };
  telegram?: TelegramChannelConfig & { enabled: boolean };
  websocket?: WebSocketChannelConfig & { enabled: boolean };
}
