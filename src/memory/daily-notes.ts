/**
 * Daily notes — YYYY-MM-DD.md files per agent workspace.
 */

import path from 'path';
import fs from 'fs';
import { BrigadeId } from '../core/types/common';
import { WorkspaceManager } from '../storage/workspace-manager';

export class DailyNotes {
  constructor(private readonly workspace: WorkspaceManager) {}

  private noteFilename(date?: Date): string {
    const d = date ?? new Date();
    return `memory/${d.toISOString().slice(0, 10)}.md`;
  }

  /** Append a note to today's daily file */
  append(agentId: BrigadeId, note: string, date?: Date): void {
    const filename = this.noteFilename(date);
    const existing = this.workspace.readFile(agentId, filename);
    const timestamp = new Date().toLocaleTimeString();
    const line = `\n- **${timestamp}**: ${note}`;
    if (existing) {
      this.workspace.writeFile(agentId, filename, existing + line);
    } else {
      const d = (date ?? new Date()).toISOString().slice(0, 10);
      this.workspace.writeFile(agentId, filename, `# ${d}\n${line}`);
    }
  }

  /** Read a specific day's notes (defaults to today) */
  read(agentId: BrigadeId, date?: Date): string | null {
    return this.workspace.readFile(agentId, this.noteFilename(date));
  }

  /** Read today and yesterday */
  readRecent(agentId: BrigadeId): string {
    const today = this.read(agentId) ?? '';
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yest = this.read(agentId, yesterday) ?? '';
    return [today, yest].filter(Boolean).join('\n\n');
  }

  /** List all daily note filenames for an agent */
  listDates(agentId: BrigadeId): string[] {
    const memDir = path.join(this.workspace.getWorkspacePath(agentId), 'memory');
    if (!fs.existsSync(memDir)) return [];
    return fs.readdirSync(memDir)
      .filter((f) => /^\d{4}-\d{2}-\d{2}\.md$/.test(f))
      .sort()
      .reverse();
  }

  /** Get all notes as a concatenated string (for Dreaming input) */
  readAll(agentId: BrigadeId): string {
    return this.listDates(agentId)
      .map((f) => this.workspace.readFile(agentId, `memory/${f}`) ?? '')
      .filter(Boolean)
      .join('\n\n');
  }
}
