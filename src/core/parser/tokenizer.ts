/**
 * DocuCraft Markup Language Tokenizer
 *
 * Tokenizes DocuCraft markup into a stream of tokens.
 *
 * Syntax examples:
 *   [[VariableName: Text]]              — variable declaration
 *   [[VariableName: Choice("A","B")]]   — choice variable
 *   {{Condition "Question?" => yes text | no text}}  — conditional block
 *   <%section Title%> ... <%/section%>  — section markers
 *   [[_ HiddenVar: Text = "value"]]     — hidden variable
 */

export enum TokenType {
  Text = 'Text',
  VariableOpen = 'VariableOpen',    // [[
  VariableClose = 'VariableClose',  // ]]
  CondOpen = 'CondOpen',            // {{
  CondClose = 'CondClose',          // }}
  SectionOpen = 'SectionOpen',      // <%section ... %>
  SectionClose = 'SectionClose',    // <%/section%>
  Pipe = 'Pipe',                    // | (in conditionals)
  Arrow = 'Arrow',                  // =>
  Colon = 'Colon',                  // :
  Equals = 'Equals',                // =
  StringLiteral = 'StringLiteral',  // "..."
  Identifier = 'Identifier',        // alphanumeric + spaces
  Comma = 'Comma',                  // ,
  OpenParen = 'OpenParen',          // (
  CloseParen = 'CloseParen',        // )
  EOF = 'EOF',
}

export interface Token {
  type: TokenType;
  value: string;
  position: number;
  line: number;
  column: number;
}

export class TokenizerError extends Error {
  constructor(
    message: string,
    public readonly position: number,
    public readonly line: number,
    public readonly column: number,
  ) {
    super(`Tokenizer error at line ${line}:${column} - ${message}`);
    this.name = 'TokenizerError';
  }
}

export class Tokenizer {
  private pos = 0;
  private line = 1;
  private column = 1;
  private tokens: Token[] = [];

  constructor(private source: string) {}

  tokenize(): Token[] {
    this.tokens = [];
    this.pos = 0;
    this.line = 1;
    this.column = 1;

    while (this.pos < this.source.length) {
      this.readNext();
    }

    this.tokens.push(this.makeToken(TokenType.EOF, ''));
    return this.tokens;
  }

  private readNext(): void {
    // Variable open [[
    if (this.match('[[')) {
      this.tokens.push(this.makeToken(TokenType.VariableOpen, '[['));
      this.advance(2);
      this.readVariableContent();
      return;
    }

    // Conditional open {{
    if (this.match('{{')) {
      this.tokens.push(this.makeToken(TokenType.CondOpen, '{{'));
      this.advance(2);
      this.readConditionalContent();
      return;
    }

    // Section open <%section ... %>
    if (this.match('<%section')) {
      this.readSectionOpen();
      return;
    }

    // Section close <%/section%>
    if (this.match('<%/section%>')) {
      this.tokens.push(this.makeToken(TokenType.SectionClose, '<%/section%>'));
      this.advance(12);
      return;
    }

    // Regular text — collect until next special sequence
    this.readText();
  }

  private readVariableContent(): void {
    // Inside [[ ... ]] — tokenize name, colon, type, options, ]]
    while (this.pos < this.source.length) {
      this.skipWhitespace();

      if (this.match(']]')) {
        this.tokens.push(this.makeToken(TokenType.VariableClose, ']]'));
        this.advance(2);
        return;
      }

      if (this.match(':')) {
        this.tokens.push(this.makeToken(TokenType.Colon, ':'));
        this.advance(1);
        continue;
      }

      if (this.match('=')) {
        this.tokens.push(this.makeToken(TokenType.Equals, '='));
        this.advance(1);
        continue;
      }

      if (this.match(',')) {
        this.tokens.push(this.makeToken(TokenType.Comma, ','));
        this.advance(1);
        continue;
      }

      if (this.match('(')) {
        this.tokens.push(this.makeToken(TokenType.OpenParen, '('));
        this.advance(1);
        continue;
      }

      if (this.match(')')) {
        this.tokens.push(this.makeToken(TokenType.CloseParen, ')'));
        this.advance(1);
        continue;
      }

      if (this.match('"') || this.match("'")) {
        this.readStringLiteral();
        continue;
      }

      // Identifier (variable name or type name)
      const ident = this.readIdentifier();
      if (ident) {
        this.tokens.push(this.makeToken(TokenType.Identifier, ident));
        continue;
      }

      // Skip unknown character inside variable
      this.advance(1);
    }
  }

  private readConditionalContent(): void {
    // Inside {{ ... }} — tokenize condition name, =>, pipe, }}
    while (this.pos < this.source.length) {
      if (this.match('}}')) {
        this.tokens.push(this.makeToken(TokenType.CondClose, '}}'));
        this.advance(2);
        return;
      }

      if (this.match('=>')) {
        this.tokens.push(this.makeToken(TokenType.Arrow, '=>'));
        this.advance(2);
        // After =>, read content until | or }}
        this.readConditionalBranch();
        continue;
      }

      if (this.match('|')) {
        this.tokens.push(this.makeToken(TokenType.Pipe, '|'));
        this.advance(1);
        // After |, read else branch until }}
        this.readConditionalBranch();
        continue;
      }

      if (this.match('"') || this.match("'")) {
        this.readStringLiteral();
        continue;
      }

      const ch = this.source[this.pos];
      if (ch !== undefined) {
        // Collect identifier-like content (condition name / question)
        const ident = this.readConditionalHead();
        if (ident) {
          this.tokens.push(this.makeToken(TokenType.Identifier, ident));
          continue;
        }
      }

      this.advance(1);
    }
  }

  private readConditionalBranch(): void {
    // Read text content that may contain nested [[ ]] or {{ }}
    const start = this.pos;
    let depth = 1; // track {{ depth
    let text = '';

    while (this.pos < this.source.length) {
      if (this.match('{{')) {
        depth++;
        text += '{{';
        this.advance(2);
        continue;
      }
      if (this.match('}}')) {
        if (depth === 1) {
          // Don't consume — outer loop handles }}
          break;
        }
        depth--;
        text += '}}';
        this.advance(2);
        continue;
      }
      if (this.match('|') && depth === 1) {
        break;
      }
      text += this.source[this.pos];
      this.advanceOne();
    }

    if (text.trim()) {
      this.tokens.push(this.makeToken(TokenType.Text, text));
    }
    void start;
  }

  private readConditionalHead(): string {
    // Read identifier-like content for condition name and question
    let result = '';
    while (this.pos < this.source.length) {
      const ch = this.source[this.pos];
      if (ch === undefined) break;
      if (this.match('=>') || this.match('}}') || this.match('|')) break;
      result += ch;
      this.advanceOne();
    }
    return result.trim();
  }

  private readSectionOpen(): void {
    // <%section Title%>
    const start = this.pos;
    let raw = '';
    while (this.pos < this.source.length) {
      if (this.match('%>')) {
        raw += '%>';
        this.advance(2);
        break;
      }
      raw += this.source[this.pos];
      this.advanceOne();
    }
    // Extract title from <%section TITLE%>
    const titleMatch = raw.match(/^<%section\s+(.+?)%>$/);
    const title = titleMatch ? titleMatch[1].trim() : '';
    this.tokens.push(this.makeToken(TokenType.SectionOpen, title));
    void start;
  }

  private readText(): void {
    let text = '';
    const start = this.pos;

    while (this.pos < this.source.length) {
      if (
        this.match('[[') ||
        this.match('{{') ||
        this.match('<%section') ||
        this.match('<%/section%>')
      ) {
        break;
      }
      text += this.source[this.pos];
      this.advanceOne();
    }

    if (text) {
      this.tokens.push(this.makeToken(TokenType.Text, text, start));
    }
  }

  private readStringLiteral(): void {
    const quote = this.source[this.pos];
    this.advance(1); // skip opening quote
    let str = '';

    while (this.pos < this.source.length) {
      const ch = this.source[this.pos];
      if (ch === '\\') {
        this.advance(1);
        const escaped = this.source[this.pos];
        if (escaped !== undefined) {
          str += escaped === 'n' ? '\n' : escaped === 't' ? '\t' : escaped;
          this.advance(1);
        }
        continue;
      }
      if (ch === quote) {
        this.advance(1); // skip closing quote
        break;
      }
      str += ch;
      this.advanceOne();
    }

    this.tokens.push(this.makeToken(TokenType.StringLiteral, str));
  }

  private readIdentifier(): string {
    let ident = '';
    while (this.pos < this.source.length) {
      const ch = this.source[this.pos];
      if (ch === undefined) break;
      if (/[a-zA-Z0-9_\s]/.test(ch)) {
        // Don't allow leading/internal double-spaces
        ident += ch;
        this.advanceOne();
      } else {
        break;
      }
    }
    return ident.trim();
  }

  private match(str: string): boolean {
    return this.source.startsWith(str, this.pos);
  }

  private advance(n: number): void {
    for (let i = 0; i < n; i++) {
      this.advanceOne();
    }
  }

  private advanceOne(): void {
    if (this.pos < this.source.length) {
      if (this.source[this.pos] === '\n') {
        this.line++;
        this.column = 1;
      } else {
        this.column++;
      }
      this.pos++;
    }
  }

  private skipWhitespace(): void {
    while (this.pos < this.source.length && /\s/.test(this.source[this.pos]!)) {
      this.advanceOne();
    }
  }

  private makeToken(type: TokenType, value: string, pos?: number): Token {
    return {
      type,
      value,
      position: pos ?? this.pos,
      line: this.line,
      column: this.column,
    };
  }
}
