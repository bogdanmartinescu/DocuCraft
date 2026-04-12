/**
 * DocuCraft Variable Type System
 * Defines all supported variable types for legal document templates.
 */

export enum VariableKind {
  Text = 'Text',
  LargeText = 'LargeText',
  Number = 'Number',
  Date = 'Date',
  DateTime = 'DateTime',
  YesNo = 'YesNo',
  Choice = 'Choice',
  Collection = 'Collection',
  Address = 'Address',
  EthAddress = 'EthAddress',
  Identity = 'Identity',
  Signature = 'Signature',
  Image = 'Image',
  Period = 'Period',
  Structure = 'Structure',
  Template = 'Template',
  Section = 'Section',
  Validation = 'Validation',
  Hidden = 'Hidden',
}

export interface BaseVariableDef {
  name: string;
  kind: VariableKind;
  label?: string;
  description?: string;
  required?: boolean;
  defaultValue?: unknown;
}

export interface TextVariableDef extends BaseVariableDef {
  kind: VariableKind.Text | VariableKind.LargeText;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

export interface NumberVariableDef extends BaseVariableDef {
  kind: VariableKind.Number;
  min?: number;
  max?: number;
  precision?: number;
  unit?: string;
}

export interface DateVariableDef extends BaseVariableDef {
  kind: VariableKind.Date | VariableKind.DateTime;
  minDate?: string;
  maxDate?: string;
  format?: string;
}

export interface YesNoVariableDef extends BaseVariableDef {
  kind: VariableKind.YesNo;
}

export interface ChoiceVariableDef extends BaseVariableDef {
  kind: VariableKind.Choice;
  options: string[];
}

export interface CollectionVariableDef extends BaseVariableDef {
  kind: VariableKind.Collection;
  itemType: VariableDef;
}

export interface AddressVariableDef extends BaseVariableDef {
  kind: VariableKind.Address | VariableKind.EthAddress;
}

export interface IdentityVariableDef extends BaseVariableDef {
  kind: VariableKind.Identity;
  fields?: string[];
}

export interface SignatureVariableDef extends BaseVariableDef {
  kind: VariableKind.Signature;
  signatoryVariable: string;
}

export interface PeriodVariableDef extends BaseVariableDef {
  kind: VariableKind.Period;
  allowedUnits?: PeriodUnit[];
}

export interface StructureVariableDef extends BaseVariableDef {
  kind: VariableKind.Structure;
  fields: VariableDef[];
}

export interface TemplateVariableDef extends BaseVariableDef {
  kind: VariableKind.Template;
  templateId: string;
}

export interface SectionVariableDef extends BaseVariableDef {
  kind: VariableKind.Section;
  variables: string[];
}

export interface HiddenVariableDef extends BaseVariableDef {
  kind: VariableKind.Hidden;
  value: string;
}

export interface ValidationVariableDef extends BaseVariableDef {
  kind: VariableKind.Validation;
  expression: string;
  errorMessage: string;
}

export interface ImageVariableDef extends BaseVariableDef {
  kind: VariableKind.Image;
  maxSizeBytes?: number;
  allowedFormats?: string[];
}

export type VariableDef =
  | TextVariableDef
  | NumberVariableDef
  | DateVariableDef
  | YesNoVariableDef
  | ChoiceVariableDef
  | CollectionVariableDef
  | AddressVariableDef
  | IdentityVariableDef
  | SignatureVariableDef
  | PeriodVariableDef
  | StructureVariableDef
  | TemplateVariableDef
  | SectionVariableDef
  | HiddenVariableDef
  | ValidationVariableDef
  | ImageVariableDef;

export type PeriodUnit = 'days' | 'weeks' | 'months' | 'years';

export interface PeriodValue {
  amount: number;
  unit: PeriodUnit;
}

export interface AddressValue {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface IdentityValue {
  name: string;
  email: string;
  company?: string;
  title?: string;
}

export type VariableValue =
  | string
  | number
  | boolean
  | Date
  | PeriodValue
  | AddressValue
  | IdentityValue
  | VariableValue[]
  | Record<string, VariableValue>
  | null
  | undefined;

export type VariableMap = Record<string, VariableValue>;

/**
 * Parse a variable type string into a VariableKind enum value.
 */
export function parseVariableKind(typeStr: string): VariableKind {
  const normalized = typeStr.trim();
  const found = Object.values(VariableKind).find(
    (k) => k.toLowerCase() === normalized.toLowerCase()
  );
  if (!found) {
    throw new Error(`Unknown variable type: "${typeStr}"`);
  }
  return found as VariableKind;
}

/**
 * Validate a value against its variable definition.
 */
export function validateVariableValue(
  def: VariableDef,
  value: VariableValue
): string[] {
  const errors: string[] = [];

  if (def.required && (value === null || value === undefined || value === '')) {
    errors.push(`Variable "${def.name}" is required`);
    return errors;
  }

  if (value === null || value === undefined) {
    return errors;
  }

  switch (def.kind) {
    case VariableKind.Text:
    case VariableKind.LargeText: {
      const textDef = def as TextVariableDef;
      const str = String(value);
      if (textDef.minLength !== undefined && str.length < textDef.minLength) {
        errors.push(`"${def.name}" must be at least ${textDef.minLength} characters`);
      }
      if (textDef.maxLength !== undefined && str.length > textDef.maxLength) {
        errors.push(`"${def.name}" must be at most ${textDef.maxLength} characters`);
      }
      if (textDef.pattern && !new RegExp(textDef.pattern).test(str)) {
        errors.push(`"${def.name}" does not match required pattern`);
      }
      break;
    }
    case VariableKind.Number: {
      const numDef = def as NumberVariableDef;
      const num = Number(value);
      if (isNaN(num)) {
        errors.push(`"${def.name}" must be a valid number`);
        break;
      }
      if (numDef.min !== undefined && num < numDef.min) {
        errors.push(`"${def.name}" must be at least ${numDef.min}`);
      }
      if (numDef.max !== undefined && num > numDef.max) {
        errors.push(`"${def.name}" must be at most ${numDef.max}`);
      }
      break;
    }
    case VariableKind.Choice: {
      const choiceDef = def as ChoiceVariableDef;
      if (!choiceDef.options.includes(String(value))) {
        errors.push(`"${def.name}" must be one of: ${choiceDef.options.join(', ')}`);
      }
      break;
    }
    case VariableKind.EthAddress: {
      const addr = String(value);
      if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) {
        errors.push(`"${def.name}" must be a valid Ethereum address`);
      }
      break;
    }
    case VariableKind.Identity: {
      const identity = value as IdentityValue;
      if (!identity.name || !identity.email) {
        errors.push(`"${def.name}" must have name and email`);
      }
      if (identity.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identity.email)) {
        errors.push(`"${def.name}" has invalid email address`);
      }
      break;
    }
  }

  return errors;
}
