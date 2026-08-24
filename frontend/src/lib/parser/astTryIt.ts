/**
 * AST Try It — Abstract Syntax Tree Construction per wiki/chapter5 §5.2.1
 * Builds an AST from a user expression by parsing with the LL(1) grammar (pdaTryIt)
 * and contracting: operators → BinaryExpr, name → NameExpr, num → IntegerLiteralExpr.
 * Parens and nonterminal chain nodes are dropped (the §5.2.1 abstraction).
 */

import { buildPdaTryItData, PDA_TRYIT_PRESETS } from './pdaTryIt';

export { PDA_TRYIT_PRESETS };

export interface AstTryItData {
  input: string;
  /** JSON string in the same shape AstTreeAnimation renders */
  astJson: string;
  nodeCount: number;
  error?: string;
}

interface OutNode {
  type: string;
  name?: string;
  value?: string;
  children?: OutNode[];
}

interface BuildState {
  tokens: string[];
  pos: number;
}

function countNodes(n: OutNode): number {
  return 1 + (n.children ?? []).reduce((s, c) => s + countNodes(c), 0);
}

function jsonOf(n: OutNode): string {
  return JSON.stringify(n);
}

/**
 * Recursive-descent AST builder over the token stream, mirroring the LL(1)
 * grammar's precedence structure (Expr > Term > Factor). This produces the
 * same tree the parse-steps contraction would, with correct precedence.
 */
function buildExpr(s: BuildState): OutNode {
  let left = buildTerm(s);
  while (s.pos < s.tokens.length && (s.tokens[s.pos] === '+' || s.tokens[s.pos] === '-')) {
    const op = s.tokens[s.pos++];
    const right = buildTerm(s);
    left = { type: 'Op', name: op, children: [left, right] };
  }
  return left;
}

function buildTerm(s: BuildState): OutNode {
  let left = buildFactor(s);
  while (s.pos < s.tokens.length && (s.tokens[s.pos] === '*' || s.tokens[s.pos] === '/')) {
    const op = s.tokens[s.pos++];
    const right = buildFactor(s);
    left = { type: 'Op', name: op, children: [left, right] };
  }
  return left;
}

function buildFactor(s: BuildState): OutNode {
  const tok = s.tokens[s.pos];
  if (tok === undefined) return { type: 'Operand', name: '?' };
  if (tok === '(') {
    s.pos++;
    const inner = buildExpr(s);
    if (s.tokens[s.pos] === ')') s.pos++;
    return inner;
  }
  s.pos++;
  // Symbol-only labels — just the operand itself (§5.2.1 abstraction)
  return { type: 'Operand', name: tok };
}

export function buildAstTryItData(input: string): AstTryItData {
  const parsed = buildPdaTryItData(input);
  if (parsed.error) {
    return { input, astJson: '', nodeCount: 0, error: parsed.error };
  }
  const lastStep = parsed.steps[parsed.steps.length - 1];
  if (lastStep?.action !== 'ACCEPT') {
    const errStep = parsed.steps.find(st => st.action === 'ERROR');
    return {
      input,
      astJson: '',
      nodeCount: 0,
      error: errStep ? errStep.detail : 'Parse failed',
    };
  }

  const state: BuildState = { tokens: parsed.tokens, pos: 0 };
  const ast = buildExpr(state);
  if (state.pos < state.tokens.length) {
    return {
      input,
      astJson: '',
      nodeCount: 0,
      error: `Unexpected '${state.tokens[state.pos]}' after end of expression`,
    };
  }

  return { input, astJson: jsonOf(ast), nodeCount: countNodes(ast) };
}
