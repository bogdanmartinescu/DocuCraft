import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import { Generator } from '../src/generator';
import { DocuCraftConfig } from '../src/types';

function makeConfig(inputDir: string, outputDir: string): DocuCraftConfig {
  return {
    title: 'Test Docs',
    description: 'Test description',
    inputDir,
    outputDir,
    theme: 'default',
    baseUrl: '/',
    nav: [],
    sidebar: [],
  };
}

describe('Generator.build', () => {
  let tmpDir: string;
  let inputDir: string;
  let outputDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'docucraft-'));
    inputDir = path.join(tmpDir, 'docs');
    outputDir = path.join(tmpDir, 'site');
    await fs.ensureDir(inputDir);
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it('creates output HTML files from markdown input', async () => {
    fs.writeFileSync(path.join(inputDir, 'index.md'), '# Home\n\nWelcome to the docs!');
    fs.writeFileSync(path.join(inputDir, 'guide.md'), '# Guide\n\nHow to use this.');

    const generator = new Generator(makeConfig(inputDir, outputDir));
    await generator.build();

    expect(await fs.pathExists(path.join(outputDir, 'index.html'))).toBe(true);
    expect(await fs.pathExists(path.join(outputDir, 'guide.html'))).toBe(true);
  });

  it('injects page title into HTML', async () => {
    fs.writeFileSync(path.join(inputDir, 'intro.md'), '# Introduction\n\nContent.');

    const generator = new Generator(makeConfig(inputDir, outputDir));
    await generator.build();

    const html = await fs.readFile(path.join(outputDir, 'intro.html'), 'utf-8');
    expect(html).toContain('Introduction');
  });

  it('injects page content into HTML', async () => {
    fs.writeFileSync(path.join(inputDir, 'page.md'), '# Page\n\nHello from content.');

    const generator = new Generator(makeConfig(inputDir, outputDir));
    await generator.build();

    const html = await fs.readFile(path.join(outputDir, 'page.html'), 'utf-8');
    expect(html).toContain('Hello from content.');
  });

  it('preserves nested directory structure', async () => {
    await fs.ensureDir(path.join(inputDir, 'api'));
    fs.writeFileSync(path.join(inputDir, 'api', 'reference.md'), '# API Reference\n\nContent.');

    const generator = new Generator(makeConfig(inputDir, outputDir));
    await generator.build();

    expect(await fs.pathExists(path.join(outputDir, 'api', 'reference.html'))).toBe(true);
  });

  it('copies style.css from the default theme', async () => {
    fs.writeFileSync(path.join(inputDir, 'index.md'), '# Home\n\nContent.');

    const generator = new Generator(makeConfig(inputDir, outputDir));
    await generator.build();

    expect(await fs.pathExists(path.join(outputDir, 'style.css'))).toBe(true);
  });

  it('does not throw when no markdown files exist', async () => {
    const generator = new Generator(makeConfig(inputDir, outputDir));
    await expect(generator.build()).resolves.not.toThrow();
  });

  it('cleans output before build when clean option is set', async () => {
    await fs.ensureDir(outputDir);
    await fs.writeFile(path.join(outputDir, 'stale.html'), '<html/>');
    fs.writeFileSync(path.join(inputDir, 'new.md'), '# New Page\n\nContent.');

    const generator = new Generator(makeConfig(inputDir, outputDir));
    await generator.build({ clean: true });

    expect(await fs.pathExists(path.join(outputDir, 'stale.html'))).toBe(false);
    expect(await fs.pathExists(path.join(outputDir, 'new.html'))).toBe(true);
  });

  it('builds site title from config', async () => {
    fs.writeFileSync(path.join(inputDir, 'index.md'), '# Home\n\nContent.');

    const config = { ...makeConfig(inputDir, outputDir), title: 'My Custom Docs' };
    const generator = new Generator(config);
    await generator.build();

    const html = await fs.readFile(path.join(outputDir, 'index.html'), 'utf-8');
    expect(html).toContain('My Custom Docs');
  });
});

describe('Generator.clean', () => {
  let tmpDir: string;
  let inputDir: string;
  let outputDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'docucraft-'));
    inputDir = path.join(tmpDir, 'docs');
    outputDir = path.join(tmpDir, 'site');
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it('removes the output directory', async () => {
    await fs.ensureDir(outputDir);
    await fs.writeFile(path.join(outputDir, 'index.html'), '<html/>');

    const generator = new Generator(makeConfig(inputDir, outputDir));
    await generator.clean();

    expect(await fs.pathExists(outputDir)).toBe(false);
  });

  it('does not throw when output directory does not exist', async () => {
    const generator = new Generator(makeConfig(inputDir, outputDir));
    await expect(generator.clean()).resolves.not.toThrow();
  });
});
