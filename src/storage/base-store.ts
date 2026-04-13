/**
 * Abstract storage interface — swap between JSON file store and SQLite.
 */

import { PaginatedResult } from '../core/types/common';

export interface StoreQuery {
  offset?: number;
  limit?: number;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
}

export interface StoreFilter {
  [key: string]: unknown;
}

export abstract class BaseStore {
  abstract get<T>(collection: string, id: string): Promise<T | null>;
  abstract set<T>(collection: string, id: string, data: T): Promise<void>;
  abstract list<T>(collection: string, query?: StoreQuery): Promise<PaginatedResult<T>>;
  abstract delete(collection: string, id: string): Promise<boolean>;
  abstract query<T>(collection: string, filter: StoreFilter): Promise<T[]>;
  abstract exists(collection: string, id: string): Promise<boolean>;

  /** Upsert helper */
  async upsert<T>(collection: string, id: string, data: T): Promise<void> {
    return this.set(collection, id, data);
  }
}

export const COLLECTIONS = {
  AGENTS: 'agents',
  TEAMS: 'teams',
  SKILLS: 'skills',
  WORKFLOWS: 'workflows',
  WORKFLOW_RUNS: 'workflow_runs',
  MEMORY_CHUNKS: 'memory_chunks',
  CRON_JOBS: 'cron_jobs',
  SESSIONS: 'sessions',
} as const;
