/**
 * Skill registry — register, discover, and resolve skills by name or tag.
 */

import { BaseSkill } from './base-skill';
import { SkillMetadata } from '../core/types/skill';
import { ToolDef } from '../core/types/provider';
import { SkillNotFoundError } from '../core/errors';
import { getLogger } from '../core/logger';

const log = getLogger('skill-registry');

export class SkillRegistry {
  private skills = new Map<string, BaseSkill>();

  register(skill: BaseSkill): void {
    this.skills.set(skill.metadata.name, skill);
    log.debug({ skillName: skill.metadata.name }, 'Skill registered');
  }

  registerMany(skills: BaseSkill[]): void {
    for (const skill of skills) this.register(skill);
  }

  get(name: string): BaseSkill {
    const skill = this.skills.get(name);
    if (!skill) throw new SkillNotFoundError(name);
    return skill;
  }

  has(name: string): boolean {
    return this.skills.has(name);
  }

  /** Find skills matching a set of names (e.g. agent's assigned skills) */
  resolve(names: string[]): BaseSkill[] {
    return names
      .filter((n) => this.has(n))
      .map((n) => this.get(n));
  }

  search(query: { tags?: string[]; riskLevel?: string }): BaseSkill[] {
    return [...this.skills.values()].filter((s) => {
      if (query.tags?.length) {
        const hasTag = query.tags.some((t) => s.metadata.tags.includes(t));
        if (!hasTag) return false;
      }
      if (query.riskLevel && s.metadata.riskLevel !== query.riskLevel) return false;
      return true;
    });
  }

  listAll(): SkillMetadata[] {
    return [...this.skills.values()].map((s) => ({
      ...s.metadata,
      source: 'built-in' as const,
      usageCount: 0,
    }));
  }

  /** Convert skills to LLM tool definitions (for agent tool-calling) */
  toToolDefs(names: string[]): ToolDef[] {
    return this.resolve(names).map((s) => s.toToolDef());
  }

  count(): number {
    return this.skills.size;
  }
}
