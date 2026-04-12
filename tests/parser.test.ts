import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import {
  collectMarkdownFiles,
  extractFrontmatter,
  extractTitle,
  parseDocument,
  slugify,
} from '../src/parser';

describe('extractFrontmatter', () => {
  it('returns empty frontmatter when none present', () => {
    const { frontmatter, body } = extractFrontmatter('# Hello\n\nContent.');
    expect(frontmatter).toEqual({});
    expect(body).toBe('# Hello\n\nContent.');
  });

  it('parses frontmatter fields', () => {
    const input = '---\ntitle: My Page\nslug: my-page\n---\n# Body\n';
    const { frontmatter, body } = extractFrontmatter(input);
    expect(frontmatter).toEqual({ title: 'My Page', slug: 'my-page' });
    expect(body).toBe('# Body\n');
  });

  it('strips surrounding quotes from values', () => {
    const input = '---\ntitle: "Quoted Title"\n---\nBody.';
    const { frontmatter } = extractFrontmatter(input);
    expect(frontmatter.title).toBe('Quoted Title');
  });

  it('handles single-quoted values', () => {
    const input = "---\ntitle: 'Another Title'\n---\nBody.";
    const { frontmatter } = extractFrontmatter(input);
    expect(frontmatter.title).toBe('Another Title');
  });
});

describe('extractTitle', () => {
  it('returns frontmatter title when present', () => {
    expect(extractTitle('# Heading', { title: 'FM Title' })).toBe('FM Title');
  });

  it('extracts H1 heading when no frontmatter title', () => {
    expect(extractTitle('# My Heading\n\nContent.', {})).toBe('My Heading');
  });

  it('returns "Untitled" when no heading or frontmatter title', () => {
    expect(extractTitle('Just some content.', {})).toBe('Untitled');
  });
});

describe('slugify', () => {
  it('lowercases and replaces spaces with hyphens', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('removes special characters', () => {
    expect(slugify('Hello, World!')).toBe('hello-world');
  });

  it('strips leading and trailing hyphens', () => {
    expect(slugify('  hello  ')).toBe('hello');
  });

  it('collapses consecutive non-alphanumeric chars', () => {
    expect(slugify('foo -- bar')).toBe('foo-bar');
  });
});

describe('parseDocument', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'docucraft-'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it('parses a simple markdown file', () => {
    const filePath = path.join(tmpDir, 'intro.md');
    fs.writeFileSync(filePath, '# Hello World\n\nSome content here.');
    const doc = parseDocument(filePath, tmpDir);

    expect(doc.title).toBe('Hello World');
    expect(doc.slug).toBe('intro'); // slug is derived from the filename, not the heading
    expect(doc.html).toContain('<h1>Hello World</h1>');
    expect(doc.html).toContain('<p>Some content here.</p>');
    expect(doc.relativePath).toBe('intro.md');
  });

  it('uses frontmatter title and slug', () => {
    const filePath = path.join(tmpDir, 'page.md');
    fs.writeFileSync(filePath, '---\ntitle: Custom Title\nslug: custom\n---\n# Ignored Heading\n\nContent.');
    const doc = parseDocument(filePath, tmpDir);

    expect(doc.title).toBe('Custom Title');
    expect(doc.slug).toBe('custom');
  });

  it('renders code blocks with syntax highlighting', () => {
    const filePath = path.join(tmpDir, 'code.md');
    fs.writeFileSync(filePath, '# Code\n\n```typescript\nconst x: number = 1;\n```\n');
    const doc = parseDocument(filePath, tmpDir);

    expect(doc.html).toContain('hljs');
    expect(doc.html).toContain('language-typescript');
  });

  it('returns "Untitled" when no heading or frontmatter', () => {
    const filePath = path.join(tmpDir, 'empty.md');
    fs.writeFileSync(filePath, 'Just some prose without a heading.');
    const doc = parseDocument(filePath, tmpDir);

    expect(doc.title).toBe('Untitled');
  });
});

describe('collectMarkdownFiles', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'docucraft-'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it('returns empty array for a missing directory', () => {
    expect(collectMarkdownFiles(path.join(tmpDir, 'nonexistent'))).toEqual([]);
  });

  it('finds markdown files recursively', async () => {
    await fs.ensureDir(path.join(tmpDir, 'sub'));
    fs.writeFileSync(path.join(tmpDir, 'index.md'), '# Index');
    fs.writeFileSync(path.join(tmpDir, 'sub', 'page.md'), '# Page');
    fs.writeFileSync(path.join(tmpDir, 'README.txt'), 'not markdown');

    const result = collectMarkdownFiles(tmpDir);
    expect(result).toHaveLength(2);
    expect(result.some((f) => f.endsWith('index.md'))).toBe(true);
    expect(result.some((f) => f.endsWith('page.md'))).toBe(true);
    expect(result.every((f) => f.endsWith('.md'))).toBe(true);
  });

  it('returns files in sorted order', async () => {
    fs.writeFileSync(path.join(tmpDir, 'z.md'), '# Z');
    fs.writeFileSync(path.join(tmpDir, 'a.md'), '# A');
    fs.writeFileSync(path.join(tmpDir, 'm.md'), '# M');

    const result = collectMarkdownFiles(tmpDir);
    const names = result.map((f) => path.basename(f));
    expect(names).toEqual([...names].sort());
  });
});
