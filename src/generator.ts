import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import chokidar from 'chokidar';
import { DocuCraftConfig, GeneratorOptions, ParsedDocument } from './types';
import { collectMarkdownFiles, parseDocument } from './parser';
import { Renderer } from './renderer';

export class Generator {
  private renderer: Renderer;

  constructor(private config: DocuCraftConfig) {
    this.renderer = new Renderer(config);
  }

  async build(options: GeneratorOptions = {}): Promise<void> {
    if (options.clean) {
      await this.clean();
    }

    const files = collectMarkdownFiles(this.config.inputDir);

    if (files.length === 0) {
      console.warn(chalk.yellow(`No markdown files found in ${this.config.inputDir}`));
      return;
    }

    if (options.verbose) {
      console.log(chalk.blue(`Found ${files.length} file(s) in ${this.config.inputDir}`));
    }

    const docs = files.map((f) => parseDocument(f, this.config.inputDir));

    await fs.ensureDir(this.config.outputDir);
    await this.copyThemeAssets();

    for (const doc of docs) {
      await this.writePage(doc, docs);
      if (options.verbose) {
        const outRel = path.relative(this.config.outputDir, this.resolveOutputPath(doc));
        console.log(chalk.gray(`  ${doc.relativePath} → ${outRel}`));
      }
    }

    console.log(chalk.green(`Built ${docs.length} page(s) → ${this.config.outputDir}`));
  }

  private async writePage(doc: ParsedDocument, allDocs: ParsedDocument[]): Promise<void> {
    const html = this.renderer.renderPage(doc, allDocs);
    const outputPath = this.resolveOutputPath(doc);
    await fs.ensureDir(path.dirname(outputPath));
    await fs.writeFile(outputPath, html, 'utf-8');
  }

  private resolveOutputPath(doc: ParsedDocument): string {
    const outRelative = doc.relativePath.replace(/\.md$/, '.html');
    return path.join(this.config.outputDir, outRelative);
  }

  private async copyThemeAssets(): Promise<void> {
    const themeDir = path.join(__dirname, '..', 'themes', this.config.theme);

    const styleFile = path.join(themeDir, 'style.css');
    if (await fs.pathExists(styleFile)) {
      await fs.copy(styleFile, path.join(this.config.outputDir, 'style.css'));
    }

    const assetsDir = path.join(themeDir, 'assets');
    if (await fs.pathExists(assetsDir)) {
      await fs.copy(assetsDir, path.join(this.config.outputDir, 'assets'));
    }
  }

  async clean(): Promise<void> {
    await fs.remove(this.config.outputDir);
    console.log(chalk.gray(`Cleaned ${this.config.outputDir}`));
  }

  watch(options: GeneratorOptions = {}): void {
    const pattern = path.join(this.config.inputDir, '**', '*.md');
    console.log(chalk.blue(`Watching ${this.config.inputDir} for changes...`));

    const watcher = chokidar.watch(pattern, { ignoreInitial: true });

    const rebuild = async (filePath: string, event: string): Promise<void> => {
      console.log(chalk.cyan(`[${event}] ${filePath}`));
      try {
        await this.build({ ...options, clean: false });
      } catch (err) {
        console.error(chalk.red(`Build error: ${(err as Error).message}`));
      }
    };

    watcher.on('add', (f) => rebuild(f, 'add'));
    watcher.on('change', (f) => rebuild(f, 'change'));
    watcher.on('unlink', (f) => rebuild(f, 'unlink'));

    process.on('SIGINT', () => {
      watcher.close().then(() => process.exit(0));
    });
  }
}
