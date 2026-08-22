import type { NFA, DFA, DFAState, DFATransition, SubsetConstructionStep } from './types';
import { SYMBOL_CLASSES } from './thompson';

// ── Subset Construction: NFA → DFA ──
//
// The NFA's transitions are labeled with a mix of literal characters ('i',
// '>') and character classes ('a-z', 'op'). Several labels can match the SAME
// input character (e.g. both the literal 'i' and the class 'a-z' match 'i').
// Building the DFA with exact-string moves produces a *label-deterministic*
// but *character-nondeterministic* machine: the scanner then picks whichever
// edge happens to come first, mis-lexing "go" (goto branch wins, identifier
// branch never advances), splitting ">=" into ">" + "=", and mangling
// identifiers that start like keywords ("flag", "intValue").
//
// Fix: partition the character alphabet into canonical groups first. Every
// character in a group matches exactly the same set of transition labels, so
// one merged DFA edge per group is fully deterministic over characters.
// Each edge keeps every matching label (`symbols`) plus a display label
// (`symbol`) and the group id (`classId`) used by minimization.

/** Test whether a transition label matches a concrete character */
export function labelMatches(label: string, ch: string): boolean {
  const cls = SYMBOL_CLASSES[label];
  if (cls) return cls.test(ch);
  return label === ch; // literal character
}

interface CanonicalGroup {
  /** A representative character of the group */
  char: string;
  /** All transition labels that match this character */
  labels: string[];
}

/**
 * Partition the alphabet into groups of characters that match exactly
 * the same set of NFA transition labels. We sample the full printable ASCII
 * range (32-126) plus \t,\n,\r so that every character class boundary is
 * represented — sparse per-class probes missed uppercase non-hex letters like
 * 'M' which needs its own {a-z, any-str, not-nl} group distinct from the
 * {a-z, a-f, any-str, not-nl} group of hex letters.
 */
function buildCanonicalGroups(symbols: string[]): CanonicalGroup[] {
  const probes: string[] = [];
  for (let c = 32; c <= 126; c++) probes.push(String.fromCharCode(c));
  probes.push('\t', '\n', '\r');

  const groups = new Map<string, CanonicalGroup>();
  for (const p of probes) {
    const matched = symbols.filter(s => labelMatches(s, p));
    if (matched.length === 0) continue;
    const key = matched.join('\u0000');
    if (!groups.has(key)) groups.set(key, { char: p, labels: matched });
  }
  return Array.from(groups.values());
}

/** Compute ε-closure of a set of NFA states */
function epsilonClosure(nfaStates: Set<number>, nfa: NFA): Set<number> {
  const result = new Set(nfaStates);
  const stack = [...nfaStates];

  while (stack.length > 0) {
    const state = stack.pop()!;
    for (const t of nfa.transitions) {
      if (t.from === state && t.symbol === '' && !result.has(t.to)) {
        result.add(t.to);
        stack.push(t.to);
      }
    }
  }

  return result;
}

/**
 * Compute the set of NFA states reachable from a set of states on a concrete
 * character. Matches labels semantically (class tests), not by string equality.
 */
function move(nfaStates: Set<number>, ch: string, nfa: NFA): Set<number> {
  const result = new Set<number>();
  for (const state of nfaStates) {
    for (const t of nfa.transitions) {
      if (t.from === state && t.symbol !== '' && labelMatches(t.symbol, ch)) {
        result.add(t.to);
      }
    }
  }
  return result;
}

/** Get all input symbols used in the NFA (excluding ε), in first-seen order */
function getInputSymbols(nfa: NFA): string[] {
  const symbols = new Set<string>();
  for (const t of nfa.transitions) {
    if (t.symbol !== '') {
      symbols.add(t.symbol);
    }
  }
  return Array.from(symbols);
}

/** Convert a set of numbers to a sortable string key */
function setKey(s: Set<number>): string {
  return Array.from(s).sort((a, b) => a - b).join(',');
}

/** Find the accept type for a set of NFA states (if any accept state is included) */
function findAcceptType(nfaStates: Set<number>, nfa: NFA): string | undefined {
  // Sort by state ID: lower IDs were built first (higher precedence), so
  // e.g. KEYWORD always wins over IDENTIFIER for the same string.
  const sortedIds = Array.from(nfaStates).sort((a, b) => a - b);
  for (const stateId of sortedIds) {
    const state = nfa.states.find(s => s.id === stateId);
    if (state?.isAccept && state.acceptType) {
      return state.acceptType;
    }
  }
  return undefined;
}

/** Sort edge labels for display: single-char literals first, then classes */
function sortLabels(labels: string[], order: Map<string, number>): string[] {
  return [...labels].sort((a, b) => {
    const aLit = !SYMBOL_CLASSES[a] ? 0 : 1;
    const bLit = !SYMBOL_CLASSES[b] ? 0 : 1;
    if (aLit !== bLit) return aLit - bLit;
    return (order.get(a) ?? 999) - (order.get(b) ?? 999);
  });
}

/** Compact display label for an edge, e.g. "i|a-z" or "==|=|+" → "=|== +1" */
function displayLabel(sortedLabels: string[]): string {
  if (sortedLabels.length === 0) return '';
  if (sortedLabels.length === 1) return sortedLabels[0];
  const head = `${sortedLabels[0]}|${sortedLabels[1]}`;
  return sortedLabels.length > 2 ? `${head} +${sortedLabels.length - 2}` : head;
}

/**
 * Maps any input character to the index of the canonical character group it
 * belongs to. Two different characters in the same group match exactly the
 * same set of NFA transition labels, so the DFA edge for that group is the
 * unique deterministic transition for both. The scanner uses this so that,
 * from a state, a character follows exactly one edge (the one whose
 * `classId` equals the group index) — avoiding the original bug where the
 * `a-z` class label on several distinct edges caused `p` to wrongly follow
 * the `a`-group edge.
 */
export class CharAlphabet {
  private allSymbols: string[];
  private groups: CanonicalGroup[];

  constructor(allSymbols: string[], groups: CanonicalGroup[]) {
    this.allSymbols = allSymbols;
    this.groups = groups;
  }

  /** Index of the canonical group for `ch`, or -1 if it matches nothing */
  groupId(ch: string): number {
    outer: for (let i = 0; i < this.groups.length; i++) {
      const labels = this.groups[i].labels;
      for (const s of this.allSymbols) {
        const m = labelMatches(s, ch);
        if (m !== labels.includes(s)) continue outer;
      }
      return i;
    }
    return -1;
  }
}

/**
 * Convert an NFA to a DFA using subset construction.
 * Returns the DFA and a log of each step for visualization.
 */
export function subsetConstruction(nfa: NFA): { dfa: DFA; steps: SubsetConstructionStep[] } {
  const inputSymbols = getInputSymbols(nfa);
  const symbolOrder = new Map(inputSymbols.map((s, i) => [s, i]));
  const canonGroups = buildCanonicalGroups(inputSymbols);

  // Pre-resolve each canonical group to its matching transitions per state:
  // groupIndex -> (nfaState -> target list) speeds up move() below.
  const steps: SubsetConstructionStep[] = [];

  // Start: ε-closure of the NFA start state
  const startClosure = epsilonClosure(new Set([nfa.startState]), nfa);

  const dfaStates: DFAState[] = [];
  const dfaTransitions: DFATransition[] = [];
  const stateMap = new Map<string, number>(); // setKey → DFA state ID
  const worklist: { id: number; nfaSet: Set<number> }[] = [];

  // Create initial DFA state
  const startAcceptType = findAcceptType(startClosure, nfa);
  const startState: DFAState = {
    id: 0,
    label: 'D0',
    nfaStates: Array.from(startClosure).sort((a, b) => a - b),
    isStart: true,
    isAccept: !!startAcceptType,
    acceptType: startAcceptType,
  };
  dfaStates.push(startState);
  stateMap.set(setKey(startClosure), 0);
  worklist.push({ id: 0, nfaSet: startClosure });

  steps.push({
    dfaStateId: 0,
    nfaSubset: Array.from(startClosure).sort((a, b) => a - b),
    inputSymbol: 'ε-closure',
    resultingNFAStates: Array.from(startClosure).sort((a, b) => a - b),
    isNewState: true,
    description: `ε-closure(start) = {${Array.from(startClosure).sort((a, b) => a - b).map(s => `q${s}`).join(', ')}} → D0 (start state)`,
  });

  let nextId = 1;

  // Process worklist until empty (fixed point)
  while (worklist.length > 0) {
    const { id: currentDfaId, nfaSet: currentNfaSet } = worklist.shift()!;

    // One deterministic edge per canonical character group; groups whose
    // closures coincide are merged into a single edge that records EVERY
    // group id it responds to (the scanner classifies a char to its group
    // and follows the edge listing that group).
    const byTarget = new Map<string, { to: number; labels: string[]; isNew: boolean; acceptType?: string; groupIds: number[] }>();

    for (let g = 0; g < canonGroups.length; g++) {
      const group = canonGroups[g];
      const moveSet = move(currentNfaSet, group.char, nfa);
      if (moveSet.size === 0) continue;

      const closure = epsilonClosure(moveSet, nfa);
      if (closure.size === 0) continue;

      const key = setKey(closure);
      const existingId = stateMap.get(key);
      const isNew = existingId === undefined;

      let targetDfaId: number;
      let acceptType: string | undefined;

      if (isNew) {
        acceptType = findAcceptType(closure, nfa);
        const newState: DFAState = {
          id: nextId,
          label: `D${nextId}`,
          nfaStates: Array.from(closure).sort((a, b) => a - b),
          isStart: false,
          isAccept: !!acceptType,
          acceptType,
        };
        dfaStates.push(newState);
        stateMap.set(key, nextId);
        worklist.push({ id: nextId, nfaSet: closure });
        targetDfaId = nextId;
        nextId++;
      } else {
        targetDfaId = existingId!;
      }

      const mergeKey = key;
      const slot = byTarget.get(mergeKey);
      if (slot) {
        slot.labels.push(...group.labels);
        slot.groupIds.push(g);
      } else {
        byTarget.set(mergeKey, { to: targetDfaId, labels: [...group.labels], isNew, acceptType, groupIds: [g] });
      }
    }

    for (const { to, labels, isNew, acceptType, groupIds } of byTarget.values()) {
      const sorted = sortLabels([...new Set(labels)], symbolOrder);
      dfaTransitions.push({
        from: currentDfaId,
        to,
        symbol: displayLabel(sorted),
        symbols: sorted,
        classIds: groupIds,
      });

      const labelStr = displayLabel(sorted);
      steps.push({
        dfaStateId: currentDfaId,
        nfaSubset: Array.from(currentNfaSet).sort((a, b) => a - b),
        inputSymbol: labelStr,
        resultingNFAStates: [],
        isNewState: isNew,
        description: isNew
          ? `D${currentDfaId} --[${labelStr}]--> D${to} (NEW STATE${acceptType ? `, accept: ${acceptType}` : ''})`
          : `D${currentDfaId} --[${labelStr}]--> D${to} (existing)`,
      });
    }
  }

  steps.push({
    dfaStateId: -1,
    nfaSubset: [],
    inputSymbol: '',
    resultingNFAStates: [],
    isNewState: false,
    description: `Fixed point reached: ${dfaStates.length} DFA states created from ${nfa.states.length} NFA states.`,
  });

  return {
    dfa: {
      states: dfaStates,
      transitions: dfaTransitions,
      startState: 0,
      alphabet: new CharAlphabet(inputSymbols, canonGroups),
    },
    steps,
  };
}

/** Resolve a symbol class name to test a character */
export function testSymbol(symbol: string, char: string): boolean {
  const cls = SYMBOL_CLASSES[symbol];
  if (cls) return cls.test(char);
  // Direct character match
  return symbol === char;
}
