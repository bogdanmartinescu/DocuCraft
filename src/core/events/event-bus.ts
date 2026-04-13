/**
 * Typed event bus — the backbone for loose coupling across Brigade modules.
 * Built on eventemitter3 for high-performance event emission.
 */

import EventEmitter from 'eventemitter3';
import { BrigadeEvents } from './events';

type EventHandler<K extends keyof BrigadeEvents> = (
  payload: BrigadeEvents[K]
) => void | Promise<void>;

export class BrigadeEventBus {
  private emitter = new EventEmitter();

  on<K extends keyof BrigadeEvents>(event: K, handler: EventHandler<K>): this {
    this.emitter.on(event as string, handler as (...args: unknown[]) => void);
    return this;
  }

  once<K extends keyof BrigadeEvents>(event: K, handler: EventHandler<K>): this {
    this.emitter.once(event as string, handler as (...args: unknown[]) => void);
    return this;
  }

  off<K extends keyof BrigadeEvents>(event: K, handler: EventHandler<K>): this {
    this.emitter.off(event as string, handler as (...args: unknown[]) => void);
    return this;
  }

  emit<K extends keyof BrigadeEvents>(event: K, payload: BrigadeEvents[K]): void {
    this.emitter.emit(event as string, payload);
  }

  removeAllListeners(event?: keyof BrigadeEvents): this {
    this.emitter.removeAllListeners(event as string | undefined);
    return this;
  }
}

/** Singleton event bus — import and use anywhere in the app. */
export const eventBus = new BrigadeEventBus();
