/**
 * DocuCraft AST (Abstract Syntax Tree)
 * Node types produced by the parser from the markup language.
 */

export enum NodeType {
  Document = 'Document',
  Text = 'Text',
  Variable = 'Variable',
  Conditional = 'Conditional',
  Section = 'Section',
  Collection = 'Collection',
}

export interface BaseNode {
  type: NodeType;
  position?: number;
}

export interface DocumentNode extends BaseNode {
  type: NodeType.Document;
  children: ASTNode[];
}

export interface TextNode extends BaseNode {
  type: NodeType.Text;
  value: string;
}

export interface VariableOption {
  key: string;
  value: string;
}

export interface VariableNode extends BaseNode {
  type: NodeType.Variable;
  name: string;
  variableType: string;     // "Text", "Number", "Choice(...)", etc.
  baseType: string;         // Just the type without params: "Choice"
  typeParams: string[];     // Params inside parens: ["A", "B"]
  defaultValue?: string;
  hidden: boolean;
  options: VariableOption[];
}

export interface ConditionalNode extends BaseNode {
  type: NodeType.Conditional;
  name: string;
  question: string;
  condition: string;        // Condition expression (variable name or expression)
  trueBranch: ASTNode[];    // Content when condition is true
  falseBranch: ASTNode[];   // Content when condition is false (after |)
}

export interface SectionNode extends BaseNode {
  type: NodeType.Section;
  title: string;
  children: ASTNode[];
}

export type ASTNode =
  | DocumentNode
  | TextNode
  | VariableNode
  | ConditionalNode
  | SectionNode;
