import * as fs from 'fs-extra';
import * as path from 'path';
import { marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js';
import { ParsedDocument } from './types';

marked.use(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code: string, lang: string): string {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, { language }).value;
    },
  })
);

marked.setOptions({ gfm: true, breaks: false });

interface FrontmatterResult {
  frontmatter: Record<string, string>;
  body: string;
}

export function extractFrontmatter(content: string): FrontmatterResult {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const frontmatter: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim().replace(/^["']|["']$/g, '');
      frontmatter[key] = value;
    }
  }

  return { frontmatter, body: content.slice(match[0].length) };
}

export function extractTitle(body: string, frontmatter: Record<string, string>): string {
  if (frontmatter.title) return frontmatter.title;
  const match = body.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : 'Untitled';
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function parseDocument(filePath: string, inputDir: string): ParsedDocument {
  const content = fs.readFileSync(filePath, 'utf-8');
  const relativePath = path.relative(inputDir, filePath);
  const { frontmatter, body } = extractFrontmatter(content);
  const title = extractTitle(body, frontmatter);
  const html = marked.parse(body) as string;

  const baseName = path.basename(filePath, path.extname(filePath));
  const isIndex = baseName === 'index';
  const defaultSlug = isIndex
    ? slugify(path.dirname(relativePath).replace(/^\./, '') || 'home')
    : slugify(baseName);
  const slug = frontmatter.slug || defaultSlug;

  return { title, slug, content: body, html, frontmatter, filePath, relativePath };
}

export function collectMarkdownFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];

  const files: string[] = [];

  function walk(currentDir: string): void {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files.sort();
}
