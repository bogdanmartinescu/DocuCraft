/**
 * DocuCraft Markup Language Parser
 *
 * Converts a stream of tokens into an AST.
 */

import { Token, TokenType, Tokenizer } from './tokenizer';
import {
  ASTNode,
  ConditionalNode,
  DocumentNode,
  NodeType,
  SectionNode,
  TextNode,
  VariableNode,
} from './ast';

export class ParseError extends Error {
  constructor(
    message: string,
    public readonly token: Token,
  ) {
    super(`Parse error at line ${token.line}:${token.column} - ${message}`);
    this.name = 'ParseError';
  }
}

export class Parser {
  private tokens: Token[] = [];
  private pos = 0;

  parse(source: string): DocumentNode {
    const tokenizer = new Tokenizer(source);
    this.tokens = tokenizer.tokenize();
    this.pos = 0;

    const children: ASTNode[] = [];

    while (!this.isEOF()) {
      const node = this.parseNode();
      if (node) children.push(node);
    }

    return { type: NodeType.Document, children };
  }

  private parseNode(): ASTNode | null {
    const token = this.current();

    switch (token.type) {
      case TokenType.Text:
        return this.parseText();
      case TokenType.VariableOpen:
        return this.parseVariable();
      case TokenType.CondOpen:
        return this.parseConditional();
      case TokenType.SectionOpen:
        return this.parseSection();
      case TokenType.SectionClose:
        return null; // caller handles
      default:
        this.advance();
        return null;
    }
  }

  private parseText(): TextNode {
    const token = this.consume(TokenType.Text);
    return { type: NodeType.Text, value: token.value, position: token.position };
  }

  private parseVariable(): VariableNode {
    this.consume(TokenType.VariableOpen);

    let hidden = false;
    let name = '';
    let variableType = '';
    let baseType = '';
    const typeParams: string[] = [];
    let defaultValue: string | undefined;

    // Check for hidden variable marker _
    if (this.check(TokenType.Identifier) && this.current().value === '_') {
      hidden = true;
      this.advance();
    }

    // Variable name
    if (this.check(TokenType.Identifier)) {
      name = this.consume(TokenType.Identifier).value;
    }

    // Colon separating name from type
    if (this.check(TokenType.Colon)) {
      this.advance();

      // Type identifier
      if (this.check(TokenType.Identifier)) {
        baseType = this.consume(TokenType.Identifier).value;
        variableType = baseType;
      }

      // Optional type params: (...)
      if (this.check(TokenType.OpenParen)) {
        this.advance(); // consume (
        while (!this.check(TokenType.CloseParen) && !this.isEOF()) {
          if (this.check(TokenType.StringLiteral)) {
            typeParams.push(this.consume(TokenType.StringLiteral).value);
          } else if (this.check(TokenType.Identifier)) {
            typeParams.push(this.consume(TokenType.Identifier).value);
          } else if (this.check(TokenType.Comma)) {
            this.advance();
          } else {
            this.advance();
          }
        }
        if (this.check(TokenType.CloseParen)) this.advance();
        variableType = `${baseType}(${typeParams.map((p) => `"${p}"`).join(', ')})`;
      }

      // Optional default value: = "value"
      if (this.check(TokenType.Equals)) {
        this.advance();
        if (this.check(TokenType.StringLiteral)) {
          defaultValue = this.consume(TokenType.StringLiteral).value;
        } else if (this.check(TokenType.Identifier)) {
          defaultValue = this.consume(TokenType.Identifier).value;
        }
      }
    }

    if (this.check(TokenType.VariableClose)) {
      this.advance();
    }

    return {
      type: NodeType.Variable,
      name,
      variableType,
      baseType,
      typeParams,
      defaultValue,
      hidden,
      options: [],
    };
  }

  private parseConditional(): ConditionalNode {
    this.consume(TokenType.CondOpen);

    let name = '';
    let question = '';
    let condition = '';

    // Read the condition head (name + question)
    if (this.check(TokenType.Identifier)) {
      const head = this.consume(TokenType.Identifier).value;
      // Head may be: "ConditionName" or "ConditionName "Question?""
      const parts = head.split(/"([^"]+)"/).filter(Boolean);
      name = parts[0]?.trim() ?? head;
      question = parts[1]?.trim() ?? '';
      condition = name;
    }

    // => separates condition from true branch
    const trueBranch: ASTNode[] = [];
    const falseBranch: ASTNode[] = [];

    if (this.check(TokenType.Arrow)) {
      this.advance();
    }

    // True branch text
    if (this.check(TokenType.Text)) {
      const text = this.consume(TokenType.Text).value;
      if (text.trim()) {
        trueBranch.push({ type: NodeType.Text, value: text });
      }
    }

    // Optional false branch after |
    if (this.check(TokenType.Pipe)) {
      this.advance();
      if (this.check(TokenType.Text)) {
        const text = this.consume(TokenType.Text).value;
        if (text.trim()) {
          falseBranch.push({ type: NodeType.Text, value: text });
        }
      }
    }

    if (this.check(TokenType.CondClose)) {
      this.advance();
    }

    return {
      type: NodeType.Conditional,
      name,
      question,
      condition,
      trueBranch,
      falseBranch,
    };
  }

  private parseSection(): SectionNode {
    const titleToken = this.consume(TokenType.SectionOpen);
    const title = titleToken.value;
    const children: ASTNode[] = [];

    while (!this.isEOF() && !this.check(TokenType.SectionClose)) {
      const node = this.parseNode();
      if (node) children.push(node);
    }

    if (this.check(TokenType.SectionClose)) {
      this.advance();
    }

    return { type: NodeType.Section, title, children };
  }

  // ---- Token helpers ----

  private current(): Token {
    return this.tokens[this.pos] ?? { type: TokenType.EOF, value: '', position: 0, line: 0, column: 0 };
  }

  private advance(): Token {
    const token = this.current();
    if (!this.isEOF()) this.pos++;
    return token;
  }

  private consume(type: TokenType): Token {
    const token = this.current();
    if (token.type !== type) {
      throw new ParseError(`Expected ${type} but got ${token.type} ("${token.value}")`, token);
    }
    this.pos++;
    return token;
  }

  private check(type: TokenType): boolean {
    return this.current().type === type;
  }

  private isEOF(): boolean {
    return this.current().type === TokenType.EOF;
  }
}
