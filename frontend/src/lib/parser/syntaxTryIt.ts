import type { Token } from '../../types';
import { generateParseSteps } from './parseSimulator';

// ── Tiny frontend Java tokenizer + parser for Syntax Try It ──
// Supports single statements/expressions for instant live visualization without backend.
// Tokens get synthetic positions (line 1, col = index) so parseSimulator can anchor them.

const KEYWORDS = new Set(['int','String','class','void','if','else','while','for','return','public','private','static','final','true','false','null','new','this']);

function classifyToken(value: string): { type: string; category?: string } {
  if (KEYWORDS.has(value)) return { type: 'KEYWORD', category: 'KEYWORD' };
  if (/^[0-9]+$/.test(value)) return { type: 'INTEGER_LITERAL', category: 'LITERAL' };
  if (/^".*"$/.test(value) || /^'.*'$/.test(value)) return { type: 'STRING_LITERAL', category: 'LITERAL' };
  if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) return { type: 'IDENTIFIER', category: 'IDENTIFIER' };
  if (['+','-','*','/','%','=', '==','!=','<=','>=','&&','||','!','<','>'].includes(value)) return { type: 'OPERATOR', category: 'OPERATOR' };
  return { type: 'SEPARATOR', category: 'SEPARATOR' };
}

export function tokenizeTryIt(code: string): Token[] {
  const tokens: Token[] = [];
  // Regex: strings, multi-char ops, identifiers/keywords, numbers, single chars
  // eslint-disable-next-line no-useless-escape
  const re = /\/\/.*|\/\*[\s\S]*?\*\/|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|==|!=|<=|>=|&&|\|\||[a-zA-Z_][a-zA-Z0-9_]*|[0-9]+|[{}()\[\];,.+\-*/%=<>!&|~^?:@]|\s+/g;
  let col = 1;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) {
    const raw = m[0];
    if (/^\s+$/.test(raw) || raw.startsWith('//') || raw.startsWith('/*')) {
      col += raw.length;
      continue;
    }
    const cls = classifyToken(raw);
    tokens.push({
      type: cls.type,
      value: raw,
      line: 1,
      column: col,
      length: raw.length,
      category: cls.category,
    } as Token);
    col += raw.length;
  }
  return tokens;
}

interface MiniNode {
  type: string;
  name?: string;
  value?: string;
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
  children?: MiniNode[];
}

function mkNode(type: string, children: MiniNode[] = [], extra: Partial<MiniNode> = {}): MiniNode {
  const line = children[0]?.line ?? 1;
  const col = children[0]?.column ?? 1;
  const endLine = children.length ? (children[children.length - 1].endLine) : line;
  const endCol = children.length ? (children[children.length - 1].endColumn) : col + 1;
  return { type, line, column: col, endLine, endColumn: endCol, children: children.length ? children : undefined, ...extra };
}

// Recursive descent for tiny expression/statement language
class Parser {
  tokens: Token[];
  pos = 0;
  constructor(tokens: Token[]) { this.tokens = tokens; }
  peek(): Token | undefined { return this.tokens[this.pos]; }
  peekVal(): string | undefined { return this.peek()?.value; }
  consume(): Token | undefined { return this.tokens[this.pos++]; }
  expect(val: string): boolean {
    if (this.peekVal() === val) { this.pos++; return true; }
    return false;
  }

  parsePrimary(): MiniNode | null {
    const t = this.peek();
    if (!t) return null;
    if (t.value === '(') {
      const lParen = this.consume()!;
      const inner = this.parseExpr();
      const rParen = this.expect(')') ? this.tokens[this.pos - 1] : undefined;
      if (!inner) return null;
      const lp: MiniNode = { type: 'Separator', line: lParen.line, column: lParen.column, endLine: lParen.line, endColumn: lParen.column + 1, children: undefined, value: '(' };
      const rp: MiniNode | undefined = rParen ? { type: 'Separator', line: rParen.line, column: rParen.column, endLine: rParen.line, endColumn: rParen.column + 1, children: undefined, value: ')' } : undefined;
      const kids = rp ? [lp, inner, rp] : [lp, inner];
      return mkNode('PrimaryExpr', kids);
    }
    if (/^[a-zA-Z_]/.test(t.value) || /^[0-9]/.test(t.value)) {
      const tok = this.consume()!;
      const kind = /^[0-9]/.test(tok.value) ? 'IntegerLiteralExpr' : 'NameExpr';
      return { type: kind, line: tok.line, column: tok.column, endLine: tok.line, endColumn: tok.column + tok.length, children: undefined, value: tok.value, name: tok.value };
    }
    return null;
  }

  parseMultiplicative(): MiniNode | null {
    let left = this.parsePrimary();
    if (!left) return null;
    while (this.peekVal() === '*' || this.peekVal() === '/' || this.peekVal() === '%') {
      const op = this.consume()!;
      const right = this.parsePrimary();
      if (!right) break;
      const opNode: MiniNode = { type: 'Operator', line: op.line, column: op.column, endLine: op.line, endColumn: op.column + op.length, children: undefined, value: op.value };
      left = { type: 'BinaryExpr', line: left.line, column: left.column, endLine: right.endLine, endColumn: right.endColumn, children: [left, opNode, right] };
    }
    return left;
  }

  parseAdditive(): MiniNode | null {
    let left = this.parseMultiplicative();
    if (!left) return null;
    while (this.peekVal() === '+' || this.peekVal() === '-') {
      const op = this.consume()!;
      const right = this.parseMultiplicative();
      if (!right) break;
      const opNode: MiniNode = { type: 'Operator', line: op.line, column: op.column, endLine: op.line, endColumn: op.column + op.length, children: undefined, value: op.value };
      left = { type: 'BinaryExpr', line: left.line, column: left.column, endLine: right.endLine, endColumn: right.endColumn, children: [left, opNode, right] };
    }
    return left;
  }

  parseComparison(): MiniNode | null {
    let left = this.parseAdditive();
    if (!left) return null;
    while (['<','>','<=','>=','==','!='].includes(this.peekVal() ?? '')) {
      const op = this.consume()!;
      const right = this.parseAdditive();
      if (!right) break;
      const opNode: MiniNode = { type: 'Operator', line: op.line, column: op.column, endLine: op.line, endColumn: op.column + op.length, children: undefined, value: op.value };
      left = { type: 'BinaryExpr', line: left.line, column: left.column, endLine: right.endLine, endColumn: right.endColumn, children: [left, opNode, right] };
    }
    return left;
  }

  parseExpr(): MiniNode | null {
    let left = this.parseComparison();
    if (!left) return null;
    // assignment right-assoc: a = b = c
    if (this.peekVal() === '=') {
      const op = this.consume()!;
      const right = this.parseExpr();
      if (!right) return left;
      const opNode: MiniNode = { type: 'Operator', line: op.line, column: op.column, endLine: op.line, endColumn: op.column + op.length, children: undefined, value: '=' };
      left = { type: 'AssignExpr', line: left.line, column: left.column, endLine: right.endLine, endColumn: right.endColumn, children: [left, opNode, right] };
    }
    // logical && ||
    if (this.peekVal() === '&&' || this.peekVal() === '||') {
      const op = this.consume()!;
      const right = this.parseComparison();
      if (!right) return left;
      const opNode: MiniNode = { type: 'Operator', line: op.line, column: op.column, endLine: op.line, endColumn: op.column + op.length, children: undefined, value: op.value };
      left = { type: 'BinaryExpr', line: left.line, column: left.column, endLine: right.endLine, endColumn: right.endColumn, children: [left, opNode, right] };
    }
    return left;
  }

  parseStmt(): MiniNode | null {
    const t = this.peek();
    if (!t) return null;
    // if statement
    if (t.value === 'if') {
      const ifTok = this.consume()!;
      this.expect('(');
      const cond = this.parseExpr();
      this.expect(')');
      const thenStmt = this.parseStmt();
      let elseStmt: MiniNode | undefined;
      if (this.peekVal() === 'else') {
        this.consume();
        elseStmt = this.parseStmt() ?? undefined;
      }
      const kids: MiniNode[] = [];
      kids.push({ type: 'Keyword', line: ifTok.line, column: ifTok.column, endLine: ifTok.line, endColumn: ifTok.column + 2, value: 'if' });
      if (cond) kids.push(cond);
      if (thenStmt) kids.push(thenStmt);
      if (elseStmt) kids.push(elseStmt);
      return mkNode('IfStmt', kids);
    }
    if (t.value === 'while') {
      const w = this.consume()!;
      this.expect('(');
      const cond = this.parseExpr();
      this.expect(')');
      const body = this.parseStmt();
      const kids: MiniNode[] = [{ type: 'Keyword', line: w.line, column: w.column, endLine: w.line, endColumn: w.column + 5, value: 'while' }];
      if (cond) kids.push(cond);
      if (body) kids.push(body);
      return mkNode('WhileStmt', kids);
    }
    if (t.value === 'return') {
      const r = this.consume()!;
      const expr = this.parseExpr();
      this.expect(';');
      const kids: MiniNode[] = [{ type: 'Keyword', line: r.line, column: r.column, endLine: r.line, endColumn: r.column + 6, value: 'return' }];
      if (expr) kids.push(expr);
      return mkNode('ReturnStmt', kids);
    }
    // variable declaration: int/String etc.
    if (['int','String','boolean','double','float','char'].includes(t.value)) {
      const typeTok = this.consume()!;
      const nameTok = this.peek();
      if (nameTok && /^[a-zA-Z_]/.test(nameTok.value)) {
        const name = this.consume()!;
        let init: MiniNode | undefined;
        if (this.peekVal() === '=') {
          this.consume();
          init = this.parseExpr() ?? undefined;
        }
        this.expect(';');
        const typeNode: MiniNode = { type: 'Type', line: typeTok.line, column: typeTok.column, endLine: typeTok.line, endColumn: typeTok.column + typeTok.length, value: typeTok.value };
        const nameNode: MiniNode = { type: 'VariableDeclarator', line: name.line, column: name.column, endLine: name.line, endColumn: name.column + name.length, value: name.value, name: name.value, children: init ? [init] : undefined };
        return mkNode('FieldDeclaration', [typeNode, nameNode]);
      }
    }
    // expression statement: expr ;
    const expr = this.parseExpr();
    if (expr) {
      this.expect(';');
      return mkNode('ExpressionStmt', [expr]);
    }
    return null;
  }

  parseProgram(): MiniNode {
    const stmts: MiniNode[] = [];
    while (this.pos < this.tokens.length) {
      const stmt = this.parseStmt();
      if (stmt) stmts.push(stmt);
      else {
        // skip one token to avoid infinite loop
        this.pos++;
      }
    }
    if (stmts.length === 0) {
      // fallback: treat remaining tokens as raw children
      const leaves: MiniNode[] = this.tokens.map(t => ({ type: 'NameExpr', line: t.line, column: t.column, endLine: t.line, endColumn: t.column + t.length, value: t.value }));
      return { type: 'CompilationUnit', line: 1, column: 1, endLine: 1, endColumn: 50, children: leaves };
    }
    return { type: 'CompilationUnit', line: 1, column: 1, endLine: 1, endColumn: 100, children: stmts };
  }
}

function toAstJson(root: MiniNode): string {
  // Convert MiniNode to the shape AstTreeAnimation expects (type, name, value, children)
  function conv(n: MiniNode): Record<string, unknown> {
    return {
      type: n.type,
      name: n.name,
      value: n.value,
      line: n.line,
      column: n.column,
      endLine: n.endLine,
      endColumn: n.endColumn,
      children: n.children?.map(conv),
    };
  }
  return JSON.stringify(conv(root));
}

export interface SyntaxTryItData {
  tokens: Token[];
  astJson: string;
  parseSteps: ReturnType<typeof generateParseSteps>;
  usedRuleIds: Set<string>;
  currentRuleId?: string;
}

export function buildSyntaxTryItData(code: string): SyntaxTryItData | null {
  const tokens = tokenizeTryIt(code);
  if (tokens.length === 0) return null;
  const parser = new Parser(tokens);
  const astRoot = parser.parseProgram();
  const astJson = toAstJson(astRoot);
  const parseSteps = generateParseSteps(tokens, astJson);
  const used = new Set<string>();
  for (const s of parseSteps) for (const id of s.usedRules) used.add(id);
  const currentRuleId = [...parseSteps].reverse().find(s => s.action.type === 'REDUCE')?.action.rule?.id;
  return { tokens, astJson, parseSteps, usedRuleIds: used, currentRuleId };
}

export const SYNTAX_TRYIT_PRESETS = [
  'int x = a + b * c;',
  'x = a + b * c;',
  'a + b * c',
  'if (x > 0) y = 1;',
  'while (n > 0) n = n - 1;',
] as const;
