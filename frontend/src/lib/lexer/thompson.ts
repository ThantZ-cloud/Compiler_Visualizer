import type { NFA, NFAState, NFATransition } from './types';

// ── Thompson Construction — RE → NFA ──
// Every token group is expressed as a regular expression over symbols
// (literal chars or character classes), then compiled to an NFA by applying
// the standard templates:
//   (a) symbol  sN ──a──> sF
//   (c) concat  accept(r) ──ε──> start(s)
//   (d) alt     new start ──ε──> each start; each accept ──ε──> new accept
//   (e) star    new start ──ε──> {r.start, new accept}; r.accept ──ε──> {r.start, new accept}
//
// Each fragment has one start and one accept; no extra edge enters the
// start and no edge leaves the accept. Each builder also records the
// transformation as a node of the RE tree so the viewer can draw the
// machine exactly as it was composed (postorder) instead of inferring
// structure from the flat graph.
//
// r+ and r? are drawn as shorthand expansions (r r* and the
// star-without-back-edge), each wrapped in fresh start/accept states so the
// one-start/one-accept invariant still holds at every composition point.

export const JAVA_KEYWORDS = [
  'abstract','assert','boolean','break','byte','case','catch','char','class','const','continue',
  'default','do','double','else','enum','extends','final','finally','float','for','goto','if',
  'implements','import','instanceof','int','interface','long','native','new','package','private',
  'protected','public','return','short','static','strictfp','super','switch','synchronized','this',
  'throw','throws','transient','try','void','volatile','while','true','false','null','var','record','sealed','permits','yield',
] as const;

// ── Symbol classes: named character classes used as edge labels ──
// subsetConstruction.ts resolves these semantically via `test`, so the DFA
// step stays correct regardless of how many labels share characters.

export interface SymbolClass {
  name: string; // display name, e.g. 'a-z'
  test: (char: string) => boolean;
}

export const SYMBOL_CLASSES: Record<string, SymbolClass> = {
  'a-z': { name: 'a-z', test: (c) => /[a-zA-Z]/.test(c) },
  '0-9': { name: '0-9', test: (c) => /[0-9]/.test(c) },
  'a-f': { name: 'a-f', test: (c) => /[a-fA-F]/.test(c) }, // hex digits
  '_': { name: '_', test: (c) => c === '_' || c === '$' },
  '"': { name: '"', test: (c) => c === '"' },
  'any-str': { name: 'any', test: (c) => c !== '"' && c !== '\n' && c !== '\r' && c !== '\\' },
  'esc-ch': { name: 'char', test: (c) => c !== '\n' && c !== '\r' },
  '.': { name: '.', test: (c) => c === '.' },
  'eE': { name: 'e|E', test: (c) => c === 'e' || c === 'E' },
  '+-': { name: '+|-', test: (c) => c === '+' || c === '-' },
  'xX': { name: 'x|X', test: (c) => c === 'x' || c === 'X' },
  'ws': { name: 'ws', test: (c) => /\s/.test(c) },
  'op': { name: 'op', test: (c) => /[+\-*/=<>&|!^%~?:]/.test(c) },
  'sep': { name: 'sep', test: (c) => /[(){};,.[\]@]/.test(c) },
  '/': { name: '/', test: (c) => c === '/' },
  '*': { name: '*', test: (c) => c === '*' },
  '\\': { name: '\\', test: (c) => c === '\\' },
  // line-comment body: everything up to (not including) the newline
  'not-nl': { name: '[^\\n\\r]', test: (c) => c !== '\n' && c !== '\r' },
  // block-comment body: any character except the closing star (newlines allowed)
  'blk-body': { name: '[^*]', test: (c) => c !== '*' },
  // after a run of stars inside a block comment: anything but star or slash
  'blk-tail': { name: '[^*/]', test: (c) => c !== '*' && c !== '/' },
};

// ── RE tree nodes (ch.2 p.48 sidebar) ──
// Every builder returns a Fragment PLUS the tree node describing the
// transformation, with the concrete state ids it allocated stamped in.

export type ReNode =
  | { kind: 'sym'; label: string; startId: number; acceptId: number }
  | { kind: 'concat'; children: ReNode[]; startId: number; acceptId: number }
  | { kind: 'alt'; children: ReNode[]; startId: number; acceptId: number }
  | { kind: 'star'; child: ReNode; startId: number; acceptId: number }
  | { kind: 'opt'; child: ReNode; startId: number; acceptId: number };

// ── NFA assembly state (module-level, reset per build) ──

let states: NFAState[] = [];
let transitions: NFATransition[] = [];
let counter = 0;

function mkState(): number {
  const s: NFAState = { id: counter++, label: `q${counter - 1}`, isStart: false, isAccept: false };
  states.push(s);
  return s.id;
}

function eps(from: number, to: number): void {
  transitions.push({ from, to, symbol: '' });
}

function sym(from: number, to: number, symbol: string): void {
  transitions.push({ from, to, symbol });
}

/** A Thompson fragment: exactly one start and one accept state, plus its RE tree node. */
interface Built {
  startId: number;
  acceptId: number;
  node: ReNode;
}

// ── The core templates ──

/** (a) NFA for a single symbol (literal char or character-class label). */
function fragSymbol(symbol: string): Built {
  const s = mkState();
  const f = mkState();
  sym(s, f, symbol);
  return { startId: s, acceptId: f, node: { kind: 'sym', label: symbol, startId: s, acceptId: f } };
}

/** (c) NFA for r s … — glue accepts to starts with ε-transitions. */
function fragConcat(parts: Built[]): Built {
  if (parts.length === 0) {
    const s = mkState(); // ε fragment: start === accept (degenerate, unused)
    return { startId: s, acceptId: s, node: { kind: 'concat', children: [], startId: s, acceptId: s } };
  }
  for (let i = 0; i < parts.length - 1; i++) {
    eps(parts[i].acceptId, parts[i + 1].startId);
  }
  return {
    startId: parts[0].startId,
    acceptId: parts[parts.length - 1].acceptId,
    node: {
      kind: 'concat',
      children: parts.map(p => p.node),
      startId: parts[0].startId,
      acceptId: parts[parts.length - 1].acceptId,
    },
  };
}

/** (d) NFA for r | s | … — fresh start/accept, one ε edge pair per branch. */
function fragAlt(parts: Built[]): Built {
  if (parts.length === 1) return parts[0];
  const s = mkState();
  const f = mkState();
  for (const p of parts) {
    eps(s, p.startId);
    eps(p.acceptId, f);
  }
  return {
    startId: s,
    acceptId: f,
    node: { kind: 'alt', children: parts.map(p => p.node), startId: s, acceptId: f },
  };
}

/** (e) NFA for r* — fresh start/accept plus the loop-back ε edge. */
function fragStar(inner: Built): Built {
  const s = mkState();
  const f = mkState();
  eps(s, inner.startId);
  eps(s, f); // zero occurrences
  eps(inner.acceptId, inner.startId); // repeat
  eps(inner.acceptId, f);
  return {
    startId: s,
    acceptId: f,
    node: { kind: 'star', child: inner.node, startId: s, acceptId: f },
  };
}

/**
 * Shorthand r+ = r r*. Takes a FACTORY so the two copies are independent
 * fragments — reusing one fragment twice would wire ε edges back into its
 * internal states, violating the §2.4.2 invariants the drawing relies on.
 */
function fragPlus(makeInner: () => Built): Built {
  return fragConcat([makeInner(), fragStar(makeInner())]);
}

/** NFA for r? — the star template minus the back-edge. */
function fragOpt(inner: Built): Built {
  const s = mkState();
  const f = mkState();
  eps(s, inner.startId);
  eps(s, f); // skip
  eps(inner.acceptId, f);
  return {
    startId: s,
    acceptId: f,
    node: { kind: 'opt', child: inner.node, startId: s, acceptId: f },
  };
}

/** Shorthand: alternation over single-symbol branches (a character class union). */
function fragClassUnion(labels: string[]): Built {
  return fragAlt(labels.map(l => fragSymbol(l)));
}

/** Literal word spelled char-by-char: "for" → f o r concatenated. */
function fragWord(word: string): Built {
  return fragConcat(word.split('').map(ch => fragSymbol(ch)));
}

// ── Token-group regular expressions, built from the templates above ──

function markAccept(frag: Built, acceptType: string): void {
  const st = states[frag.acceptId];
  st.isAccept = true;
  st.acceptType = acceptType;
}

// IDENTIFIER: [a-zA-Z_$] [a-zA-Z0-9_$]*
function identifierRE(): Built {
  return fragConcat([
    fragClassUnion(['a-z', '_']),
    fragStar(fragClassUnion(['a-z', '0-9', '_'])),
  ]);
}

// STRING: " ([^"\n\r\\] | \ . )* "
function stringRE(): Built {
  return fragConcat([
    fragSymbol('"'),
    fragStar(fragAlt([
      fragSymbol('any-str'),
      fragConcat([fragSymbol('\\'), fragSymbol('esc-ch')]),
    ])),
    fragSymbol('"'),
  ]);
}

// NUMBER: 0[xX][0-9a-fA-F]+ | [0-9]+ (. [0-9]+ )? ( [eE] (+|-)? [0-9]+ )?
function numberRE(): Built {
  const digits = () => fragPlus(() => fragSymbol('0-9'));
  const hexDigits = () => fragPlus(() => fragAlt([fragSymbol('0-9'), fragSymbol('a-f')]));
  const exponent = fragOpt(
    fragConcat([
      fragSymbol('eE'),
      fragOpt(fragAlt([fragSymbol('+'), fragSymbol('-')])),
      digits(),
    ]),
  );
  return fragAlt([
    // hex literal — must begin with the digit zero
    fragConcat([fragSymbol('0'), fragSymbol('xX'), hexDigits()]),
    fragConcat([digits(), fragOpt(fragConcat([fragSymbol('.'), digits()])), exponent]),
  ]);
}

// OPERATOR: multi-char operators | single-char operator class (now owns ':' for "?:" / labels)
// Textbook simplified: single-char ops collapsed into 'op' class = [+\-*/=<>&|!^%~?:] (includes ':'), multi-char fan handles '==','::' etc.
function operatorRE(): Built {
  const multiOps = ['==','!=','<=','>=','&&','||','<<','>>','>>>','+=','-=','*=','/=','%=','&=','|=','^=','->','::'];
  return fragAlt([...multiOps.map(op => fragWord(op)), fragSymbol('op')]);
}

// WHITESPACE: [ws]+ (spelled ws ws*)
function whitespaceRE(): Built {
  return fragPlus(() => fragSymbol('ws'));
}

// COMMENT: two forms like HTML/CSS comments:
//   Line:   // hello  -> starts "//", then any chars except newline (star(not-nl))
//   Block:  /* hello */ -> starts "/*", then inside: either normal char [^*] OR a run of '*' not followed by '/' ([^*/]), repeat (*), then at least one '*' and final '/'.
// So: // [^\n\r]*  |  /* ( [^*] | *+ [^*/] )* *+ /  — the *+ [^*/] handles "***" inside without closing early.
function commentRE(): Built {
  return fragAlt([lineComment(), blockComment()]);
}

function lineComment(): Built {
  return fragConcat([fragSymbol('/'), fragSymbol('/'), fragStar(fragSymbol('not-nl'))]);
}

function blockComment(): Built {
  return fragConcat([
    fragSymbol('/'),
    fragSymbol('*'),
    fragStar(fragAlt([
      fragSymbol('blk-body'),
      fragConcat([fragPlus(() => fragSymbol('*')), fragSymbol('blk-tail')]),
    ])),
    fragPlus(() => fragSymbol('*')),
    fragSymbol('/'),
  ]);
}

// KEYWORD: alternation of literal words (each branch its own linear chain)
function keywordRE(): Built {
  return fragAlt(JAVA_KEYWORDS.map(kw => fragWord(kw)));
}

export function keywordREFrom(words: string[]): Built {
  const uniq = Array.from(new Set(words)).filter(w => JAVA_KEYWORDS.includes(w as never));
  // Empty -> single non-accepting dead fragment (isolated states, never marked accept externally)
  if (uniq.length === 0) {
    const s = mkState();
    const f = mkState();
    // no symbol edge → unreachable accept; caller will not mark this acceptType as observable
    return { startId: s, acceptId: f, node: { kind: 'alt', children: [], startId: s, acceptId: f } };
  }
  return fragAlt(uniq.map(kw => fragWord(kw)));
}

// ── Per-group constructions (single source of truth for NFA and viewer) ──

/** Convert a ReNode tree into a human-readable regex string (single source of truth). */
export function reNodeToString(node: ReNode): string {
  switch (node.kind) {
    case 'sym': return node.label;
    case 'concat': return node.children.map(reNodeToString).join(' ');
    case 'alt': return `(${node.children.map(reNodeToString).join(' | ')})`;
    case 'star': return `(${reNodeToString(node.child)})*`;
    case 'opt': return `(${reNodeToString(node.child)})?`;
  }
}

/** Display regex for each group — derived from the construction tree when possible, with a hand-written fallback. */
const GROUP_RES: Record<string, string> = {
  KEYWORD: `${JAVA_KEYWORDS.slice(0, 4).join(' | ')} | … (${JAVA_KEYWORDS.length} keywords)`,
  IDENTIFIER: '[a-zA-Z_$] [a-zA-Z0-9_$]*',
  STRING: '" ([^"\\n\\r\\\\] | \\\\ . )* "',
  NUMBER: '0[xX][0-9a-fA-F]+ | [0-9]+ (. [0-9]+ )? ([eE] (+|-)? [0-9]+ )?', // textbook simplified: no 0b, no _, no L/F/D suffix
  OPERATOR: '== != <= >= && || << >> >>> … | [op]  (op includes :)',
  SEPARATOR: '( ( | ) | { | } | ; | , | . | [ | ] | @ )  —  : moved to OPERATOR',
  WHITESPACE: '[ws] [ws]*',
  COMMENT: '//[^\\n\\r]* | /\\* ( [^*] | \\*+ [^*/] )* \\*+ /  —  line vs block (see code comment)',
};

export interface GroupConstruction {
  name: string;
  /** Human-readable RE summary for the viewer header */
  re: string;
  /** RE tree describing how the fragment was composed (draw order) */
  root: ReNode;
  states: NFAState[];
  transitions: NFATransition[];
  startId: number;
  acceptId: number;
}

const SEPARATOR_LITERALS = ['(', ')', '{', '}', ';', ',', '.', '[', ']', '@'] as const;

function separatorRE(): Built {
  // Punctuation marks as literal alternations — fan shape
  // ':' belongs to OPERATOR (ternary ?:, labels) — single owner avoids duplicate ':' in Flat
  return fragAlt(SEPARATOR_LITERALS.map(ch => fragSymbol(ch)));
}

const GROUP_DEFS: Array<{ build: () => Built; type: string }> = [
  { build: keywordRE, type: 'KEYWORD' },
  { build: identifierRE, type: 'IDENTIFIER' },
  { build: stringRE, type: 'STRING' },
  { build: numberRE, type: 'NUMBER' },
  { build: operatorRE, type: 'OPERATOR' },
  { build: separatorRE, type: 'SEPARATOR' },
  { build: whitespaceRE, type: 'WHITESPACE' },
  { build: commentRE, type: 'COMMENT' },
];

/**
 * Build every token-group fragment in order, snapshotting each group's states
 * and transitions. State ids are deterministic (the counter restarts at 0),
 * so the snapshots match what buildNFA assembles — the viewer can draw a
 * group in isolation while the pipeline consumes the combined NFA.
 * Display RE is derived from the construction tree (single source of truth)
 * with a hand-written fallback from GROUP_RES for compactness.
 */
export function constructGroups(filteredKeywords?: string[]): GroupConstruction[] {
  counter = 0;
  states = [];
  transitions = [];

  // If filteredKeywords provided (even empty), keyword RE becomes dynamic per program
  const defs = filteredKeywords !== undefined
    ? GROUP_DEFS.map(d => d.type === 'KEYWORD' ? { build: () => keywordREFrom(filteredKeywords), type: 'KEYWORD' as const } : d)
    : GROUP_DEFS;

  const out: GroupConstruction[] = [];
  for (const g of defs) {
    const beforeStates = states.length;
    const beforeTrans = transitions.length;
    const frag = g.build();
    // Don't mark empty-keyword dead fragment as accept (no keyword in this program → 0 tokens)
    const isEmptyKeyword = g.type === 'KEYWORD' && filteredKeywords !== undefined && filteredKeywords.length === 0;
    if (!isEmptyKeyword) markAccept(frag, g.type);
    const derived = reNodeToString(frag.node);
    const compact = g.type === 'KEYWORD' || g.type === 'OPERATOR' ? GROUP_RES[g.type] : derived;
    // For dynamic KEYWORD, overwrite compact with actual list when filtered
    const re = g.type === 'KEYWORD' && filteredKeywords !== undefined
      ? (filteredKeywords.length === 0 ? '(no keywords in this file)' : filteredKeywords.join(' | '))
      : compact;
    out.push({
      name: g.type,
      re,
      root: frag.node,
      states: states.slice(beforeStates),
      transitions: transitions.slice(beforeTrans),
      startId: frag.startId,
      acceptId: frag.acceptId,
    });
  }
  return out;
}

/**
 * Build an example NFA: a(b|c)*
 * Used as a walkthrough anchor — shows how the templates compose.
 */
export function buildFigure25Example(): { nfa: NFA; root: ReNode } {
  counter = 0;
  states = [];
  transitions = [];
  const fragA = fragSymbol('a');
  const fragB = fragSymbol('b');
  const fragC = fragSymbol('c');
  const bOrC = fragAlt([fragB, fragC]);
  const star = fragStar(bOrC);
  const full = fragConcat([fragA, star]);
  markAccept(full, 'EXAMPLE');
  return { nfa: { states: [...states], transitions: [...transitions], startState: full.startId }, root: full.node };
}

// ── Combined scanner NFA: unified start with ε edges into every group ──

export function buildNFA(filteredKeywords?: string[]): NFA {
  const groups = constructGroups(filteredKeywords);

  const unifiedStart = mkState();
  states[unifiedStart].isStart = true;
  for (const g of groups) {
    // Skip epsilon fan for empty-keyword dead fragment (no tokens in file)
    const isEmptyKeyword = g.name === 'KEYWORD' && filteredKeywords !== undefined && filteredKeywords.length === 0;
    if (!isEmptyKeyword) eps(unifiedStart, g.startId);
  }

  return { states, transitions, startState: unifiedStart };
}
