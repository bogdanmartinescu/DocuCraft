/**
 * Register all built-in skills into a SkillRegistry.
 */

import { SkillRegistry } from './skill-registry';
import { WebSearchSkill } from './built-in/web-search.skill';
import { WebScrapeSkill } from './built-in/web-scrape.skill';
import { FileReadSkill } from './built-in/file-read.skill';
import { FileWriteSkill } from './built-in/file-write.skill';
import { CodeExecuteSkill } from './built-in/code-execute.skill';
import { ApiCallSkill } from './built-in/api-call.skill';
import { SummarizeSkill } from './built-in/summarize.skill';
import { DataAnalyzeSkill } from './built-in/data-analyze.skill';

export function createDefaultSkillRegistry(): SkillRegistry {
  const registry = new SkillRegistry();

  registry.registerMany([
    new WebSearchSkill(),
    new WebScrapeSkill(),
    new FileReadSkill(),
    new FileWriteSkill(),
    new CodeExecuteSkill(),
    new ApiCallSkill(),
    new SummarizeSkill(),
    new DataAnalyzeSkill(),
  ]);

  return registry;
}

export { SkillRegistry };
export { BaseSkill } from './base-skill';
