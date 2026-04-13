/**
 * YAML frontmatter parser for SKILL.md, SOUL.md, AGENTS.md, etc.
 */

import yaml from 'js-yaml';

export interface ParsedMarkdown<T = Record<string, unknown>> {
  frontmatter: T;
  body: string;
}

/**
 * Parse a markdown file with optional YAML frontmatter.
 *
 * Format:
 * ---
 * key: value
 * ---
 * Body content here...
 */
export function parseMarkdownWithFrontmatter<T = Record<string, unknown>>(
  content: string,
): ParsedMarkdown<T> {
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { frontmatter: {} as T, body: content.trim() };
  }

  const [, yamlStr, body] = match;
  let frontmatter: T;

  try {
    frontmatter = (yaml.load(yamlStr ?? '') as T) ?? ({} as T);
  } catch {
    frontmatter = {} as T;
  }

  return { frontmatter, body: (body ?? '').trim() };
}

/** Extract HEARTBEAT.md directives (e.g. CHECK:, REPORT:, TRIGGER:) */
export function parseHeartbeatDirectives(
  content: string,
): Array<{ type: string; instruction: string }> {
  const lines = content.split('\n');
  const directives: Array<{ type: string; instruction: string }> = [];
  const pattern = /^[-*]?\s*(CHECK|REPORT|TRIGGER|REMIND):\s*(.+)/i;

  for (const line of lines) {
    const match = line.match(pattern);
    if (match) {
      directives.push({ type: match[1]!.toUpperCase(), instruction: match[2]!.trim() });
    }
  }

  return directives;
}
