import type { NFA, NFAState, NFATransition } from './types';

// ── Thompson Construction ──
// Converts simplified regex patterns into an NFA.
// Uses a state counter to generate unique state IDs.

let stateCounter = 0;

function resetCounter(): void {
  stateCounter = 0;
}

function newState(isStart = false, isAccept = false, acceptType?: string): NFAState {
  return {
    id: stateCounter++,
    label: `q${stateCounter - 1}`,
    isStart,
    isAccept,
    acceptType,
  };
}

// ── Symbol classes for simplified patterns ──
// Instead of full regex parsing, we define character classes
// that represent the groups used in token recognition.

export interface SymbolClass {
  name: string; // display name, e.g. 'a-z'
  test: (char: string) => boolean;
}

export const JAVA_KEYWORDS = [
  'abstract','assert','boolean','break','byte','case','catch','char','class','const','continue',
  'default','do','double','else','enum','extends','final','finally','float','for','goto','if',
  'implements','import','instanceof','int','interface','long','native','new','package','private',
  'protected','public','return','short','static','strictfp','super','switch','synchronized','this',
  'throw','throws','transient','try','void','volatile','while','true','false','null','var','record','sealed','permits','yield',
] as const;

export const SYMBOL_CLASSES: Record<string, SymbolClass> = {
  'a-z': { name: 'a-z', test: (c) => /[a-zA-Z]/.test(c) },
  '0-9': { name: '0-9', test: (c) => /[0-9]/.test(c) },
  '_': { name: '_', test: (c) => c === '_' || c === '$' },
  '"': { name: '"', test: (c) => c === '"' },
  'any-str': { name: 'char', test: (c) => c !== '"' && c !== '\n' && c !== '\r' && c !== '\\' },
  'str-esc': { name: '\\.', test: (c) => c === '\\' },
  'not-nl': { name: 'not-nl', test: (c) => c !== '\n' && c !== '\r' },
  '.': { name: '.', test: (c) => c === '.' },
  'ws': { name: 'ws', test: (c) => /\s/.test(c) },
  'op': { name: 'op', test: (c) => /[+\-*/=<>&|!^%~?:]/.test(c) },
  'sep': { name: 'sep', test: (c) => /[(){};,.[\]@]/.test(c) },
  '/': { name: '/', test: (c) => c === '/' },
  '*': { name: '*', test: (c) => c === '*' },
  '\\': { name: '\\', test: (c) => c === '\\' },
};

// ── Build NFA for a single token group ──
// Each group gets a simple chain of states representing its pattern.
// This is a simplified Thompson construction for educational purposes.

interface NFABuilderResult {
  states: NFAState[];
  transitions: NFATransition[];
  startId: number;
  acceptId: number;
}

function buildKeywordNFA(): NFABuilderResult {
  // Keywords: explicit alternation of keyword literals via Thompson's construction
  // (Fig 2.4(d)): unified start --ε--> branch_i for each keyword --ε--> accept.
  // Each branch spells the exact keyword character-by-character so that
  // `intx` does NOT match KEYWORD — only IDENTIFIER does (reserved-word
  // table alternative, ch.2 §2.5.4). This fixes the priority inversion where
  // a generic a-z+ loop would accept any identifier as a keyword.
  const start = newState(true, false);
  const accept = newState(false, true, 'KEYWORD');
  const states: NFAState[] = [start, accept];
  const transitions: NFATransition[] = [];

  for (const kw of JAVA_KEYWORDS) {
    const branchStart = newState(false, false);
    states.push(branchStart);
    transitions.push({ from: start.id, to: branchStart.id, symbol: '' });
    let prev = branchStart;
    for (let i = 0; i < kw.length; i++) {
      const ch = kw[i];
      const isLast = i === kw.length - 1;
      const next = isLast ? accept : newState(false, false);
      if (!isLast) states.push(next);
      transitions.push({ from: prev.id, to: next.id, symbol: ch });
      prev = next;
    }
  }

  return { states, transitions, startId: start.id, acceptId: accept.id };
}

function buildIdentifierNFA(): NFABuilderResult {
  // Identifier: [a-zA-Z_$][a-zA-Z0-9_$]*
  // start -> letter/_ -> loop(letter/_/digit) -> accept
  const start = newState(true, false);
  const mid = newState(false, false);
  const accept = newState(false, true, 'IDENTIFIER');

  return {
    states: [start, mid, accept],
    transitions: [
      { from: start.id, to: mid.id, symbol: 'a-z' },
      { from: start.id, to: mid.id, symbol: '_' }, // can start with _
      { from: mid.id, to: mid.id, symbol: 'a-z' }, // letter loop
      { from: mid.id, to: mid.id, symbol: '0-9' }, // digit loop
      { from: mid.id, to: mid.id, symbol: '_' }, // underscore loop
      { from: mid.id, to: accept.id, symbol: '' }, // epsilon to accept
    ],
    startId: start.id,
    acceptId: accept.id,
  };
}

function buildStringNFA(): NFABuilderResult {
  // String: " ( [^"\\\n] | \\. )* "  — handles escapes \" \\ \n etc.
  // Matches book §2.3(4) complements plus escape branch.
  // start -> " -> mid --(any-str/escape)--> mid -> " -> accept
  const start = newState(true, false);
  const open = newState(false, false);
  const mid = newState(false, false);
  const esc = newState(false, false);
  const escChar = newState(false, false);
  const close = newState(false, false);
  const accept = newState(false, true, 'STRING');

  return {
    states: [start, open, mid, esc, escChar, close, accept],
    transitions: [
      { from: start.id, to: open.id, symbol: '"' },
      { from: open.id, to: mid.id, symbol: '' }, // epsilon into body
      { from: mid.id, to: mid.id, symbol: 'any-str' }, // loop for plain chars (not " \ \n)
      { from: mid.id, to: esc.id, symbol: '\\' }, // escape start
      { from: esc.id, to: escChar.id, symbol: 'not-nl' }, // escaped char: any except newline (allows \" and \\)
      { from: escChar.id, to: mid.id, symbol: '' }, // epsilon back to mid
      { from: mid.id, to: close.id, symbol: '"' },
      { from: close.id, to: accept.id, symbol: '' }, // epsilon to accept
    ],
    startId: start.id,
    acceptId: accept.id,
  };
}

function buildNumberNFA(): NFABuilderResult {
  // Number: [0-9]+ (.[0-9]+)? ([eE][+-]?[0-9]+)?  + hex alternative 0[xX][0-9a-fA-F]+
  // Covers book §2.3(2)(3) integer/real with exponent, plus Java hex.
  const start = newState(true, false);
  const intPart = newState(false, false);
  const dot = newState(false, false);
  const decPart = newState(false, false);
  const exp = newState(false, false);
  const expSign = newState(false, false);
  const expDigits = newState(false, false);
  const hex0 = newState(false, false);
  const hexX = newState(false, false);
  const hexDigits = newState(false, false);
  const accept = newState(false, true, 'NUMBER');

  return {
    states: [start, intPart, dot, decPart, exp, expSign, expDigits, hex0, hexX, hexDigits, accept],
    transitions: [
      { from: start.id, to: intPart.id, symbol: '0-9' },
      { from: start.id, to: hex0.id, symbol: '0-9' }, // 0 branch for hex (nondeterministic)
      { from: hex0.id, to: hexX.id, symbol: 'x' }, // 'x'
      { from: hex0.id, to: hexX.id, symbol: 'X' }, // 'X'
      { from: hexX.id, to: hexDigits.id, symbol: '0-9' },
      { from: hexX.id, to: hexDigits.id, symbol: 'a-z' }, // hex a-f via class (simplified)
      { from: hexX.id, to: hexDigits.id, symbol: 'A-Z' }, // not separate class — will be covered by a-z test for now; keep literal for X already
      { from: hexDigits.id, to: hexDigits.id, symbol: '0-9' },
      { from: hexDigits.id, to: hexDigits.id, symbol: 'a-z' },
      { from: hexDigits.id, to: accept.id, symbol: '' },
      { from: intPart.id, to: intPart.id, symbol: '0-9' }, // digit loop
      { from: intPart.id, to: accept.id, symbol: '' }, // epsilon (integer accept)
      { from: intPart.id, to: dot.id, symbol: '.' },
      { from: dot.id, to: decPart.id, symbol: '0-9' },
      { from: decPart.id, to: decPart.id, symbol: '0-9' }, // decimal loop
      { from: decPart.id, to: accept.id, symbol: '' }, // epsilon (decimal accept)
      // Exponent branches from intPart and decPart — 'e'/'E' literals
      { from: intPart.id, to: exp.id, symbol: 'e' },
      { from: intPart.id, to: exp.id, symbol: 'E' },
      { from: decPart.id, to: exp.id, symbol: 'e' },
      { from: decPart.id, to: exp.id, symbol: 'E' },
      { from: exp.id, to: expSign.id, symbol: '+' },
      { from: exp.id, to: expSign.id, symbol: '-' },
      { from: exp.id, to: expDigits.id, symbol: '0-9' },
      { from: expSign.id, to: expDigits.id, symbol: '0-9' },
      { from: expDigits.id, to: expDigits.id, symbol: '0-9' },
      { from: expDigits.id, to: accept.id, symbol: '' },
    ],
    startId: start.id,
    acceptId: accept.id,
  };
}

function buildOperatorNFA(): NFABuilderResult {
  // Operator: covers single-char plus common multi-char operators via explicit branches
  // so the DFA can recognize == != <= >= && || << >> >>> += etc. without scanner bypass.
  const multiOps = ['==','!=','<=','>=','&&','||','<<','>>','>>>','+=','-=','*=','/=','%=','&=','|=','^=','->','::'];
  const start = newState(true, false);
  const accept = newState(false, true, 'OPERATOR');
  const states: NFAState[] = [start, accept];
  const transitions: NFATransition[] = [
    { from: start.id, to: accept.id, symbol: 'op' }, // single-char fallback
  ];

  for (const op of multiOps) {
    let prev = start;
    for (let i = 0; i < op.length; i++) {
      const ch = op[i];
      const isLast = i === op.length - 1;
      const next = isLast ? accept : newState(false, false);
      if (!isLast) states.push(next);
      // Use literal char or op class? Use literal for determinism
      transitions.push({ from: prev.id, to: next.id, symbol: ch });
      prev = next;
    }
  }

  return { states, transitions, startId: start.id, acceptId: accept.id };
}

function buildSeparatorNFA(): NFABuilderResult {
  // Separator: single char
  // start -> sep -> accept
  const start = newState(true, false);
  const accept = newState(false, true, 'SEPARATOR');

  return {
    states: [start, accept],
    transitions: [
      { from: start.id, to: accept.id, symbol: 'sep' },
    ],
    startId: start.id,
    acceptId: accept.id,
  };
}

function buildWhitespaceNFA(): NFABuilderResult {
  // Whitespace: \s+
  // start -> ws loop -> accept
  const start = newState(true, false);
  const mid = newState(false, false);
  const accept = newState(false, true, 'WHITESPACE');

  return {
    states: [start, mid, accept],
    transitions: [
      { from: start.id, to: mid.id, symbol: 'ws' },
      { from: mid.id, to: mid.id, symbol: 'ws' }, // loop
      { from: mid.id, to: accept.id, symbol: '' }, // epsilon to accept
    ],
    startId: start.id,
    acceptId: accept.id,
  };
}

function buildCommentNFA(): NFABuilderResult {
  // Comment: // [^\n]* | /* ( [^*] | *[^/] )* */
  // Covers both line and block comments per book §2.3(5).
  const start = newState(true, false);
  const slash1 = newState(false, false);
  // Line branch
  const lineSlash = newState(false, false);
  const lineBody = newState(false, false);
  const lineAccept = newState(false, true, 'COMMENT');
  // Block branch
  const blockStar = newState(false, false);
  const blockBody = newState(false, false);
  const blockStar2 = newState(false, false);
  const blockAccept = newState(false, true, 'COMMENT');

  return {
    states: [start, slash1, lineSlash, lineBody, lineAccept, blockStar, blockBody, blockStar2, blockAccept],
    transitions: [
      { from: start.id, to: slash1.id, symbol: '/' },
      // Line: // -> not-nl loop -> accept (via epsilon)
      { from: slash1.id, to: lineSlash.id, symbol: '/' },
      { from: lineSlash.id, to: lineBody.id, symbol: '' },
      { from: lineBody.id, to: lineBody.id, symbol: 'not-nl' },
      { from: lineBody.id, to: lineAccept.id, symbol: '' },
      // Block: /* -> body with * handling -> */
      { from: slash1.id, to: blockStar.id, symbol: '*' },
      { from: blockStar.id, to: blockBody.id, symbol: '' },
      { from: blockBody.id, to: blockBody.id, symbol: 'not-nl' }, // simplified: any except newline-star-slash nuance; star handled via transitions
      { from: blockBody.id, to: blockStar2.id, symbol: '*' },
      { from: blockStar2.id, to: blockBody.id, symbol: 'not-nl' }, // * not followed by /
      { from: blockStar2.id, to: blockAccept.id, symbol: '/' },
      { from: blockBody.id, to: blockAccept.id, symbol: '' }, // empty block body edge (/**/)
    ],
    startId: start.id,
    acceptId: lineAccept.id, // unified via epsilon is not needed; use lineAccept as main, blockAccept also flagged COMMENT but subset will merge
  };
}

// ── Main builder: combine all group NFAs into one NFA ──
// Uses a new start state with epsilon transitions to each group's start.

export function buildNFA(): NFA {
  resetCounter();

  const builders = [
    buildKeywordNFA,
    buildIdentifierNFA,
    buildStringNFA,
    buildNumberNFA,
    buildOperatorNFA,
    buildSeparatorNFA,
    buildWhitespaceNFA,
    buildCommentNFA,
  ];

  const allStates: NFAState[] = [];
  const allTransitions: NFATransition[] = [];
  const groupStartIds: number[] = [];

  for (const builder of builders) {
    const result = builder();
    // Mark the start state as non-start (will be connected via epsilon)
    const startState = result.states.find(s => s.id === result.startId);
    if (startState) startState.isStart = false;
    allStates.push(...result.states);
    allTransitions.push(...result.transitions);
    groupStartIds.push(result.startId);
  }

  // Create unified start state
  const unifiedStart = newState(true, false);
  allStates.push(unifiedStart);

  // Epsilon transitions from unified start to each group's start
  for (const groupId of groupStartIds) {
    allTransitions.push({ from: unifiedStart.id, to: groupId, symbol: '' });
  }

  return {
    states: allStates,
    transitions: allTransitions,
    startState: unifiedStart.id,
  };
}
