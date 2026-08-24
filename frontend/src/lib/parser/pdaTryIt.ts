/**
 * PDA Try It — Top-Down LL(1) Parser per wiki/chapter3 §3.3
 * Right-recursive expression grammar (Fig 3.4) + FIRST/FOLLOW (Fig 3.7/3.8) + LL(1) table (Fig 3.11b)
 * Order for Try It: editable input → leftmost top-down trace → FIRST/FOLLOW → LL(1) table
 */

export interface LRule {
  id: string;
  lhs: string;
  rhs: string[];
}

export const RIGHT_RECURSIVE_GRAMMAR: { start: string; rules: LRule[] } = {
  start: 'Goal',
  rules: [
    { id: '0', lhs: 'Goal', rhs: ['Expr'] },
    { id: '1', lhs: 'Expr', rhs: ['Term', "Expr'"] },
    { id: '2', lhs: "Expr'", rhs: ['+', 'Term', "Expr'"] },
    { id: '3', lhs: "Expr'", rhs: ['-', 'Term', "Expr'"] },
    { id: '4', lhs: "Expr'", rhs: [] }, // ε
    { id: '5', lhs: 'Term', rhs: ['Factor', "Term'"] },
    { id: '6', lhs: "Term'", rhs: ['*', 'Factor', "Term'"] },
    { id: '7', lhs: "Term'", rhs: ['/', 'Factor', "Term'"] },
    { id: '8', lhs: "Term'", rhs: [] }, // ε
    { id: '9', lhs: 'Factor', rhs: ['(', 'Expr', ')'] },
    { id: '10', lhs: 'Factor', rhs: ['num'] },
    { id: '11', lhs: 'Factor', rhs: ['name'] },
  ],
};

// FIRST / FOLLOW — textbook Fig 3.7 / 3.8 results for right-recursive grammar
export const FIRST_SETS: Record<string, string[]> = {
  Goal: ['(', 'name', 'num'],
  Expr: ['(', 'name', 'num'],
  "Expr'": ['+', '-', 'ε'],
  Term: ['(', 'name', 'num'],
  "Term'": ['*', '/', 'ε'],
  Factor: ['(', 'name', 'num'],
  // Terminals
  '+': ['+'], '-': ['-'], '*': ['*'], '/': ['/'], '(': ['('], ')': [')'], name: ['name'], num: ['num'], $: ['$'],
};

export const FOLLOW_SETS: Record<string, string[]> = {
  Goal: ['$'],
  Expr: ['$', ')'],
  "Expr'": ['$', ')'],
  Term: ['+', '-', '$', ')'],
  "Term'": ['+', '-', '$', ')'],
  Factor: ['*', '/', '+', '-', '$', ')'],
};

// LL(1) parse table M[nonterminal, terminal] → rule id or null (— = error)
// Columns: '+','-','*','/','(',' )','name','num','$'
export const LL1_TABLE: Record<string, Record<string, string | null>> = {
  Goal:  { '+': null, '-': null, '*': null, '/': null, '(': '0', ')': null, name: '0', num: '0', $: null },
  Expr:  { '+': null, '-': null, '*': null, '/': null, '(': '1', ')': null, name: '1', num: '1', $: null },
  "Expr'": { '+': '2', '-': '3', '*': null, '/': null, '(': null, ')': '4', name: null, num: null, $: '4' },
  Term:  { '+': null, '-': null, '*': null, '/': null, '(': '5', ')': null, name: '5', num: '5', $: null },
  "Term'": { '+': '8', '-': '8', '*': '6', '/': '7', '(': null, ')': '8', name: null, num: null, $: '8' },
  Factor:{ '+': null, '-': null, '*': null, '/': null, '(': '9', ')': null, name: '11', num: '10', $: null },
};

export const PDA_TRYIT_PRESETS = [
  'a + b * c',
  '( a + b ) * c',
  'a + b + c',
  'a * b + c * d',
  '( a + b ) * ( c + d )',
] as const;

function isNameToken(v: string): boolean { return /^[a-zA-Z][a-zA-Z0-9]*$/.test(v); }
function tokenToTerminal(tok: string): string {
  if (tok === '$') return '$';
  if (tok === '+' || tok === '-' || tok === '*' || tok === '/' || tok === '(' || tok === ')') return tok;
  if (/^[0-9]+$/.test(tok)) return 'num';
  if (isNameToken(tok)) return 'name';
  return tok;
}

function tokenizePdaInput(input: string): { tokens: string[]; error?: string } {
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
      if (!/^[a-zA-Z0-9+\-*/()]$/.test(ch)) return { tokens: [], error: `Invalid character '${ch}'` };
    }
    return { tokens: [], error: 'Invalid input' };
  }
  if (tokens.length === 0) return { tokens: [], error: 'No tokens' };
  if (tokens.length > 18) return { tokens: [], error: 'Input too long (max 18 tokens)' };
  return { tokens };
}

export type TopDownAction = 'PREDICT' | 'MATCH' | 'ACCEPT' | 'ERROR';

export interface TopDownStep {
  step: number;
  action: TopDownAction;
  ruleId?: string; // for PREDICT
  ruleLabel?: string; // full label e.g. "Expr → Term Expr'"
  /** Textbook rule column: rule number for PREDICT, '!' for MATCH, '—' otherwise */
  ruleDisplay: string;
  /** Stack contents, bottom at left / top at right, no $ marker: e.g. "Expr' Term' name" */
  stack: string[]; // internal: top at end
  stackDisplay: string;
  /** Input rendered as syntactic categories (name/num/operators) */
  inputCategories: string[];
  /** Cursor position: number of input tokens consumed so far */
  inputPos: number;
  lookahead: string; // terminal category of current input token
  detail: string;
}

function ruleLabelFor(id: string): string {
  const r = RIGHT_RECURSIVE_GRAMMAR.rules.find(x => x.id === id);
  if (!r) return id;
  const rhs = r.rhs.length === 0 ? 'ε' : r.rhs.join(' ');
  return `${r.lhs} → ${rhs}`;
}

export interface PdaTryItData {
  input: string;
  tokens: string[];
  steps: TopDownStep[];
  first: Record<string, string[]>;
  follow: Record<string, string[]>;
  ll1Table: Record<string, Record<string, string | null>>;
  grammar: typeof RIGHT_RECURSIVE_GRAMMAR;
  error?: string;
}

export function buildPdaTryItData(input: string): PdaTryItData {
  const grammar = RIGHT_RECURSIVE_GRAMMAR;
  const tokRes = tokenizePdaInput(input);
  if (tokRes.error) {
    return { input, tokens: [], steps: [], first: FIRST_SETS, follow: FOLLOW_SETS, ll1Table: LL1_TABLE, grammar, error: tokRes.error };
  }
  const tokens = tokRes.tokens;
  const steps: TopDownStep[] = [];

  // Stack holds grammar symbols, last element is top. Bottom is '$' (internal only — never displayed).
  const stack: string[] = ['$', 'Goal'];
  let pos = 0; // index in tokens

  // Input rendered as syntactic categories (textbook convention: a → name, 42 → num)
  const inputCategories = tokens.map(tokenToTerminal);

  // Stack display: bottom at left, top at right, no $ marker (textbook Fig style)
  const stackDisplay = () => stack.filter(s => s !== '$').join(' ');

  const lookaheadCategory = () => {
    if (pos >= tokens.length) return '$';
    return tokenToTerminal(tokens[pos]);
  };

  let stepNum = 0;
  steps.push({
    step: stepNum++,
    action: 'PREDICT',
    ruleDisplay: '—',
    stack: [...stack],
    stackDisplay: stackDisplay(),
    inputCategories: [...inputCategories],
    inputPos: pos,
    lookahead: lookaheadCategory(),
    detail: 'Start',
    ruleLabel: '—',
  });

  // Safety loop
  for (let iter = 0; iter < 80; iter++) {
    const top = stack[stack.length - 1];
    const la = lookaheadCategory();
    const laLexeme = pos < tokens.length ? tokens[pos] : '$';

    if (top === '$' && la === '$') {
      steps.push({
        step: stepNum++,
        action: 'ACCEPT',
        ruleDisplay: '—',
        stack: [...stack],
        stackDisplay: stackDisplay(),
        inputCategories: [...inputCategories],
        inputPos: pos,
        lookahead: la,
        detail: 'ACCEPT',
        ruleLabel: '—',
      });
      break;
    }

    const isNT = top != null && (top === 'Goal' || top === 'Expr' || top === "Expr'" || top === 'Term' || top === "Term'" || top === 'Factor');
    const isTerminal = top != null && !isNT && top !== '$';

    if (isNT) {
      const nt = top!;
      const ruleId = LL1_TABLE[nt]?.[la] ?? null;
      if (ruleId == null) {
        steps.push({
          step: stepNum++,
          action: 'ERROR',
          ruleDisplay: '—',
          stack: [...stack],
          stackDisplay: stackDisplay(),
          inputCategories: [...inputCategories],
          inputPos: pos,
          lookahead: la,
          detail: `ERROR: no entry M[${nt}, ${la}]`,
          ruleLabel: '—',
        });
        break;
      }
      // Predict: pop NT, push RHS reversed
      stack.pop();
      const rule = grammar.rules.find(r => r.id === ruleId)!;
      // epsilon is empty rhs
      if (rule.rhs.length > 0) {
        for (let i = rule.rhs.length - 1; i >= 0; i--) {
          stack.push(rule.rhs[i]);
        }
      }
      steps.push({
        step: stepNum++,
        action: 'PREDICT',
        ruleId,
        ruleDisplay: ruleId,
        ruleLabel: ruleLabelFor(ruleId),
        stack: [...stack],
        stackDisplay: stackDisplay(),
        inputCategories: [...inputCategories],
        inputPos: pos,
        lookahead: la,
        detail: `Predict ${ruleLabelFor(ruleId)}`,
      });
    } else if (isTerminal) {
      const t = top!;
      // Match terminal category against lookahead category
      if (t === la) {
        stack.pop();
        // Advance input if not end
        if (la !== '$') pos++;
        steps.push({
          step: stepNum++,
          action: 'MATCH',
          ruleDisplay: '!',
          stack: [...stack],
          stackDisplay: stackDisplay(),
          inputCategories: [...inputCategories],
          inputPos: pos,
          lookahead: lookaheadCategory(),
          detail: `Match '${laLexeme}'`,
          ruleLabel: '—',
        });
      } else {
        steps.push({
          step: stepNum++,
          action: 'ERROR',
          ruleDisplay: '—',
          stack: [...stack],
          stackDisplay: stackDisplay(),
          inputCategories: [...inputCategories],
          inputPos: pos,
          lookahead: la,
          detail: `ERROR: expected '${t}' but got '${laLexeme}'`,
          ruleLabel: '—',
        });
        break;
      }
    } else if (top === '$') {
      // Stack $ but input not $ => error (should have been accept)
      steps.push({
        step: stepNum++,
        action: 'ERROR',
        ruleDisplay: '—',
        stack: [...stack],
        stackDisplay: stackDisplay(),
        inputCategories: [...inputCategories],
        inputPos: pos,
        lookahead: la,
        detail: `ERROR: unexpected '${laLexeme}' after end of expression`,
        ruleLabel: '—',
      });
      break;
    } else {
      break;
    }
  }

  return { input, tokens, steps, first: FIRST_SETS, follow: FOLLOW_SETS, ll1Table: LL1_TABLE, grammar };
}
