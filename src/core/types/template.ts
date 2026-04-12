/**
 * DocuCraft Template Types
 * Core data structures for templates and agreements.
 */

import { VariableDef, VariableMap } from './variables';

export interface Template {
  id: string;
  name: string;
  description?: string;
  version: string;
  content: string;           // Raw markup source
  variables: VariableDef[];  // Extracted variable definitions
  sections?: Section[];
  metadata: TemplateMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateMetadata {
  author?: string;
  tags?: string[];
  jurisdiction?: string;
  category?: TemplateCategory;
  language?: string;
  effectiveDate?: string;
}

export enum TemplateCategory {
  Employment = 'Employment',
  NDA = 'NDA',
  ServiceAgreement = 'ServiceAgreement',
  SalesContract = 'SalesContract',
  LicenseAgreement = 'LicenseAgreement',
  Partnership = 'Partnership',
  Consulting = 'Consulting',
  Lease = 'Lease',
  Loan = 'Loan',
  Custom = 'Custom',
}

export interface Section {
  id: string;
  title: string;
  description?: string;
  variables: string[];      // Variable names in this section
  order: number;
}

export interface Agreement {
  id: string;
  templateId: string;
  templateVersion: string;
  title: string;
  status: AgreementStatus;
  parameters: VariableMap;   // Filled-in variable values
  parties: Party[];
  signatures: SignatureRecord[];
  renderedContent?: string;  // Final rendered document
  metadata: AgreementMetadata;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  signedAt?: string;
}

export enum AgreementStatus {
  Draft = 'Draft',
  PendingSignature = 'PendingSignature',
  PartiallySign = 'PartiallySign',
  FullySigned = 'FullySigned',
  Expired = 'Expired',
  Voided = 'Voided',
}

export interface Party {
  id: string;
  role: string;              // e.g., "Employer", "Employee", "Service Provider"
  identity: PartyIdentity;
  mustSign: boolean;
  signedAt?: string;
}

export interface PartyIdentity {
  name: string;
  email: string;
  company?: string;
  title?: string;
  address?: string;
}

export interface SignatureRecord {
  partyId: string;
  signatoryName: string;
  signatoryEmail: string;
  signatureHash: string;     // Hash of the signed content
  timestamp: string;
  ipAddress?: string;
  method: SignatureMethod;
  verified: boolean;
}

export enum SignatureMethod {
  Electronic = 'Electronic',
  Cryptographic = 'Cryptographic',
}

export interface AgreementMetadata {
  jurisdiction?: string;
  governingLaw?: string;
  tags?: string[];
  notes?: string;
}

export interface ExecutionResult {
  success: boolean;
  renderedContent: string;
  variables: VariableMap;
  errors: string[];
  warnings: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  variables: VariableDef[];
}
