/**
 * Structured logger — pino with child logger support per module.
 */

import pino, { Logger } from 'pino';

export type { Logger };

let _logger: Logger | null = null;

export function initLogger(options: {
  level?: string;
  pretty?: boolean;
}): Logger {
  const transport =
    options.pretty
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' } }
      : undefined;

  _logger = pino({ level: options.level ?? 'info', transport });
  return _logger;
}

export function getLogger(module?: string): Logger {
  if (!_logger) {
    _logger = pino({ level: 'info' });
  }
  return module ? _logger.child({ module }) : _logger;
}
