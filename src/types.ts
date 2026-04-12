export interface DocuCraftConfig {
  title: string;
  description: string;
  inputDir: string;
  outputDir: string;
  theme: string;
  baseUrl: string;
  nav: NavItem[];
  sidebar: SidebarSection[];
}

export interface NavItem {
  label: string;
  href: string;
  external?: boolean;
}

export interface SidebarSection {
  title: string;
  items: SidebarItem[];
}

export interface SidebarItem {
  label: string;
  path: string;
}

export interface ParsedDocument {
  title: string;
  slug: string;
  content: string;
  html: string;
  frontmatter: Record<string, string>;
  filePath: string;
  relativePath: string;
}

export interface GeneratorOptions {
  watch?: boolean;
  clean?: boolean;
  verbose?: boolean;
}
