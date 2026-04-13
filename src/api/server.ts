/**
 * Brigade REST API server.
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { BrigadeError } from '../core/errors';
import { getLogger } from '../core/logger';

const log = getLogger('api');

export function createServer(deps: {
  apiKey?: string;
  corsEnabled?: boolean;
  rateLimit?: { windowMs: number; max: number };
}): Express {
  const app = express();

  // ─── Middleware ─────────────────────────────────────────────────────────────
  app.use(helmet({ contentSecurityPolicy: false }));
  if (deps.corsEnabled !== false) app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(morgan('tiny'));

  if (deps.rateLimit) {
    app.use('/api', rateLimit({
      windowMs: deps.rateLimit.windowMs,
      max: deps.rateLimit.max,
      message: { error: 'Too many requests' },
    }));
  }

  // ─── API Key Auth ─────────────────────────────────────────────────────────
  if (deps.apiKey) {
    app.use('/api', (req: Request, res: Response, next: NextFunction) => {
      if (req.path === '/health' || req.path === '/docs') return next();
      const key = req.headers['x-api-key'] ?? req.headers['authorization']?.replace('Bearer ', '');
      if (key !== deps.apiKey) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      next();
    });
  }

  // ─── Health ───────────────────────────────────────────────────────────────
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      version: process.env['npm_package_version'] ?? '0.1.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // ─── Error handler ────────────────────────────────────────────────────────
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof BrigadeError) {
      log.warn({ code: err.code, message: err.message }, 'API error');
      res.status(400).json({ error: err.message, code: err.code });
      return;
    }
    log.error(err, 'Unhandled API error');
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
