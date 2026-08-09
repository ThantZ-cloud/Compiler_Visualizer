import type { Token } from '../../types';
import type { GrammarRule, ParseAction, ParseStage, ParseStep, StackItem } from './types';
import { findGrammarRule } from './javaGrammar';

// ── Shift-Reduce Parse Simulation ──
// Reconstructs an LR-style bottom-up parse of the token stream using the AST
// as ground truth. Tokens from the lexical phase are shifted one by one in
// source order; as soon as every symbol of an AST node sits at the top of the
// stack, that node is reduced with its grammar production.

interface AstNode {
  type: string;
  name?: string;
  value?: string;
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  children?: AstNode[];
}

interface Pos {
  line: number;
  col: number;
}

type Item =
  | { kind: 'terminal'; token: Token }
  | { kind: 'nonterminal'; node: AstNode };

interface NodeInfo {
  id: number;
  node: AstNode;
  items: Item[];
  reduced: boolean;
}

// ── helpers ──

function isMeaningful(t: Token): boolean {
  const type = t.type.toUpperCase();
  return type !== 'WHITESPACE' && !type.includes('COMMENT');
}

function parseAst(astJson: string): AstNode | null {
  try {
    const parsed = JSON.parse(astJson);
    if (!parsed || parsed.error) return null;
    return parsed as AstNode;
  } catch {
    return null;
  }
}

function within(token: Token, begin: Pos, end: Pos): boolean {
  const afterBegin = token.line > begin.line || (token.line === begin.line && token.column >= begin.col);
  const beforeEnd = token.line < end.line || (token.line === end.line && token.column <= end.col);
  return afterBegin && beforeEnd;
}

function comparePos(a: Pos, b: Pos): number {
  if (a.line !== b.line) return a.line - b.line;
  return a.col - b.col;
}

function nodeBegin(node: AstNode): Pos {
  return { line: node.line ?? 1, col: node.column ?? 1 };
}

function nodeEnd(node: AstNode): Pos {
  return {
    line: node.endLine ?? node.line ?? 1,
    col: node.endColumn ?? node.column ?? Infinity,
  };
}

/** Curated rule for this node type; otherwise a generic production */
function makeRule(node: AstNode, items: Item[]): GrammarRule {
  const curated = findGrammarRule(node.type);
  const rhs = items.map(s => {
    if (s.kind === 'terminal') return `'${s.token.value}'`;
    return s.node.type;
  });
  return {
    id: curated ? curated.id : `R-${node.type}`,
    lhs: node.type,
    rhs: rhs.length > 0 ? rhs : [`<${node.type}>`],
    description: curated?.description,
  };
}

function classifyStage(action: ParseAction): ParseStage {
  if (action.type === 'ACCEPT') return 'accept';
  if (action.type === 'REDUCE') {
    const lhs = action.rule?.lhs ?? '';
    if (lhs === 'CompilationUnit') return 'accept';
    if (['IfStmt', 'WhileStmt', 'ForStmt', 'ReturnStmt', 'ExpressionStmt', 'BlockStmt', 'AssignExpr', 'BinaryExpr', 'MethodCallExpr'].includes(lhs)) {
      return 'statement';
    }
    if (['MethodDeclaration', 'FieldDeclaration', 'ConstructorDeclaration'].includes(lhs)) {
      return 'body';
    }
    return 'header';
  }
  // SHIFT
  const v = action.token?.value ?? '';
  if (v === '{') return 'body';
  if (['class', 'interface', 'enum', 'record', 'public', 'private', 'protected', 'static', 'final'].includes(v)) {
    return 'header';
  }
  return 'start';
}

// ── build node metadata ──

function buildInfos(root: AstNode): { infos: NodeInfo[]; indexOf: Map<AstNode, number> } {
  const infos: NodeInfo[] = [];
  const indexOf = new Map<AstNode, number>();

  function visit(node: AstNode): number {
    const id = infos.length;
    indexOf.set(node, id);
    const info: NodeInfo = { id, node, items: [], reduced: false };
    infos.push(info);
    orderedChildren(node).forEach(visit);
    return id;
  }
  visit(root);
  return { infos, indexOf };
}

function orderedChildren(node: AstNode): AstNode[] {
  return (node.children ?? []).filter(c => c && typeof c === 'object');
}

/** Anchor each token to the deepest AST node that contains it */
function anchorTokens(root: AstNode, tokens: Token[]): Map<AstNode, Token[]> {
  const map = new Map<AstNode, Token[]>();
  for (const token of tokens) {
    let container: AstNode | null = null;
    const walk = (node: AstNode) => {
      if (!within(token, nodeBegin(node), nodeEnd(node))) return;
      container = node;
      for (const child of orderedChildren(node)) walk(child);
    };
    walk(root);
    if (container) {
      const arr = map.get(container) ?? [];
      arr.push(token);
      map.set(container, arr);
    }
  }
  return map;
}

/** Ordered item list each node reduces from (merge of own tokens + children) */
function computeItems(root: AstNode, tokenMap: Map<AstNode, Token[]>): Map<AstNode, Item[]> {
  const result = new Map<AstNode, Item[]>();

  function build(node: AstNode): Item[] {
    const ownItems = (tokenMap.get(node) ?? []).map((t): Item => ({ kind: 'terminal', token: t }));
    const childItems: Item[] = (node.children ?? [])
      .filter(c => c && typeof c === 'object')
      .map((c): Item => ({ kind: 'nonterminal', node: c }))
      .sort((a, b) => comparePos(nodeBegin((a as { node: AstNode }).node), nodeBegin((b as { node: AstNode }).node)));

    const merged: Item[] = [];
    let i = 0;
    let j = 0;
    while (i < ownItems.length || j < childItems.length) {
      const own = ownItems[i] as { kind: 'terminal'; token: Token } | undefined;
      const child = childItems[j] as { kind: 'nonterminal'; node: AstNode } | undefined;
      if (own && child) {
        const childPos = nodeBegin(child.node);
        if (comparePos({ line: own.token.line, col: own.token.column }, childPos) <= 0) {
          merged.push(own);
          i++;
        } else {
          merged.push(child);
          j++;
        }
      } else if (own) {
        merged.push(own);
        i++;
      } else if (child) {
        merged.push(child);
        j++;
      }
    }
    result.set(node, merged);
    return merged;
  }

  const visit = (node: AstNode) => {
    orderedChildren(node).forEach(visit);
    build(node);
  };
  visit(root);
  return result;
}

// ── main simulation ──

export function generateParseSteps(tokens: Token[], astJson: string): ParseStep[] {
  const root = parseAst(astJson);
  if (!root) return [];

  const input = tokens.filter(isMeaningful);
  if (input.length === 0) return [];

  const { infos, indexOf } = buildInfos(root);
  const tokenMap = anchorTokens(root, input);
  const itemMap = computeItems(root, tokenMap);
  const infoByNode = new Map<AstNode, NodeInfo>();
  for (const info of infos) infoByNode.set(info.node, info);

  // Post-order traversal, children before parents (root reduces last)
  const order: NodeInfo[] = [];
  const visitOrder = (info: NodeInfo) => {
    for (const child of orderedChildren(info.node)) {
      const childInfo = infoByNode.get(child);
      if (childInfo) visitOrder(childInfo);
    }
    order.push(info);
  };
  visitOrder(infos[0]);

  const steps: ParseStep[] = [];
  let stack: StackItem[] = [];
  let idCounter = 0;
  const usedRules = new Set<string>();
  let remaining = input.map(r => ({ ...r }));

  const matchesTop = (items: Item[]): boolean => {
    if (items.length === 0 || stack.length < items.length) return false;
    const top = stack.slice(stack.length - items.length);
    for (let i = 0; i < items.length; i++) {
      const expected = items[i];
      const actual = top[i];
      if (expected.kind === 'terminal') {
        if (actual.kind !== 'terminal' || actual.token !== expected.token) return false;
      } else {
        if (actual.kind !== 'nonterminal') return false;
        if (actual.nodeId !== indexOf.get(expected.node)) return false;
        if (actual.symbol !== expected.node.type) return false;
      }
    }
    return true;
  };

  const emit = (action: ParseAction): void => {
    steps.push({
      index: steps.length,
      action,
      stack: stack.map(s => ({ ...s })),
      inputRemaining: remaining.map(r => ({ ...r })),
      usedRules: [...usedRules],
      stage: classifyStage(action),
    });
  };

  for (const token of input) {
    // SHIFT the token onto the stack
    stack.push({ id: ++idCounter, symbol: token.value, kind: 'terminal', token });
    remaining = remaining.slice(1);
    emit({ type: 'SHIFT', token, detail: `SHIFT '${token.value}'  [${token.type}]` });

    // Reduce any node whose items now top the stack
    for (const info of order) {
      if (info.reduced) continue;
      const items = itemMap.get(info.node) ?? [];
      if (items.length === 0) continue;
      if (!matchesTop(items)) continue;
      stack = stack.slice(0, stack.length - items.length);
      stack.push({ id: ++idCounter, symbol: info.node.type, kind: 'nonterminal', nodeId: info.id });
      info.reduced = true;
      const rule = makeRule(info.node, items);
      if (findGrammarRule(info.node.type)) usedRules.add(rule.id);
      emit({ type: 'REDUCE', rule, detail: `REDUCE ${rule.lhs} → ${rule.rhs.join(' ')}` });
    }
  }

  // ACCEPT once the whole program has been reduced to the start symbol
  const rootSymbol = root.type;
  const accepted = stack.length === 1 && stack[0].symbol === rootSymbol;
  emit({
    type: 'ACCEPT',
    detail: accepted
      ? `ACCEPT — every token reduced into ${rootSymbol}`
      : `ACCEPT — end of input reached (stack: ${stack.map(s => s.symbol).join(' · ') || 'empty'})`,
  });

  return steps;
}