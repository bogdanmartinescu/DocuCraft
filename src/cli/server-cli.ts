/**
 * Start the full API server from CLI.
 */

import { createServer } from '../api/server';
import { ValidatedConfig } from '../core/config/schema';
import chalk from 'chalk';

export async function createServer(config: ValidatedConfig, port?: number): Promise<void> {
  const app = createServer({
    apiKey: config.api?.apiKey,
    corsEnabled: config.api?.cors,
    rateLimit: config.api?.rateLimit,
  });

  const listenPort = port ?? config.api?.port ?? 3000;
  const host = config.api?.host ?? 'localhost';

  app.listen(listenPort, () => {
    console.log(chalk.green(`\n✅ Brigade API running at http://${host}:${listenPort}`));
    console.log(chalk.cyan(`   Health: http://${host}:${listenPort}/api/health\n`));
  });
}
