/**
 * Iterative data-flow analysis (liveness analysis).
 * From "Engineering a Compiler" §8.12.
 *
 * Liveness analysis determines which variables are "live" (their values
 * may be read in the future) at each program point.
 *
 * IN[B] = UNION(OUT[S] for all successors S of B)
 * OUT[B] = USE[B] ∪ (IN[B] − DEF[B])
 *
 * Iterated until fixed point (no changes in IN/OUT sets).
 */

import type { CfgMethod, CfgEdge } from '../../types';

export interface LivenessState {
  blockId: number;
  in: Set<string>;
  out: Set<string>;
  use: Set<string>;
  def: Set<string>;
}

export interface DataFlowStep {
  /** Block being processed */
  blockId: number;
  /** IN set at this step */
  inSet: Set<string>;
  /** OUT set at this step */
  outSet: Set<string>;
  /** Change description */
  description: string;
  /** Iteration number */
  iteration: number;
}

export interface DataFlowResult {
  /** Final liveness state per block */
  states: Map<number, LivenessState>;
  /** Step-by-step history for animation */
  steps: DataFlowStep[];
  /** Whether the analysis converged */
  converged: boolean;
  /** Total iterations */
  totalIterations: number;
}

/** Get successor block IDs */
function getSuccessors(edges: CfgEdge[], blockId: number): number[] {
  return edges.filter(e => e.from === blockId).map(e => e.to);
}

// Keywords/type names that are never variables – filtered from USE/DEF sets.
const RESERVED_WORDS = new Set([
  'int','long','double','float','boolean','byte','short','char','String','void',
  'if','else','for','while','do','switch','case','default','return','break','continue',
  'try','catch','finally','throw','throws','new','this','super','System','out','println','print',
  'true','false','null','in','out',
]);

function stripTypePrefix(s: string): string {
  return s.replace(/^\s*(?:(?:final|static)\s+)*(?:int|long|double|float|boolean|byte|short|char|String|void)\b\s*/, '');
}

/** Extract variable names used in a statement string */
function extractUses(stmt: string): Set<string> {
  const uses = new Set<string>();
  // Detect post-increment/decrement as use (x++ reads x)
  const incMatch = stmt.match(/^\s*([\w$]+)\s*(\+\+|--)/);
  if (incMatch && !RESERVED_WORDS.has(incMatch[1])) uses.add(incMatch[1]);
  // Find assignment '=' not part of <= >= == !=
  const assignIdx = (() => {
    for (let i = 0; i < stmt.length; i++) if (stmt[i] === '=') {
      const prev = stmt[i-1] || '';
      const next = stmt[i+1] || '';
      if (['<','>','!','='].includes(prev) || next === '=') continue;
      return i;
    }
    return -1;
  })();
  if (assignIdx !== -1) {
    const rhs = stmt.slice(assignIdx + 1);
    const matches = rhs.match(/\b([a-zA-Z_]\w*)\b/g);
    if (matches) matches.forEach(m => { if (/^[a-zA-Z_]/.test(m) && !RESERVED_WORDS.has(m)) uses.add(m); });
  } else {
    const sanitized = stmt.replace(/^for\s*\(/, '(').replace(/^for-(init|update):\s*/,'');
    const matches = sanitized.match(/\b([a-zA-Z_]\w*)\b/g);
    if (matches) matches.forEach(m => { if (/^[a-zA-Z_]/.test(m) && !RESERVED_WORDS.has(m)) uses.add(m); });
  }
  return uses;
}

/** Extract variable names defined (written to) in a statement string */
function extractDefs(stmt: string): Set<string> {
  const defs = new Set<string>();
  // Normalize "for-init:" / "for-update:" prefixes and strip type like "int " or "long "
  let s = stmt.replace(/^for-(init|update):\s*/, '').trim();
  s = stripTypePrefix(s);
  // Post increment/decrement defines its variable (x++ writes x)
  const incDef = s.match(/^\s*([\w$]+)\s*(\+\+|--)/);
  if (incDef && !RESERVED_WORDS.has(incDef[1])) {
    defs.add(incDef[1]);
    return defs;
  }
  // Strip leading label "L0:" if present
  s = s.replace(/^\s*\w+:\s*/, '');
  const eqIdx = s.indexOf('=');
  if (eqIdx !== -1) {
    const lhs = s.slice(0, eqIdx).trim();
    // LHS may be "result" or "n" or "a[0]" – capture base identifier before any bracket/dot
    const m = lhs.match(/^\s*([\w$]+)/);
    if (m && !RESERVED_WORDS.has(m[1])) defs.add(m[1]);
  }
  return defs;
}

/**
 * Run iterative liveness analysis on a CFG.
 * Returns step-by-step results for animation.
 */
export function runLivenessAnalysis(method: CfgMethod): DataFlowResult {
  const blocks = method.blocks;
  const edges = method.edges;
  const steps: DataFlowStep[] = [];
  const totalSteps: DataFlowStep[] = [];

  // Initialize USE and DEF sets for each block
  const states = new Map<number, LivenessState>();
  for (const block of blocks) {
    const use = new Set<string>();
    const def = new Set<string>();

    for (const stmt of block.statements) {
      // Variables used before being defined in this block
      const stmtUses = extractUses(stmt);
      const stmtDefs = extractDefs(stmt);

      for (const u of stmtUses) {
        if (!def.has(u)) use.add(u); // only count if not already defined
      }
      for (const d of stmtDefs) {
        def.add(d);
      }
    }

    states.set(block.id, {
      blockId: block.id,
      in: new Set(),
      out: new Set(),
      use,
      def,
    });
  }

  // Iterative fixpoint (backward analysis)
  let iteration = 0;
  let changed = true;
  const maxIterations = 50; // Safety bound

  while (changed && iteration < maxIterations) {
    changed = false;
    iteration++;

    // Process blocks in reverse order (bottom-up)
    for (let i = blocks.length - 1; i >= 0; i--) {
      const block = blocks[i];
      const state = states.get(block.id)!;
      const successors = getSuccessors(edges, block.id);

      // IN[B] = UNION(OUT[S] for all successors S of B)
      const newIn = new Set<string>();
      for (const s of successors) {
        const sState = states.get(s);
        if (sState) {
          for (const v of sState.out) newIn.add(v);
        }
      }

      // OUT[B] = USE[B] ∪ (IN[B] − DEF[B])
      const newOut = new Set(state.use);
      for (const v of newIn) {
        if (!state.def.has(v)) newOut.add(v);
      }

      // Check for changes
      const inChanged = newIn.size !== state.in.size || ![...newIn].every(v => state.in.has(v));
      const outChanged = newOut.size !== state.out.size || ![...newOut].every(v => state.out.has(v));

      if (inChanged || outChanged) {
        state.in = newIn;
        state.out = newOut;
        changed = true;

        const desc = `Block ${block.id}: ` +
          `IN = {${[...newIn].join(', ')}} ` +
          `OUT = {${[...newOut].join(', ')}}`;

        const step: DataFlowStep = {
          blockId: block.id,
          inSet: new Set(newIn),
          outSet: new Set(newOut),
          description: desc,
          iteration,
        };
        steps.push(step);
        totalSteps.push(step);
      }
    }
  }

  return {
    states,
    steps,
    converged: !changed,
    totalIterations: iteration,
  };
}
