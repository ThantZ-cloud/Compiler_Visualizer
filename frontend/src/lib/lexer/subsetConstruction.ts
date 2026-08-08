import type { NFA, DFA, DFAState, DFATransition, SubsetConstructionStep } from './types';
import { SYMBOL_CLASSES } from './thompson';

// ── Subset Construction: NFA → DFA ──
// Classic algorithm:
// 1. Start with ε-closure of the NFA start state
// 2. For each DFA state, for each input symbol, compute the set of NFA states reachable
// 3. If the resulting set is new, create a new DFA state
// 4. Repeat until no new states (fixed point)

/** Compute ε-closure of a set of NFA states */
function epsilonClosure(nfaStates: Set<number>, nfa: NFA): Set<number> {
  const result = new Set(nfaStates);
  const stack = [...nfaStates];

  while (stack.length > 0) {
    const state = stack.pop()!;
    // Find all ε-transitions from this state
    for (const t of nfa.transitions) {
      if (t.from === state && t.symbol === '' && !result.has(t.to)) {
        result.add(t.to);
        stack.push(t.to);
      }
    }
  }

  return result;
}

/** Compute the set of NFA states reachable from a set of states on a given symbol */
function move(nfaStates: Set<number>, symbol: string, nfa: NFA): Set<number> {
  const result = new Set<number>();
  for (const state of nfaStates) {
    for (const t of nfa.transitions) {
      if (t.from === state && t.symbol === symbol) {
        result.add(t.to);
      }
    }
  }
  return result;
}

/** Get all input symbols used in the NFA (excluding ε) */
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

/**
 * Convert an NFA to a DFA using subset construction.
 * Returns the DFA and a log of each step for visualization.
 */
export function subsetConstruction(nfa: NFA): { dfa: DFA; steps: SubsetConstructionStep[] } {
  const inputSymbols = getInputSymbols(nfa);
  const steps: SubsetConstructionStep[] = [];

  // Start: ε-closure of NFA start state
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

    for (const symbol of inputSymbols) {
      // move(currentSet, symbol)
      const moveSet = move(currentNfaSet, symbol, nfa);
      if (moveSet.size === 0) continue;

      // ε-closure of move set
      const closure = epsilonClosure(moveSet, nfa);
      if (closure.size === 0) continue;

      const key = setKey(closure);
      const existingId = stateMap.get(key);
      const isNew = existingId === undefined;

      let targetDfaId: number;

      if (isNew) {
        // Create new DFA state
        const acceptType = findAcceptType(closure, nfa);
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

      // Add transition
      dfaTransitions.push({
        from: currentDfaId,
        to: targetDfaId,
        symbol,
      });

      steps.push({
        dfaStateId: currentDfaId,
        nfaSubset: Array.from(currentNfaSet).sort((a, b) => a - b),
        inputSymbol: symbol,
        resultingNFAStates: Array.from(closure).sort((a, b) => a - b),
        isNewState: isNew,
        description: isNew
          ? `D${currentDfaId} --[${symbol}]--> {${Array.from(closure).sort((a, b) => a - b).map(s => `q${s}`).join(', ')}} → D${targetDfaId} (NEW STATE${acceptTypeLabel(closure, nfa)})`
          : `D${currentDfaId} --[${symbol}]--> D${targetDfaId} (existing)`,
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
    },
    steps,
  };
}

function acceptTypeLabel(closure: Set<number>, nfa: NFA): string {
  const type = findAcceptType(closure, nfa);
  return type ? `, accept: ${type}` : '';
}

/** Resolve a symbol class name to test a character */
export function testSymbol(symbol: string, char: string): boolean {
  const cls = SYMBOL_CLASSES[symbol];
  if (cls) return cls.test(char);
  // Direct character match
  return symbol === char;
}
