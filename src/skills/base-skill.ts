/**
 * Abstract base class for all Brigade skills.
 * Skills are the building blocks of agent capabilities — they become LLM tools.
 */

import { z } from 'zod';
import { SkillContext, SkillDef, SkillExecutionResult } from '../core/types/skill';
import { ToolDef } from '../core/types/provider';
import { SkillValidationError } from '../core/errors';

export abstract class BaseSkill<
  TInput = Record<string, unknown>,
  TOutput = unknown,
> {
  abstract readonly metadata: SkillDef;

  /** Core execution logic — implement in each concrete skill. */
  abstract execute(
    input: TInput,
    context: SkillContext,
  ): Promise<SkillExecutionResult<TOutput>>;

  /** Zod schema for input validation. Override to enable runtime validation. */
  protected inputSchema?: z.ZodSchema<TInput>;

  /** Validate input against the Zod schema. Returns parsed input or throws. */
  validate(rawInput: unknown): TInput {
    if (!this.inputSchema) return rawInput as TInput;
    const result = this.inputSchema.safeParse(rawInput);
    if (!result.success) {
      throw new SkillValidationError(
        this.metadata.name,
        result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
      );
    }
    return result.data;
  }

  /**
   * Convert this skill to an LLM tool definition.
   * This is what gets sent to Claude/GPT as a tool the agent can call.
   */
  toToolDef(): ToolDef {
    return {
      name: this.metadata.name,
      description: this.metadata.description,
      input_schema: this.metadata.inputSchema,
    };
  }

  /** Safe execute: validates input, times execution, catches errors. */
  async safeExecute(
    rawInput: unknown,
    context: SkillContext,
  ): Promise<SkillExecutionResult<TOutput>> {
    const start = Date.now();
    try {
      const input = this.validate(rawInput);
      const result = await this.execute(input, context);
      return { ...result, durationMs: Date.now() - start };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        durationMs: Date.now() - start,
      };
    }
  }
}
