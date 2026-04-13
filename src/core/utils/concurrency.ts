/**
 * Concurrency utilities — Semaphore and lane-based FIFO queue.
 */

/** Limits the number of concurrent async operations. */
export class Semaphore {
  private current = 0;
  private queue: Array<() => void> = [];

  constructor(private readonly max: number) {}

  async acquire(): Promise<void> {
    if (this.current < this.max) {
      this.current++;
      return;
    }
    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
    });
  }

  release(): void {
    this.current--;
    const next = this.queue.shift();
    if (next) {
      this.current++;
      next();
    }
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }
}

/** Lane-based FIFO queue — each key gets its own ordered lane. */
export class LaneQueue<T> {
  private lanes = new Map<string, T[]>();

  enqueue(laneKey: string, item: T): void {
    if (!this.lanes.has(laneKey)) {
      this.lanes.set(laneKey, []);
    }
    this.lanes.get(laneKey)!.push(item);
  }

  dequeue(laneKey: string): T | undefined {
    return this.lanes.get(laneKey)?.shift();
  }

  peek(laneKey: string): T | undefined {
    return this.lanes.get(laneKey)?.[0];
  }

  size(laneKey: string): number {
    return this.lanes.get(laneKey)?.length ?? 0;
  }

  totalSize(): number {
    let total = 0;
    for (const lane of this.lanes.values()) total += lane.length;
    return total;
  }

  laneKeys(): string[] {
    return [...this.lanes.keys()];
  }

  clearLane(laneKey: string): void {
    this.lanes.delete(laneKey);
  }
}

/** Run a set of promises with bounded concurrency. */
export async function pLimit<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number,
): Promise<T[]> {
  const sem = new Semaphore(concurrency);
  return Promise.all(tasks.map((task) => sem.run(task)));
}
