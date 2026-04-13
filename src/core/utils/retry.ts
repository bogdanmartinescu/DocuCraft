/**
 * Exponential backoff retry utility.
 */

export interface RetryOptions {
  maxAttempts?: number;    // Default: 3
  baseDelayMs?: number;    // Default: 500
  maxDelayMs?: number;     // Default: 10_000
  jitter?: boolean;        // Default: true
  shouldRetry?: (error: unknown) => boolean;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelayMs = 500,
    maxDelayMs = 10_000,
    jitter = true,
    shouldRetry = () => true,
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts || !shouldRetry(error)) {
        throw error;
      }
      const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
      const actualDelay = jitter ? delay * (0.5 + Math.random() * 0.5) : delay;
      await sleep(actualDelay);
    }
  }

  throw lastError;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
