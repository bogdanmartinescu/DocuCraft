import * as fs from 'fs-extra';
import * as path from 'path';
import { DocuCraftConfig } from './types';

const DEFAULT_CONFIG: DocuCraftConfig = {
  title: 'DocuCraft Docs',
  description: 'Documentation generated with DocuCraft',
  inputDir: 'docs',
  outputDir: 'site',
  theme: 'default',
  baseUrl: '/',
  nav: [],
  sidebar: [],
};

export function loadConfig(configPath: string): DocuCraftConfig {
  if (!fs.existsSync(configPath)) {
    return { ...DEFAULT_CONFIG };
  }

  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    const userConfig = JSON.parse(raw) as Partial<DocuCraftConfig>;
    return { ...DEFAULT_CONFIG, ...userConfig };
  } catch (err) {
    throw new Error(`Failed to parse config at ${configPath}: ${(err as Error).message}`);
  }
}

export function resolveConfig(config: DocuCraftConfig, cwd: string): DocuCraftConfig {
  return {
    ...config,
    inputDir: path.resolve(cwd, config.inputDir),
    outputDir: path.resolve(cwd, config.outputDir),
  };
}
