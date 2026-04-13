/**
 * Lane-based FIFO task queue — each session gets its own ordered lane.
 */

import { QueuedTask } from '../core/types/team';
import { LaneQueue } from '../core/utils/concurrency';
import { generateId } from '../core/utils/id';
import { Timestamp } from '../core/types/common';

export class TaskQueue {
  private lanes = new LaneQueue<QueuedTask>();

  enqueue(sessionId: string, task: Omit<QueuedTask, 'id' | 'enqueuedAt'>): QueuedTask {
    const queued: QueuedTask = {
      id: generateId(),
      enqueuedAt: new Date().toISOString() as Timestamp,
      ...task,
      sessionId,
    };
    this.lanes.enqueue(sessionId, queued);
    return queued;
  }

  dequeue(sessionId: string): QueuedTask | undefined {
    return this.lanes.dequeue(sessionId);
  }

  peek(sessionId: string): QueuedTask | undefined {
    return this.lanes.peek(sessionId);
  }

  size(sessionId: string): number {
    return this.lanes.size(sessionId);
  }

  totalSize(): number {
    return this.lanes.totalSize();
  }

  laneKeys(): string[] {
    return this.lanes.laneKeys();
  }

  clearLane(sessionId: string): void {
    this.lanes.clearLane(sessionId);
  }
}
