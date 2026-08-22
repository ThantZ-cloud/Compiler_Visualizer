import type { DFA, DFAState } from './types';

// ── Hopcroft DFA Minimization ──
// Implements partition refinement per wiki/chapter_2.md §2.4.4 (Fig 2.9).
// Two fixed points: subset construction (NFA→DFA) and Hopcroft (DFA→min DFA).
// The pipeline previously conflated them; this module makes the second explicit.

export interface HopcroftStep {
  iteration: number;
  partition: number[][]; // groups of DFA state ids
  description: string;
}

export interface HopcroftResult {
  minDfa: DFA;
  steps: HopcroftStep[];
  originalStateCount: number;
  minimizedStateCount: number;
}

/**
 * Minimize a DFA using Hopcroft's algorithm.
 * Returns the minimal DFA plus a log of partition refinements for visualization.
 */
export function hopcroftMinimization(dfa: DFA): HopcroftResult {
  const n = dfa.states.length;
  if (n === 0) {
    return { minDfa: dfa, steps: [], originalStateCount: 0, minimizedStateCount: 0 };
  }

  // Build transition map: stateId -> symbol -> targetId
  const transMap = new Map<number, Map<string, number>>();
  for (const t of dfa.transitions) {
    if (!transMap.has(t.from)) transMap.set(t.from, new Map());
    transMap.get(t.from)!.set(t.symbol, t.to);
  }

  // Input symbols
  const symbols = Array.from(new Set(dfa.transitions.map(t => t.symbol)));

  // Initial partition: group by acceptType (including non-accept)
  const groups = new Map<string, number[]>();
  for (const s of dfa.states) {
    const key = s.isAccept ? (s.acceptType ?? 'ACCEPT') : '__NON_ACCEPT__';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(s.id);
  }
  let partition: number[][] = Array.from(groups.values());
  const steps: HopcroftStep[] = [];
  steps.push({
    iteration: 0,
    partition: partition.map(g => [...g]),
    description: `Initial partition: ${partition.length} groups — ${partition.map(g => `{${g.map(id => `D${id}`).join(',')}}`).join(' | ')} (by accept type)`,
  });

  // Helper: find group index for a state
  const groupOf = (stateId: number): number => {
    for (let i = 0; i < partition.length; i++) if (partition[i].includes(stateId)) return i;
    return -1;
  };

  // Hopcroft refinement loop
  let iteration = 1;
  let changed = true;
  while (changed) {
    changed = false;
    const newPartition: number[][] = [];
    for (const group of partition) {
      if (group.length <= 1) {
        newPartition.push(group);
        continue;
      }
      // Split group by transition signature: for each symbol, which group the target belongs to
      const sigMap = new Map<string, number[]>();
      for (const stateId of group) {
        const sigParts: string[] = [];
        for (const sym of symbols) {
          const target = transMap.get(stateId)?.get(sym);
          const targetGroup = target !== undefined ? groupOf(target) : -1;
          sigParts.push(`${sym}->${targetGroup}`);
        }
        const sig = sigParts.join('|');
        if (!sigMap.has(sig)) sigMap.set(sig, []);
        sigMap.get(sig)!.push(stateId);
      }
      if (sigMap.size > 1) {
        changed = true;
        for (const sub of sigMap.values()) newPartition.push(sub);
      } else {
        newPartition.push(group);
      }
    }
    if (changed) {
      partition = newPartition;
      steps.push({
        iteration: iteration++,
        partition: partition.map(g => [...g]),
        description: `Refinement ${iteration - 1}: split into ${partition.length} groups — ${partition.map(g => `{${g.map(id => `D${id}`).join(',')}}`).join(' | ')}`,
      });
    }
  }

  steps.push({
    iteration,
    partition: partition.map(g => [...g]),
    description: `Fixed point reached: ${partition.length} minimal states from ${n} original states (Hopcroft partition refinement converged).`,
  });

  // Build minimized DFA: each partition group becomes one state
  const repMap = new Map<number, number>(); // original id -> new id (group index)
  partition.forEach((group, idx) => {
    for (const id of group) repMap.set(id, idx);
  });

  const minStates: DFAState[] = partition.map((group, idx) => {
    const repId = group[0];
    const orig = dfa.states.find(s => s.id === repId)!;
    const isStart = group.includes(dfa.startState);
    return {
      id: idx,
      label: `M${idx}`,
      nfaStates: group.flatMap(id => dfa.states.find(s => s.id === id)?.nfaStates ?? []),
      isStart,
      isAccept: orig.isAccept,
      acceptType: orig.acceptType,
    };
  });

  const seen = new Set<string>();
  const minTransitions: DFA['transitions'] = [];
  for (const t of dfa.transitions) {
    const fromMin = repMap.get(t.from)!;
    const toMin = repMap.get(t.to)!;
    const key = `${fromMin}-${t.symbol}-${toMin}`;
    if (!seen.has(key)) {
      seen.add(key);
      minTransitions.push({ from: fromMin, to: toMin, symbol: t.symbol });
    }
  }

  const minDfa: DFA = {
    states: minStates,
    transitions: minTransitions,
    startState: repMap.get(dfa.startState) ?? 0,
  };

  return {
    minDfa,
    steps,
    originalStateCount: n,
    minimizedStateCount: partition.length,
  };
}
