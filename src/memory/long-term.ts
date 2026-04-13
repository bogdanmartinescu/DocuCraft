/**
 * Long-term memory — reads and writes MEMORY.md in the agent workspace.
 */

import { WorkspaceManager } from '../storage/workspace-manager';
import { BrigadeId } from '../core/types/common';

const HEADER = '# Long-Term Memory\n\n';
const SEPARATOR = '\n---\n';

export class LongTermMemory {
  constructor(private readonly workspace: WorkspaceManager) {}

  read(agentId: BrigadeId): string {
    return this.workspace.readFile(agentId, 'MEMORY.md') ?? HEADER + '_Nothing stored yet._\n';
  }

  /** Append a new fact/memory entry to MEMORY.md */
  append(agentId: BrigadeId, entry: string): void {
    const existing = this.read(agentId);
    const timestamp = new Date().toISOString();
    const newContent = existing.endsWith('\n') ? existing : existing + '\n';
    this.workspace.writeFile(
      agentId,
      'MEMORY.md',
      newContent + SEPARATOR + `**[${timestamp}]** ${entry}\n`,
    );
  }

  /** Replace the entire MEMORY.md content (used by Dreaming compaction). */
  replace(agentId: BrigadeId, content: string): void {
    this.workspace.writeFile(agentId, 'MEMORY.md', content);
  }

  /** Count the number of entries (separator-delimited blocks) */
  countEntries(agentId: BrigadeId): number {
    const content = this.read(agentId);
    return (content.match(/^---$/gm) ?? []).length;
  }

  /** Search memory content for a query string (simple substring match) */
  search(agentId: BrigadeId, query: string): string[] {
    const content = this.read(agentId);
    const sections = content.split(SEPARATOR);
    const q = query.toLowerCase();
    return sections.filter((s) => s.toLowerCase().includes(q));
  }
}
