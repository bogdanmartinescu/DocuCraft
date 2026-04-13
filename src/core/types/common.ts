/**
 * Common base types used across the entire Brigade platform.
 */

export type BrigadeId = string; // UUID v7
export type Timestamp = string;    // ISO-8601

/** Discriminated union result type — avoids throwing for expected failures. */
export type Result<T, E = BrigadeError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E extends BrigadeError>(error: E): Result<never, E> {
  return { ok: false, error };
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
}

export interface BrigadeError {
  code: string;
  message: string;
  details?: unknown;
}

/** Generic key-value metadata bag. */
export type Metadata = Record<string, unknown>;

/** Artifact produced by an agent (file, report, code, etc.) */
export interface Artifact {
  id: BrigadeId;
  name: string;
  type: 'file' | 'report' | 'code' | 'data' | 'image' | 'other';
  content: string;
  mimeType?: string;
  path?: string;          // Workspace-relative path if saved to disk
  createdAt: Timestamp;
}
