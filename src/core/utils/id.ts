import { v4 as uuidv4 } from 'uuid';

/** Generate a new unique Brigade ID (UUID v4). */
export function generateId(): string {
  return uuidv4();
}
