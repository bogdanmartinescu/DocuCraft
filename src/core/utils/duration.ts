/**
 * Parse human-readable duration strings into milliseconds.
 * e.g. "30m" → 1_800_000, "2h" → 7_200_000, "7d" → 604_800_000
 */

const UNITS: Record<string, number> = {
  s:   1_000,
  sec: 1_000,
  m:   60_000,
  min: 60_000,
  h:   3_600_000,
  hr:  3_600_000,
  d:   86_400_000,
  day: 86_400_000,
  w:   604_800_000,
  wk:  604_800_000,
};

export function parseDuration(str: string): number {
  const match = str.trim().match(/^(\d+(?:\.\d+)?)\s*([a-z]+)$/i);
  if (!match) throw new Error(`Invalid duration string: "${str}"`);

  const value = parseFloat(match[1]!);
  const unit = match[2]!.toLowerCase();
  const multiplier = UNITS[unit];

  if (!multiplier) throw new Error(`Unknown duration unit: "${unit}"`);
  return Math.round(value * multiplier);
}

export function formatDuration(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1_000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h`;
  return `${Math.round(ms / 86_400_000)}d`;
}
