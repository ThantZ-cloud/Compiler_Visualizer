/**
 * Shift-Reduce Try It — Bottom-Up LR Parser per wiki/chapter3 §3.4
 * Right-recursive expression grammar (Fig 3.4) augmented with Goal' → Goal.
 * Canonical LR(0) collection + SLR(1) table computed at runtime (no conflicts for this grammar).
 * Skeleton parser follows Fig 3.15; trace columns mirror the book: Iteration | State | word | Stack | Handle | Action.
 */

import {
  RIGHT_RECURSIVE_GRAMMAR,
  FOLLOW_SETS,
  PDA_TRYIT_PRESETS,
} from './pdaTryIt';

export { RIGHT_RECURSIVE_GRAMMAR, PDA_TRYIT_PRESETS };

// ── Grammar helpers ──

const AUGMENTED_START = "Goal'";
const NONTERMINALS = ["Goal'", 'Goal', 'Expr', "Expr'", 'Term', "Term'", 'Factor'];

interface AugRule {
  id: number; // index into rules array
  label: string; // original rule id string ('0'..'11') or "'" for augmentation
  lhs: string;
  rhs: string[];
}

const AUG_RULES: AugRule[] = [
  { id: -1, label: "'", lhs: AUGMENTED_START, rhs: ['Goal'] },
  ...RIGHT_RECURSIVE_GRAMMAR.rules.map(r => ({
    id: Number(r.id),
    label: r.id,
    lhs: r.lhs,
    rhs: r.rhs,
  })),
];

function ruleLabel(label: string): string {
  const r = AUG_RULES.find(x => x.label === label)!;
  return `${r.lhs} → ${r.rhs.length === 0 ? 'ε' : r.rhs.join(' ')}`;
}

function isNT(sym: string): boolean {
  return NONTERMINALS.includes(sym);
}

// ── LR(0) items ──

interface Item {
  ruleIdx: number; // index into AUG_RULES
  dot: number; // position of dot in rhs
}

function itemKey(it: Item): string {
  return `${it.ruleIdx}:${it.dot}`;
}

function closure(items: Item[]): Item[] {
  const out = new Map<string, Item>();
  const work = [...items];
  while (work.length > 0) {
    const it = work.pop()!;
    if (!out.has(itemKey(it))) out.set(itemKey(it), it);
    const rule = AUG_RULES[it.ruleIdx];
    const next = rule.rhs[it.dot];
    if (next != null && isNT(next)) {
      for (let i = 0; i < AUG_RULES.length; i++) {
        if (AUG_RULES[i].lhs === next) {
          const candidate = { ruleIdx: i, dot: 0 };
          if (!out.has(itemKey(candidate))) work.push(candidate);
        }
      }
    }
  }
  return [...out.values()];
}

function goto(items: Item[], sym: string): Item[] {
  const moved: Item[] = [];
  for (const it of items) {
    const rule = AUG_RULES[it.ruleIdx];
    if (rule.rhs[it.dot] === sym) moved.push({ ruleIdx: it.ruleIdx, dot: it.dot + 1 });
  }
  return moved.length > 0 ? closure(moved) : [];
}

// ── Canonical collection ──

interface LrState {
  id: number;
  items: Item[];
  transitions: Record<string, number>; // symbol → state id
}

function buildCanonicalCollection(): { states: LrState[] } {
  const startItem: Item = { ruleIdx: 0, dot: 0 };
  const states: LrState[] = [];
  const keyOf = (items: Item[]) =>
    items
      .map(itemKey)
      .sort()
      .join('|');
  const seen = new Map<string, number>();

  const i0 = closure([startItem]);
  seen.set(keyOf(i0), 0);
  states.push({ id: 0, items: i0, transitions: {} });

  const allSymbols = [...NONTERMINALS, '+', '-', '*', '/', '(', ')', 'name', 'num'];
  let queue = [0];
  while (queue.length > 0) {
    const nextQueue: number[] = [];
    for (const sid of queue) {
      const st = states[sid];
      for (const sym of allSymbols) {
        const moved = goto(st.items, sym);
        if (moved.length === 0) continue;
        const k = keyOf(moved);
        let target = seen.get(k);
        if (target == null) {
          target = states.length;
          seen.set(k, target);
          states.push({ id: target, items: moved, transitions: {} });
          nextQueue.push(target);
        }
        st.transitions[sym] = target;
      }
    }
    queue = nextQueue;
  }
  return { states };
}

const { states: LR_STATES } = buildCanonicalCollection();

// ── SLR(1) tables ──

export type SrAction =
  | { kind: 'shift'; to: number }
  | { kind: 'reduce'; ruleLabel: string } // book rule id ('0'..'11')
  | { kind: 'accept' }
  | { kind: 'error' };

export const TERMINALS = ['+', '-', '*', '/', '(', ')', 'name', 'num', '$'];
export const GOTO_NTS = ['Goal', 'Expr', "Expr'", 'Term', "Term'", 'Factor'];

const ACTION_TABLE: Record<number, Record<string, SrAction>> = {};
const GOTO_TABLE: Record<number, Record<string, number>> = {};

for (const st of LR_STATES) {
  ACTION_TABLE[st.id] = {};
  GOTO_TABLE[st.id] = {};
  for (const t of TERMINALS) {
    // shift
    const to = st.transitions[t];
    if (to != null && !isNT(t)) {
      ACTION_TABLE[st.id][t] = { kind: 'shift', to };
      continue;
    }
    // reduce / accept from completed items
    const completed = st.items.filter(it => AUG_RULES[it.ruleIdx].rhs.length === it.dot);
    for (const it of completed) {
      const rule = AUG_RULES[it.ruleIdx];
      if (rule.lhs === AUGMENTED_START && t === '$') {
        ACTION_TABLE[st.id][t] = { kind: 'accept' };
      } else if ((FOLLOW_SETS[rule.lhs] ?? []).includes(t)) {
        ACTION_TABLE[st.id][t] = { kind: 'reduce', ruleLabel: rule.label };
      }
    }
    if (!ACTION_TABLE[st.id][t]) ACTION_TABLE[st.id][t] = { kind: 'error' };
  }
  for (const nt of GOTO_NTS) {
    const to = st.transitions[nt];
    if (to != null) GOTO_TABLE[st.id][nt] = to;
  }
}

export function getAction(state: number, terminal: string): SrAction {
  return ACTION_TABLE[state]?.[terminal] ?? { kind: 'error' };
}
export function getGoto(state: number, nt: string): number | null {
  return GOTO_TABLE[state]?.[nt] ?? null;
}
export { ACTION_TABLE, GOTO_TABLE, LR_STATES, ruleLabel };

// ── Tokenizer (reuse semantics from pdaTryIt) ──

function isNameToken(v: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9]*$/.test(v);
}

function tokenToTerminal(tok: string): string {
  if (tok === '$') return '$';
  if ('+-*/()'.includes(tok)) return tok;
  if (/^[0-9]+$/.test(tok)) return 'num';
  if (isNameToken(tok)) return 'name';
  return tok;
}

function tokenizeSrInput(input: string): { tokens: string[]; error?: string } {
  const raw = input.trim();
  if (!raw) return { tokens: [], error: 'Empty input' };
  const re = /\s*([a-zA-Z][a-zA-Z0-9]*|[0-9]+|\+|-|\*|\/|\(|\))\s*/g;
  const tokens: string[] = [];
  let m: RegExpExecArray | null;
  const compact = raw.replace(/\s+/g, '');
  let consumed = '';
  while ((m = re.exec(raw)) !== null) {
    tokens.push(m[1]);
    consumed += m[1];
  }
  if (consumed !== compact) {
    for (const ch of compact) {
      if (!/^[a-zA-Z0-9+\-*/()]$/.test(ch)) return { tokens: [], error: `Invalid character '${ch}'` };
    }
    return { tokens: [], error: 'Invalid input' };
  }
  if (tokens.length === 0) return { tokens: [], error: 'No tokens' };
  if (tokens.length > 18) return { tokens: [], error: 'Input too long (max 18 tokens)' };
  return { tokens };
}

// ── Trace steps ──

export type SrActionType = 'SHIFT' | 'REDUCE' | 'ACCEPT' | 'ERROR';

export interface SrStep {
  step: number;
  actionType: SrActionType | 'INIT';
  /** Top-of-stack state before acting */
  state: number;
  /** Lookahead category */
  lookahead: string;
  lookaheadLexeme: string;
  /** Stack symbols interleaved with states, bottom at left: ['$','0','(','3'] */
  stack: string[];
  stackDisplay: string;
  /** Book-style action cell: 'shift 3' | 'reduce 5' | 'accept' | '—' */
  actionDisplay: string;
  handle?: string; // e.g. "Pair → ( )" — set when a reduce is found
  detail: string;
}

export interface ShiftReduceTryItData {
  input: string;
  tokens: string[];
  steps: SrStep[];
  grammar: typeof RIGHT_RECURSIVE_GRAMMAR;
  error?: string;
}

export function buildShiftReduceTryItData(input: string): ShiftReduceTryItData {
  const tokRes = tokenizeSrInput(input);
  if (tokRes.error) {
    return { input, tokens: [], steps: [], grammar: RIGHT_RECURSIVE_GRAMMAR, error: tokRes.error };
  }
  const tokens = tokRes.tokens;
  const inputCategories = tokens.map(tokenToTerminal);

  const steps: SrStep[] = [];
  // Stack holds $, then alternating state/symbol per Fig 3.15. Top of stack is always a state.
  const stack: string[] = ['$', '0'];
  let pos = 0;

  const stackDisplay = () => stack.filter(s => s !== '$').join(' ');
  const topState = () => Number(stack[stack.length - 1]);
  const lookahead = () => (pos < inputCategories.length ? inputCategories[pos] : '$');
  const lexeme = () => (pos < tokens.length ? tokens[pos] : '$');

  const snapshot = (
    actionType: SrActionType | 'INIT',
    actionDisplay: string,
    detail: string,
    handle?: string,
  ): void => {
    steps.push({
      step: steps.length,
      actionType,
      state: topState(),
      lookahead: lookahead(),
      lookaheadLexeme: lexeme(),
      stack: [...stack],
      stackDisplay: stackDisplay(),
      actionDisplay,
      handle,
      detail,
    });
  };

  snapshot('INIT', '—', 'initial');

  for (let iter = 0; iter < 120; iter++) {
    const s = topState();
    const la = lookahead();
    const act = getAction(s, la);

    if (act.kind === 'shift') {
      snapshot('SHIFT', `shift ${act.to}`, `Shift '${lexeme()}'`);
      stack.push(la);
      stack.push(String(act.to));
      pos++;
    } else if (act.kind === 'reduce') {
      const rule = AUG_RULES.find(r => r.label === act.ruleLabel)!;
      const handle = ruleLabel(act.ruleLabel);
      snapshot('REDUCE', `reduce ${act.ruleLabel}`, `Reduce ${handle}`, handle);
      // pop 2·|β| entries (state+symbol pairs)
      for (let i = 0; i < rule.rhs.length * 2; i++) stack.pop();
      const revealedState = topState();
      const gotoState = getGoto(revealedState, rule.lhs);
      if (gotoState == null) {
        snapshot('ERROR', '—', `ERROR: no Goto[${revealedState}, ${rule.lhs}]`);
        break;
      }
      stack.push(rule.lhs);
      stack.push(String(gotoState));
    } else if (act.kind === 'accept') {
      snapshot('ACCEPT', 'accept', 'ACCEPT');
      break;
    } else {
      snapshot('ERROR', '—', `ERROR: unexpected '${lexeme()}' in state ${s}`);
      break;
    }
  }

  return { input, tokens, steps, grammar: RIGHT_RECURSIVE_GRAMMAR };
}
