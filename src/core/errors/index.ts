/**
 * Typed error hierarchy for Brigade.
 */

export class BrigadeError extends Error {
  public readonly code: string;
  public readonly details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'BrigadeError';
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return { code: this.code, message: this.message, details: this.details };
  }
}

export class ConfigError extends BrigadeError {
  constructor(message: string, details?: unknown) {
    super('CONFIG_ERROR', message, details);
    this.name = 'ConfigError';
  }
}

export class ProviderError extends BrigadeError {
  constructor(message: string, details?: unknown) {
    super('PROVIDER_ERROR', message, details);
    this.name = 'ProviderError';
  }
}

export class AgentError extends BrigadeError {
  constructor(message: string, details?: unknown) {
    super('AGENT_ERROR', message, details);
    this.name = 'AgentError';
  }
}

export class SkillError extends BrigadeError {
  constructor(message: string, details?: unknown) {
    super('SKILL_ERROR', message, details);
    this.name = 'SkillError';
  }
}

export class SkillNotFoundError extends SkillError {
  constructor(skillName: string) {
    super(`Skill not found: "${skillName}"`, { skillName });
    this.name = 'SkillNotFoundError';
  }
}

export class SkillValidationError extends SkillError {
  constructor(skillName: string, errors: string[]) {
    super(`Invalid input for skill "${skillName}"`, { skillName, errors });
    this.name = 'SkillValidationError';
  }
}

export class TeamError extends BrigadeError {
  constructor(message: string, details?: unknown) {
    super('TEAM_ERROR', message, details);
    this.name = 'TeamError';
  }
}

export class WorkflowError extends BrigadeError {
  constructor(message: string, details?: unknown) {
    super('WORKFLOW_ERROR', message, details);
    this.name = 'WorkflowError';
  }
}

export class StorageError extends BrigadeError {
  constructor(message: string, details?: unknown) {
    super('STORAGE_ERROR', message, details);
    this.name = 'StorageError';
  }
}

export class MemoryError extends BrigadeError {
  constructor(message: string, details?: unknown) {
    super('MEMORY_ERROR', message, details);
    this.name = 'MemoryError';
  }
}

export class ChannelError extends BrigadeError {
  constructor(message: string, details?: unknown) {
    super('CHANNEL_ERROR', message, details);
    this.name = 'ChannelError';
  }
}

export class TimeoutError extends BrigadeError {
  constructor(taskName: string, timeoutMs: number) {
    super('TIMEOUT_ERROR', `Task "${taskName}" timed out after ${timeoutMs}ms`, { taskName, timeoutMs });
    this.name = 'TimeoutError';
  }
}

export class ApprovalTimeoutError extends BrigadeError {
  constructor(stepName: string) {
    super('APPROVAL_TIMEOUT', `Approval gate "${stepName}" timed out`, { stepName });
    this.name = 'ApprovalTimeoutError';
  }
}
