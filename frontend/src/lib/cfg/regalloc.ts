/**
 * Register allocation via graph coloring.
 * From "Engineering a Compiler" Ch 8 — Register Allocation.
 */

import type { CfgMethod, TacInstruction } from '../../types';
import type { DataFlowResult } from './dataflow';

export interface InterferenceEdge {
  from: string;
  to: string;
}

export interface ColoringStep {
  variable: string;
  action: 'assign' | 'spill' | 'select';
  register?: number;
  neighbors: string[];
  available: number[];
  description: string;
}

export interface CoalescedMove {
  from: string;
  to: string;
  eliminated: boolean;
  reason: string;
}

export interface SpillCostInfo {
  variable: string;
  cost: number;
  references: number;
  loopDepth: number;
}

export interface RegAllocationResult {
  interferenceGraph: InterferenceEdge[];
  /** All variables that interfere (have overlapping live ranges) */
  variables: string[];
  /** Color assignment: variable → register number (0-based) or -1 for stack spill */
  assignments: Map<string, number>;
  /** Number of registers available */
  numRegisters: number;
  /** Variables that had to be spilled to memory */
  spills: string[];
  /** Step-by-step coloring log */
  coloringSteps: ColoringStep[];
  /** Copy instructions analyzed for move coalescing */
  coalescedMoves: CoalescedMove[];
  /** Spill cost ranking (references × loop depth) */
  spillCosts: SpillCostInfo[];
}

/**
 * Extract variable names from TAC instructions.
 */
function collectVariables(instructions: TacInstruction[]): Set<string> {
  const vars = new Set<string>();
  for (const instr of instructions) {
    if (instr.result && !instr.result.match(/^t\d+$/)) {
      vars.add(instr.result);
    }
    if (instr.arg1 && !instr.arg1.match(/^\d+$/) && !instr.arg1.match(/^t\d+$/)) {
      vars.add(instr.arg1);
    }
    if (instr.arg2 && !instr.arg2.match(/^\d+$/) && !instr.arg2.match(/^t\d+$/)) {
      vars.add(instr.arg2);
    }
  }
  return vars;
}

/**
 * Build interference graph from liveness analysis.
 * Two variables interfere if they are both live at the same program point.
 */
function buildInterferenceGraph(
  dataflow: DataFlowResult,
  variables: Set<string>,
): { edges: InterferenceEdge[]; adjMap: Map<string, Set<string>> } {
  const adjMap = new Map<string, Set<string>>();
  for (const v of variables) {
    adjMap.set(v, new Set());
  }

  // Two variables interfere if they appear in the same IN or OUT set
  for (const [, state] of dataflow.states) {
    const liveIn = [...state.in].filter(v => variables.has(v));
    const liveOut = [...state.out].filter(v => variables.has(v));
    const allLive = [...new Set([...liveIn, ...liveOut])];

    // All pairs of live variables interfere
    for (let i = 0; i < allLive.length; i++) {
      for (let j = i + 1; j < allLive.length; j++) {
        adjMap.get(allLive[i])?.add(allLive[j]);
        adjMap.get(allLive[j])?.add(allLive[i]);
      }
    }
  }

  const edges: InterferenceEdge[] = [];
  const seen = new Set<string>();
  for (const [v, neighbors] of adjMap) {
    for (const n of neighbors) {
      const key = [v, n].sort().join('-');
      if (!seen.has(key)) {
        seen.add(key);
        edges.push({ from: v, to: n });
      }
    }
  }

  return { edges, adjMap };
}

/**
 * Graph coloring using heuristic simplify-select approach.
 * From "Engineering a Compiler" §8.4.
 */
function graphColor(
  variables: string[],
  adjMap: Map<string, Set<string>>,
  numRegisters: number = 4,
): { assignments: Map<string, number>; spills: string[]; steps: ColoringStep[] } {
  const assignments = new Map<string, number>();
  const spills: string[] = [];
  const steps: ColoringStep[] = [];

  // Work with remaining variables (not yet colored or spilled)
  const remaining = new Set(variables);
  const stack: string[] = [];

  // Phase 1: Simplify — push nodes with < numRegisters neighbors
  let simplified = true;
  while (simplified && remaining.size > 0) {
    simplified = false;
    for (const v of remaining) {
      const neighbors = adjMap.get(v) || new Set();
      const liveNeighbors = [...neighbors].filter(n => remaining.has(n));
      if (liveNeighbors.length < numRegisters) {
        stack.push(v);
        remaining.delete(v);
        simplified = true;
        break;
      }
    }
  }

  // Phase 2: Select — if anything remains, spill the node with most neighbors
  if (remaining.size > 0) {
    // Spill nodes with most neighbors
    const sorted = [...remaining].sort((a, b) => {
      const aNeighbors = [...(adjMap.get(a) || new Set())].filter(n => remaining.has(n)).length;
      const bNeighbors = [...(adjMap.get(b) || new Set())].filter(n => remaining.has(n)).length;
      return bNeighbors - aNeighbors;
    });

    for (const v of sorted) {
      spills.push(v);
      remaining.delete(v);
      steps.push({
        variable: v,
        action: 'spill',
        neighbors: [...(adjMap.get(v) || new Set())].filter(n => remaining.has(n) || spills.includes(n)),
        available: [],
        description: `Spill ${v} to memory (${(adjMap.get(v) || new Set()).size} neighbors exceed ${numRegisters} registers)`,
      });
    }
  }

  // Phase 3: Pop from stack and assign colors
  while (stack.length > 0) {
    const v = stack.pop()!;
    const neighbors = adjMap.get(v) || new Set();
    const usedRegisters = new Set<number>();
    for (const n of neighbors) {
      if (assignments.has(n)) {
        usedRegisters.add(assignments.get(n)!);
      }
    }

    const available: number[] = [];
    for (let r = 0; r < numRegisters; r++) {
      if (!usedRegisters.has(r)) available.push(r);
    }

    if (available.length > 0) {
      const reg = available[0];
      assignments.set(v, reg);
      steps.push({
        variable: v,
        action: 'assign',
        register: reg,
        neighbors: [...neighbors].filter(n => assignments.has(n)),
        available,
        description: `Assign ${v} → R${reg} (available: [${available.map(r => `R${r}`).join(', ')}])`,
      });
    } else {
      spills.push(v);
      steps.push({
        variable: v,
        action: 'spill',
        neighbors: [...neighbors].filter(n => assignments.has(n)),
        available,
        description: `Spill ${v} to memory (no available registers after coloring neighbors)`,
      });
    }
  }

  return { assignments, spills, steps };
}

/**
 * Analyze copy instructions (result = arg1) for move coalescing.
 * A copy can be eliminated when both operands end up in the same register.
 * From "Engineering a Compiler" §13.5.
 */
function coalesceMoves(
  instructions: TacInstruction[],
  assignments: Map<string, number>,
  adjMap: Map<string, Set<string>>,
): CoalescedMove[] {
  const moves: CoalescedMove[] = [];
  const seen = new Set<string>();

  for (const instr of instructions) {
    const isMove = instr.op === 'assign'
      && instr.result !== null
      && instr.arg1 !== null
      && instr.arg2 === null
      && instr.operator === null
      && !instr.result.match(/^t\d+$/)
      && !instr.arg1.match(/^t\d+$/)
      && !instr.arg1.match(/^\d+$/)
      && instr.result !== instr.arg1;
    if (!isMove) continue;

    const a = instr.result!;
    const b = instr.arg1!;
    const key = [a, b].sort().join('->');
    if (seen.has(key)) continue;
    seen.add(key);

    const aAssigned = assignments.has(a);
    const bAssigned = assignments.has(b);

    if (!aAssigned && !bAssigned) {
      moves.push({ from: b, to: a, eliminated: false, reason: 'Both operands spilled to memory' });
      continue;
    }

    const interfere = (adjMap.get(a) || new Set()).has(b);
    if (interfere) {
      moves.push({
        from: b,
        to: a,
        eliminated: false,
        reason: `${a} and ${b} interfere — cannot share a register`,
      });
      continue;
    }

    if (aAssigned && bAssigned && assignments.get(a) === assignments.get(b)) {
      moves.push({
        from: b,
        to: a,
        eliminated: true,
        reason: `Both in R${assignments.get(a)} — copy is dead`,
      });
    } else if (aAssigned && bAssigned) {
      moves.push({
        from: b,
        to: a,
        eliminated: false,
        reason: `Different registers (${a} → R${assignments.get(a)}, ${b} → R${assignments.get(b)})`,
      });
    } else {
      moves.push({
        from: b,
        to: a,
        eliminated: false,
        reason: 'One operand not allocated a register',
      });
    }
  }

  return moves;
}

/**
 * Estimate spill cost per variable: references × loop depth pressure.
 * The allocator prefers to spill variables with the LOWEST cost.
 * From "Engineering a Compiler" §13.4.
 */
function computeSpillCosts(
  instructions: TacInstruction[],
  adjMap: Map<string, Set<string>>,
  liveVars: Set<string>,
): SpillCostInfo[] {
  const refs = new Map<string, number>();
  const count = (name: string | null) => {
    if (!name || !liveVars.has(name)) return;
    refs.set(name, (refs.get(name) || 0) + 1);
  };
  for (const instr of instructions) {
    count(instr.result);
    count(instr.arg1);
    count(instr.arg2);
  }

  return [...refs.entries()]
    .map(([variable, references]) => {
      // Loop-depth heuristic: more interference pressure ≤> higher loop depth
      const neighbors = adjMap.get(variable)?.size || 0;
      const loopDepth = Math.min(neighbors, 3);
      return { variable, cost: references * (loopDepth + 1), references, loopDepth };
    })
    .sort((a, b) => b.cost - a.cost);
}

/**
 * Main entry: compute register allocation for a method.
 */
export function computeRegAllocation(
  _method: CfgMethod,
  instructions: TacInstruction[],
  dataflow: DataFlowResult,
  numRegisters: number = 4,
): RegAllocationResult {
  const variables = collectVariables(instructions);

  // Filter to only variables that are actually used in the dataflow
  const liveVars = new Set<string>();
  for (const [, state] of dataflow.states) {
    for (const v of state.in) { if (variables.has(v)) liveVars.add(v); }
    for (const v of state.out) { if (variables.has(v)) liveVars.add(v); }
    for (const v of state.use) { if (variables.has(v)) liveVars.add(v); }
    for (const v of state.def) { if (variables.has(v)) liveVars.add(v); }
  }

  // If no live variables found from dataflow, use all extracted variables
  const varsToAllocate = liveVars.size > 0 ? [...liveVars] : [...variables];

  const { edges, adjMap } = buildInterferenceGraph(dataflow, variables);
  const { assignments, spills, steps } = graphColor(varsToAllocate, adjMap, numRegisters);

  return {
    interferenceGraph: edges,
    variables: varsToAllocate,
    assignments,
    numRegisters,
    spills,
    coloringSteps: steps,
    coalescedMoves: coalesceMoves(instructions, assignments, adjMap),
    spillCosts: computeSpillCosts(instructions, adjMap, liveVars),
  };
}
