/**
 * Configuration loader — merges brigade.config.ts + .env + defaults.
 */

import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { BrigadeConfig } from '../types/config';
import { brigadeConfigSchema, ValidatedConfig } from './schema';
import { ConfigError } from '../errors';

dotenv.config();

let _config: ValidatedConfig | null = null;

/** Type-safe config definition helper (used in brigade.config.ts). */
export function defineConfig(config: BrigadeConfig): BrigadeConfig {
  return config;
}

/** Load and validate the configuration. Call once at startup. */
export async function loadConfig(configPath?: string): Promise<ValidatedConfig> {
  const resolvedPath = configPath
    ? path.resolve(configPath)
    : findConfigFile();

  let rawConfig: Partial<BrigadeConfig> = {};

  if (resolvedPath && fs.existsSync(resolvedPath)) {
    try {
      // Clear module cache for hot-reload support
      delete require.cache[require.resolve(resolvedPath)];
      const mod = require(resolvedPath);
      rawConfig = mod.default ?? mod;
    } catch (e) {
      throw new ConfigError(`Failed to load config from ${resolvedPath}`, e);
    }
  }

  // Inject env vars as overrides
  applyEnvOverrides(rawConfig);

  const result = brigadeConfigSchema.safeParse(rawConfig);
  if (!result.success) {
    throw new ConfigError('Invalid configuration', result.error.errors);
  }

  _config = result.data;
  return _config;
}

/** Get the cached config. Throws if loadConfig() hasn't been called. */
export function getConfig(): ValidatedConfig {
  if (!_config) {
    throw new ConfigError('Config not loaded. Call loadConfig() first.');
  }
  return _config;
}

function findConfigFile(): string | null {
  const candidates = [
    'brigade.config.ts',
    'brigade.config.js',
    'brigade.config.json',
  ];
  for (const f of candidates) {
    const full = path.resolve(process.cwd(), f);
    if (fs.existsSync(full)) return full;
  }
  return null;
}

function applyEnvOverrides(config: Partial<BrigadeConfig>): void {
  if (process.env['ANTHROPIC_API_KEY']) {
    config.providers ??= { default: 'anthropic' };
    config.providers.anthropic ??= { apiKey: '', defaultModel: 'claude-sonnet-4-6' };
    config.providers.anthropic.apiKey = process.env['ANTHROPIC_API_KEY'];
  }
  if (process.env['OPENAI_API_KEY']) {
    config.providers ??= { default: 'anthropic' };
    config.providers.openai ??= { apiKey: '', defaultModel: 'gpt-4o' };
    config.providers.openai.apiKey = process.env['OPENAI_API_KEY'];
  }
  if (process.env['OLLAMA_BASE_URL']) {
    config.providers ??= { default: 'anthropic' };
    config.providers.ollama ??= { baseUrl: process.env['OLLAMA_BASE_URL'], defaultModel: 'llama3' };
  }
  if (process.env['BRIGADE_API_KEY']) {
    config.api ??= { port: 3000, host: 'localhost' };
    (config.api as Record<string, unknown>)['apiKey'] = process.env['BRIGADE_API_KEY'];
  }
  if (process.env['PORT']) {
    config.api ??= { port: 3000, host: 'localhost' };
    config.api.port = parseInt(process.env['PORT'], 10);
  }
  if (process.env['LOG_LEVEL']) {
    config.logging ??= { level: 'info' };
    (config.logging as Record<string, unknown>)['level'] = process.env['LOG_LEVEL'];
  }
}
