import * as fs from 'fs-extra';
import * as path from 'path';
import { DocuCraftConfig, ParsedDocument } from './types';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export class Renderer {
  private templateCache = new Map<string, string>();

  constructor(private config: DocuCraftConfig) {}

  private getTemplate(): string {
    const { theme } = this.config;
    if (this.templateCache.has(theme)) {
      return this.templateCache.get(theme)!;
    }

    const themePath = path.join(__dirname, '..', 'themes', theme, 'template.html');
    if (!fs.existsSync(themePath)) {
      throw new Error(`Theme "${theme}" not found at ${themePath}`);
    }

    const template = fs.readFileSync(themePath, 'utf-8');
    this.templateCache.set(theme, template);
    return template;
  }

  private buildSidebar(docs: ParsedDocument[], current: ParsedDocument): string {
    if (this.config.sidebar.length > 0) {
      return this.renderConfiguredSidebar(current);
    }
    return this.renderAutoSidebar(docs, current);
  }

  private renderConfiguredSidebar(current: ParsedDocument): string {
    let html = '';
    for (const section of this.config.sidebar) {
      html += `<div class="sidebar-section">\n`;
      html += `  <h3 class="sidebar-section-title">${escapeHtml(section.title)}</h3>\n`;
      html += `  <ul class="sidebar-items">\n`;
      for (const item of section.items) {
        const isActive = current.slug === item.path || current.relativePath === item.path;
        const cls = isActive ? ' class="active"' : '';
        html += `    <li><a href="${escapeHtml(item.path)}"${cls}>${escapeHtml(item.label)}</a></li>\n`;
      }
      html += `  </ul>\n</div>\n`;
    }
    return html;
  }

  private renderAutoSidebar(docs: ParsedDocument[], current: ParsedDocument): string {
    let html = '<ul class="sidebar-items">\n';
    for (const doc of docs) {
      const href = `${this.config.baseUrl}${doc.slug}.html`;
      const cls = doc.slug === current.slug ? ' class="active"' : '';
      html += `  <li><a href="${escapeHtml(href)}"${cls}>${escapeHtml(doc.title)}</a></li>\n`;
    }
    return html + '</ul>\n';
  }

  private buildNav(): string {
    return this.config.nav
      .map((item) => {
        const ext = item.external ? ' target="_blank" rel="noopener noreferrer"' : '';
        return `<a href="${escapeHtml(item.href)}"${ext}>${escapeHtml(item.label)}</a>`;
      })
      .join('\n');
  }

  renderPage(doc: ParsedDocument, allDocs: ParsedDocument[]): string {
    const template = this.getTemplate();
    const sidebar = this.buildSidebar(allDocs, doc);
    const nav = this.buildNav();

    return template
      .replace(/\{\{TITLE\}\}/g, escapeHtml(doc.title))
      .replace(/\{\{SITE_TITLE\}\}/g, escapeHtml(this.config.title))
      .replace(/\{\{DESCRIPTION\}\}/g, escapeHtml(doc.frontmatter.description ?? this.config.description))
      .replace(/\{\{CONTENT\}\}/g, doc.html)
      .replace(/\{\{SIDEBAR\}\}/g, sidebar)
      .replace(/\{\{NAV\}\}/g, nav)
      .replace(/\{\{BASE_URL\}\}/g, this.config.baseUrl);
  }
}
