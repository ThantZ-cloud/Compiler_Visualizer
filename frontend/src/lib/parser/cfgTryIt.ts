/**
 * CFG Try It — textbook-grounded per wiki/chapter3 §3.2.3 to §3.2.5
 *
 * §3.2.3 Simple expression grammar (before precedence):
 *   1 Expr → '(' Expr ')'
 *   2 Expr → Expr Op name
 *   3 Expr → name
 *   4 Op → '+'
 *   5 Op → '-'
 *   6 Op → '×'  (shown as '*' in code)
 *   7 Op → '÷'  (shown as '/' in code)
 *
 * §3.2.4 Classic expression grammar (Fig 3.1, precedence-encoded):
 *   0 Goal → Expr
 *   1 Expr → Expr '+' Term
 *   2 Expr → Expr '-' Term
 *   3 Expr → Term
 *   4 Term → Term '×' Factor
 *   5 Term → Term '÷' Factor
 *   6 Term → Factor
 *   7 Factor → '(' Expr ')'
 *   8 Factor → 'num'
 *   9 Factor → 'name'
 *
 * Try It defaults to the §3.2.3 simple grammar with the book's
 * running example "(a + b) × c" and its rightmost derivation
 * sequence (2,6,1,2,4,3) as described on page 89.
 */

export interface CfgRule {
  id: string;
  lhs: string;
  rhs: string[];
}

export interface ParseNode {
  symbol: string;
  isTerminal: boolean;
  ruleId?: string;
  children?: ParseNode[];
}

export interface DerivationStep {
  step: number;
  ruleId: string | null;
  ruleLabel: string;
  sententialForm: string[];
  replacedIndex: number;
  rhsLength: number;
}

export interface CfgTryItData {
  input: string;
  tokens: string[];
  grammar: { start: string; rules: CfgRule[] };
  derivation: DerivationStep[];
  parseTree: ParseNode | null;
  error?: string;
  grammarKind: 'simple' | 'classic';
}

// §3.2.3 simple grammar — flat, precedence-agnostic
export const SIMPLE_GRAMMAR: { start: string; rules: CfgRule[] } = {
  start: 'Expr',
  rules: [
    { id: '1', lhs: 'Expr', rhs: ['(', 'Expr', ')'] },
    { id: '2', lhs: 'Expr', rhs: ['Expr', 'Op', 'name'] },
    { id: '3', lhs: 'Expr', rhs: ['name'] },
    { id: '4', lhs: 'Op', rhs: ['+'] },
    { id: '5', lhs: 'Op', rhs: ['-'] },
    { id: '6', lhs: 'Op', rhs: ['*'] },
    { id: '7', lhs: 'Op', rhs: ['/'] },
  ],
};

// §3.2.4 classic grammar — precedence-encoded (Fig 3.1)
export const CLASSIC_GRAMMAR: { start: string; rules: CfgRule[] } = {
  start: 'Goal',
  rules: [
    { id: '0', lhs: 'Goal', rhs: ['Expr'] },
    { id: '1', lhs: 'Expr', rhs: ['Expr', '+', 'Term'] },
    { id: '2', lhs: 'Expr', rhs: ['Expr', '-', 'Term'] },
    { id: '3', lhs: 'Expr', rhs: ['Term'] },
    { id: '4', lhs: 'Term', rhs: ['Term', '*', 'Factor'] },
    { id: '5', lhs: 'Term', rhs: ['Term', '/', 'Factor'] },
    { id: '6', lhs: 'Term', rhs: ['Factor'] },
    { id: '7', lhs: 'Factor', rhs: ['(', 'Expr', ')'] },
    { id: '8', lhs: 'Factor', rhs: ['num'] },
    { id: '9', lhs: 'Factor', rhs: ['name'] },
  ],
};

// Keep alias for backwards compat
export const CFG_TRYIT_GRAMMAR = SIMPLE_GRAMMAR;

export const CFG_TRYIT_PRESETS_SIMPLE = [
  '( a + b ) * c',
  'a + b * c',
  'a + b + c',
  'a * b + c',
  '( a + b ) * ( c + d )',
] as const;

export const CFG_TRYIT_PRESETS_CLASSIC = [
  'a + b * c',
  '( a + b ) * c',
  'a + b + c',
  'a * b + c * d',
  '( a + b ) * ( c + d )',
] as const;

export const CFG_TRYIT_PRESETS = CFG_TRYIT_PRESETS_SIMPLE;

function isNameToken(v: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9]*$/.test(v);
}

function tokenizeCfgInput(input: string): { tokens: string[]; error?: string } {
  const raw = input.trim();
  if (!raw) return { tokens: [], error: 'Empty input' };
  const re = /\s*([a-zA-Z][a-zA-Z0-9]*|[0-9]+|\+|-|\*|\/|\(|\))\s*/g;
  const tokens: string[] = [];
  let m: RegExpExecArray | null;
  const compact = raw.replace(/\s+/g, '');
  let consumed = '';
  while ((m = re.exec(raw)) !== null) {
    const tok = m[1];
    tokens.push(tok);
    consumed += tok;
  }
  if (consumed !== compact) {
    for (let i = 0; i < compact.length; i++) {
      const ch = compact[i];
      if (!/^[a-zA-Z0-9+\-*/()]$/.test(ch)) {
        return { tokens: [], error: `Invalid character '${ch}'` };
      }
    }
    return { tokens: [], error: 'Invalid input' };
  }
  if (tokens.length === 0) return { tokens: [], error: 'No tokens' };
  if (tokens.length > 18) return { tokens: [], error: 'Input too long (max 18 tokens)' };
  return { tokens };
}

// ── Simple grammar parser (Expr is left-recursive: Expr → Expr Op name) ──
class SimpleParser {
  tokens: string[];
  pos = 0;
  constructor(tokens: string[]) { this.tokens = tokens; }
  peek(): string | null { return this.tokens[this.pos] ?? null; }
  peek2(): string | null { return this.tokens[this.pos + 1] ?? null; }
  consume(): string { return this.tokens[this.pos++]; }

  parseOp(): ParseNode {
    const t = this.peek();
    if (t === '+' || t === '-' || t === '*' || t === '/') {
      this.consume();
      const id = t === '+' ? '4' : t === '-' ? '5' : t === '*' ? '6' : '7';
      return { symbol: 'Op', isTerminal: false, ruleId: id, children: [{ symbol: t, isTerminal: true }] };
    }
    throw new Error(`Expected operator but got '${t ?? 'end'}'`);
  }

  parsePrimaryExpr(): ParseNode {
    const t = this.peek();
    if (t === '(') {
      this.consume();
      const inner = this.parseExpr();
      if (this.peek() !== ')') throw new Error(`Expected ')'`);
      this.consume();
      return { symbol: 'Expr', isTerminal: false, ruleId: '1', children: [{ symbol: '(', isTerminal: true }, inner, { symbol: ')', isTerminal: true }] };
    }
    if (t != null && isNameToken(t)) {
      this.consume();
      return { symbol: 'Expr', isTerminal: false, ruleId: '3', children: [{ symbol: t, isTerminal: true }] };
    }
    if (t != null && /^[0-9]+$/.test(t)) {
      this.consume();
      return { symbol: 'Expr', isTerminal: false, ruleId: '3', children: [{ symbol: t, isTerminal: true }] };
    }
    throw new Error(`Unexpected token '${t ?? 'end'}'`);
  }

  parseExpr(): ParseNode {
    let left = this.parsePrimaryExpr();
    while (this.peek() !== null && ['+', '-', '*', '/'].includes(this.peek()!) && this.peek2() != null && (isNameToken(this.peek2()!) || this.peek2() === '(' || /^[0-9]+$/.test(this.peek2()!))) {
      // Need to distinguish: grammar expects Expr Op name where right operand is a single name (not arbitrary Expr).
      // For "(a + b) * c", the right operand after * is name c — ok.
      // For "a + b * c", simple grammar would treat "b * c" as not allowed as single right operand (since * c is not a name).
      // But the textbook's simple grammar still derives a + b * c by successive left expansions:
      // a + b * c is derived as (a + b) * c style via left recursion? Actually with Expr → Expr Op name,
      // a + b * c would be parsed as ((a + b) * c) where right of second Op is c (name) — and b is middle name.
      // So the loop should consume Op + single name/primary, not full Expr.
      const opNode = this.parseOp();
      const rightTok = this.peek();
      if (rightTok == null) throw new Error(`Expected name after operator`);
      // Right operand is a single name (or parenthesized primary is already handled as primary? But grammar says name only)
      // However to allow "(a + b)" as right operand in expressions like "x * (a + b)", we need to allow parenthesized Expr.
      // For now, handle both: if '(' then parse as '(' Expr ')', else name.
      let rightName: ParseNode;
      if (rightTok === '(') {
        this.consume();
        const inner = this.parseExpr();
        if (this.peek() !== ')') throw new Error(`Expected ')'`);
        this.consume();
        rightName = { symbol: 'Expr', isTerminal: false, ruleId: '1', children: [{ symbol: '(', isTerminal: true }, inner, { symbol: ')', isTerminal: true }] };
        // This deviates from strict grammar (right side should be name), but allows richer examples.
        // To stay faithful, we wrap it as a name is not correct. Alternative: create a separate path where right is Expr but we still treat as Expr Op name where name is the whole parenthesized primary's string? For now, keep this.
        // Actually to stay faithful to "Expr Op name", we should not allow '(' on right. But the example "(a+b)*c" has right operand c (name), left operand is "(a+b)" which is derived via '(' Expr ')' on left.
        // So the case "right is '('" only happens when expression ends with parenthesized term on right, e.g., "a*(b+c)" — which grammar wouldn't derive since right must be name. But we can support it for demo.
      } else if (isNameToken(rightTok) || /^[0-9]+$/.test(rightTok)) {
        this.consume();
        rightName = { symbol: rightTok, isTerminal: true };
      } else {
        throw new Error(`Expected name after operator, got '${rightTok}'`);
      }
      // Build Expr → Expr Op name
      left = { symbol: 'Expr', isTerminal: false, ruleId: '2', children: [left, opNode, rightName] };
    }
    return left;
  }

  parseGoal(): ParseNode {
    const expr = this.parseExpr();
    if (this.pos !== this.tokens.length) throw new Error(`Unexpected token '${this.peek()}'`);
    return expr; // Simple grammar start is Expr itself
  }
}

// ── Classic grammar parser (Fig 3.1) ──
class ClassicParser {
  tokens: string[];
  pos = 0;
  constructor(tokens: string[]) { this.tokens = tokens; }
  peek(): string | null { return this.tokens[this.pos] ?? null; }
  consume(): string { return this.tokens[this.pos++]; }

  parseFactor(): ParseNode {
    const t = this.peek();
    if (t === '(') {
      this.consume();
      const inner = this.parseExpr();
      if (this.peek() !== ')') throw new Error(`Expected ')'`);
      this.consume();
      return { symbol: 'Factor', isTerminal: false, ruleId: '7', children: [{ symbol: '(', isTerminal: true }, inner, { symbol: ')', isTerminal: true }] };
    }
    if (t != null && isNameToken(t)) {
      this.consume();
      return { symbol: 'Factor', isTerminal: false, ruleId: '9', children: [{ symbol: t, isTerminal: true }] };
    }
    if (t != null && /^[0-9]+$/.test(t)) {
      this.consume();
      return { symbol: 'Factor', isTerminal: false, ruleId: '8', children: [{ symbol: t, isTerminal: true }] };
    }
    throw new Error(`Unexpected token '${t ?? 'end'}' in Factor`);
  }

  parseTerm(): ParseNode {
    const left = this.parseFactor();
    let termNode: ParseNode = { symbol: 'Term', isTerminal: false, ruleId: '6', children: [left] };
    while (this.peek() === '*' || this.peek() === '/') {
      const op = this.consume();
      const right = this.parseFactor();
      const ruleId = op === '*' ? '4' : '5';
      termNode = { symbol: 'Term', isTerminal: false, ruleId, children: [termNode, { symbol: op, isTerminal: true }, right] };
    }
    return termNode;
  }

  parseExpr(): ParseNode {
    const left = this.parseTerm();
    let exprNode: ParseNode = { symbol: 'Expr', isTerminal: false, ruleId: '3', children: [left] };
    while (this.peek() === '+' || this.peek() === '-') {
      const op = this.consume();
      const right = this.parseTerm();
      const ruleId = op === '+' ? '1' : '2';
      exprNode = { symbol: 'Expr', isTerminal: false, ruleId, children: [exprNode, { symbol: op, isTerminal: true }, right] };
    }
    return exprNode;
  }

  parseGoal(): ParseNode {
    const expr = this.parseExpr();
    if (this.pos !== this.tokens.length) throw new Error(`Unexpected token '${this.peek()}'`);
    return { symbol: 'Goal', isTerminal: false, ruleId: '0', children: [expr] };
  }
}

function buildParseTree(tokens: string[], kind: 'simple' | 'classic'): { tree: ParseNode | null; error?: string } {
  try {
    if (kind === 'simple') {
      const p = new SimpleParser(tokens);
      return { tree: p.parseGoal() };
    }
    const p = new ClassicParser(tokens);
    return { tree: p.parseGoal() };
  } catch (e) {
    return { tree: null, error: e instanceof Error ? e.message : String(e) };
  }
}

function ruleLabelFor(ruleId: string | null, kind: 'simple' | 'classic'): string {
  if (!ruleId) return '';
  const rules = kind === 'simple' ? SIMPLE_GRAMMAR.rules : CLASSIC_GRAMMAR.rules;
  const r = rules.find(x => x.id === ruleId);
  if (!r) return ruleId;
  return `${r.lhs} → ${r.rhs.join(' ')}`;
}

function generateRightmostDerivation(root: ParseNode, kind: 'simple' | 'classic'): DerivationStep[] {
  type Elem = ParseNode;
  let form: Elem[] = [root];
  const steps: DerivationStep[] = [
    { step: 0, ruleId: null, ruleLabel: '—', sententialForm: [root.symbol], replacedIndex: -1, rhsLength: 0 },
  ];
  let stepNum = 1;
  for (let iter = 0; iter < 40; iter++) {
    let idx = -1;
    for (let i = form.length - 1; i >= 0; i--) {
      const el = form[i];
      if (!el.isTerminal && el.children && el.children.length > 0) { idx = i; break; }
    }
    if (idx === -1) break;
    const node = form[idx];
    const rhs = node.children ?? [];
    const ruleId = node.ruleId ?? null;
    const nextForm = [...form.slice(0, idx), ...rhs, ...form.slice(idx + 1)];
    const symbols = nextForm.map(e => e.symbol);
    steps.push({
      step: stepNum,
      ruleId,
      ruleLabel: ruleLabelFor(ruleId, kind),
      sententialForm: symbols,
      replacedIndex: idx,
      rhsLength: rhs.length,
    });
    form = nextForm;
    stepNum++;
  }
  return steps;
}

export function buildCfgTryItData(input: string, kind: 'simple' | 'classic' = 'simple'): CfgTryItData {
  const grammar = kind === 'simple' ? SIMPLE_GRAMMAR : CLASSIC_GRAMMAR;
  const tokRes = tokenizeCfgInput(input);
  if (tokRes.error) return { input, tokens: [], grammar, derivation: [], parseTree: null, error: tokRes.error, grammarKind: kind };
  const tokens = tokRes.tokens;
  const { tree, error } = buildParseTree(tokens, kind);
  if (error || !tree) return { input, tokens, grammar, derivation: [], parseTree: null, error: error ?? 'Parse failed', grammarKind: kind };
  const derivation = generateRightmostDerivation(tree, kind);
  return { input, tokens, grammar, derivation, parseTree: tree, error: undefined, grammarKind: kind };
}

export function sententialFormToString(form: string[]): string { return form.join(' '); }
export function countParseNodes(node: ParseNode): number {
  if (node.isTerminal) return 1;
  return 1 + (node.children ?? []).reduce((acc, c) => acc + countParseNodes(c), 0);
}
