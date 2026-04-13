/**
 * JSON file-based store — zero-config default storage backend.
 * Each collection is a directory; each record is an <id>.json file.
 */

import fs from 'fs';
import path from 'path';
import { BaseStore, StoreFilter, StoreQuery } from './base-store';
import { PaginatedResult } from '../core/types/common';
import { StorageError } from '../core/errors';

export class JsonFileStore extends BaseStore {
  constructor(private readonly dataDir: string) {
    super();
    fs.mkdirSync(dataDir, { recursive: true });
  }

  private collectionDir(collection: string): string {
    return path.join(this.dataDir, collection);
  }

  private filePath(collection: string, id: string): string {
    return path.join(this.collectionDir(collection), `${id}.json`);
  }

  private ensureDir(collection: string): void {
    fs.mkdirSync(this.collectionDir(collection), { recursive: true });
  }

  async get<T>(collection: string, id: string): Promise<T | null> {
    const fp = this.filePath(collection, id);
    if (!fs.existsSync(fp)) return null;
    try {
      const raw = fs.readFileSync(fp, 'utf-8');
      return JSON.parse(raw) as T;
    } catch (e) {
      throw new StorageError(`Failed to read ${collection}/${id}`, e);
    }
  }

  async set<T>(collection: string, id: string, data: T): Promise<void> {
    this.ensureDir(collection);
    const fp = this.filePath(collection, id);
    try {
      fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      throw new StorageError(`Failed to write ${collection}/${id}`, e);
    }
  }

  async list<T>(collection: string, query: StoreQuery = {}): Promise<PaginatedResult<T>> {
    this.ensureDir(collection);
    const dir = this.collectionDir(collection);

    let files: string[];
    try {
      files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
    } catch {
      return { items: [], total: 0, offset: 0, limit: query.limit ?? 50 };
    }

    const items: T[] = [];
    for (const file of files) {
      try {
        const raw = fs.readFileSync(path.join(dir, file), 'utf-8');
        items.push(JSON.parse(raw) as T);
      } catch { /* skip corrupt files */ }
    }

    const total = items.length;
    const offset = query.offset ?? 0;
    const limit = query.limit ?? 50;
    const sliced = items.slice(offset, offset + limit);

    return { items: sliced, total, offset, limit };
  }

  async delete(collection: string, id: string): Promise<boolean> {
    const fp = this.filePath(collection, id);
    if (!fs.existsSync(fp)) return false;
    try {
      fs.unlinkSync(fp);
      return true;
    } catch (e) {
      throw new StorageError(`Failed to delete ${collection}/${id}`, e);
    }
  }

  async query<T>(collection: string, filter: StoreFilter): Promise<T[]> {
    const { items } = await this.list<T>(collection, { limit: 10_000 });
    return items.filter((item) => {
      for (const [key, value] of Object.entries(filter)) {
        const record = item as Record<string, unknown>;
        if (record[key] !== value) return false;
      }
      return true;
    });
  }

  async exists(collection: string, id: string): Promise<boolean> {
    return fs.existsSync(this.filePath(collection, id));
  }
}
