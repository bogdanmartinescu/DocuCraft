#!/usr/bin/env node

import { Command } from 'commander';
import * as path from 'path';
import chalk from 'chalk';
import { loadConfig, resolveConfig } from './config';
import { Generator } from './generator';

const program = new Command();

program
  .name('docucraft')
  .description('A fast, elegant documentation site generator')
  .version('1.0.0');

program
  .command('build')
  .description('Build the documentation site')
  .option('-c, --config <path>', 'Path to config file', 'docucraft.json')
  .option('--clean', 'Clean output directory before building', false)
  .option('-v, --verbose', 'Verbose output', false)
  .action(async (options: { config: string; clean: boolean; verbose: boolean }) => {
    try {
      const cwd = process.cwd();
      const config = resolveConfig(loadConfig(path.resolve(cwd, options.config)), cwd);
      const generator = new Generator(config);
      await generator.build({ clean: options.clean, verbose: options.verbose });
    } catch (err) {
      console.error(chalk.red(`Error: ${(err as Error).message}`));
      process.exit(1);
    }
  });

program
  .command('watch')
  .description('Watch for changes and rebuild automatically')
  .option('-c, --config <path>', 'Path to config file', 'docucraft.json')
  .option('-v, --verbose', 'Verbose output', false)
  .action(async (options: { config: string; verbose: boolean }) => {
    try {
      const cwd = process.cwd();
      const config = resolveConfig(loadConfig(path.resolve(cwd, options.config)), cwd);
      const generator = new Generator(config);
      await generator.build({ verbose: options.verbose });
      generator.watch({ verbose: options.verbose });
    } catch (err) {
      console.error(chalk.red(`Error: ${(err as Error).message}`));
      process.exit(1);
    }
  });

program
  .command('clean')
  .description('Remove the output directory')
  .option('-c, --config <path>', 'Path to config file', 'docucraft.json')
  .action(async (options: { config: string }) => {
    try {
      const cwd = process.cwd();
      const config = resolveConfig(loadConfig(path.resolve(cwd, options.config)), cwd);
      const generator = new Generator(config);
      await generator.clean();
    } catch (err) {
      console.error(chalk.red(`Error: ${(err as Error).message}`));
      process.exit(1);
    }
  });

program.parse();
