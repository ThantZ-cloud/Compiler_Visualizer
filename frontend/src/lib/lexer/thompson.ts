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

export const SYMBOL_CLASSES: Record<string, SymbolClass> = {
  'a-z': { name: 'a-z', test: (c) => /[a-zA-Z]/.test(c) },
  '0-9': { name: '0-9', test: (c) => /[0-9]/.test(c) },
  '_': { name: '_', test: (c) => c === '_' || c === '$' },
  '"': { name: '"', test: (c) => c === '"' },
  'any-str': { name: 'char', test: (c) => c !== '"' && c !== '\n' && c !== '\r' },
  'not-nl': { name: 'not-nl', test: (c) => c !== '\n' && c !== '\r' },
  '.': { name: '.', test: (c) => c === '.' },
  'ws': { name: 'ws', test: (c) => /\s/.test(c) },
  'op': { name: 'op', test: (c) => /[+\-*/=<>&|!^%~?:]/.test(c) },
  'sep': { name: 'sep', test: (c) => /[(){};,.[\]@]/.test(c) },
  '/': { name: '/', test: (c) => c === '/' },
  '*': { name: '*', test: (c) => c === '*' },
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
  // Keywords: start -> letter+ -> accept
  // Simplified: one path for letter recognition
  const start = newState(true, false);
  const mid = newState(false, false);
  const accept = newState(false, true, 'KEYWORD');

  return {
    states: [start, mid, accept],
    transitions: [
      { from: start.id, to: mid.id, symbol: 'a-z' },
      { from: mid.id, to: mid.id, symbol: 'a-z' }, // loop for more letters
      { from: mid.id, to: accept.id, symbol: '' }, // epsilon to accept
    ],
    startId: start.id,
    acceptId: accept.id,
  };
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
  // String: " [^"]* "
  // start -> " -> loop(any except ") -> " -> accept
  const start = newState(true, false);
  const open = newState(false, false);
  const mid = newState(false, false);
  const close = newState(false, false);
  const accept = newState(false, true, 'STRING');

  return {
    states: [start, open, mid, close, accept],
    transitions: [
      { from: start.id, to: open.id, symbol: '"' },
      { from: open.id, to: mid.id, symbol: '' }, // epsilon
      { from: mid.id, to: mid.id, symbol: 'any-str' }, // loop for chars
      { from: mid.id, to: close.id, symbol: '"' },
      { from: close.id, to: accept.id, symbol: '' }, // epsilon to accept
    ],
    startId: start.id,
    acceptId: accept.id,
  };
}

function buildNumberNFA(): NFABuilderResult {
  // Number: [0-9]+ (.[0-9]+)?
  // start -> digit loop -> (epsilon -> accept | . -> digit loop -> accept)
  const start = newState(true, false);
  const intPart = newState(false, false);
  const dot = newState(false, false);
  const decPart = newState(false, false);
  const accept = newState(false, true, 'NUMBER');

  return {
    states: [start, intPart, dot, decPart, accept],
    transitions: [
      { from: start.id, to: intPart.id, symbol: '0-9' },
      { from: intPart.id, to: intPart.id, symbol: '0-9' }, // digit loop
      { from: intPart.id, to: accept.id, symbol: '' }, // epsilon (integer accept)
      { from: intPart.id, to: dot.id, symbol: '.' },
      { from: dot.id, to: decPart.id, symbol: '0-9' },
      { from: decPart.id, to: decPart.id, symbol: '0-9' }, // decimal loop
      { from: decPart.id, to: accept.id, symbol: '' }, // epsilon (decimal accept)
    ],
    startId: start.id,
    acceptId: accept.id,
  };
}

function buildOperatorNFA(): NFABuilderResult {
  // Operator: single-char operators (multi-char ones like == && handled in
  // the scanner via the backend's operator table)
  // Simplified: start -> op -> accept
  const start = newState(true, false);
  const accept = newState(false, true, 'OPERATOR');

  return {
    states: [start, accept],
    transitions: [
      { from: start.id, to: accept.id, symbol: 'op' },
    ],
    startId: start.id,
    acceptId: accept.id,
  };
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
  // Comment: // [^\n]*  (line comment)
  // start -> / -> / -> loop(not newline) -> accept
  const start = newState(true, false);
  const s1 = newState(false, false);
  const s2 = newState(false, false);
  const accept = newState(false, true, 'COMMENT');

  return {
    states: [start, s1, s2, accept],
    transitions: [
      { from: start.id, to: s1.id, symbol: '/' },
      { from: s1.id, to: s2.id, symbol: '/' },
      { from: s2.id, to: s2.id, symbol: 'not-nl' }, // loop for comment body
      { from: s2.id, to: accept.id, symbol: '' }, // epsilon to accept
    ],
    startId: start.id,
    acceptId: accept.id,
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
