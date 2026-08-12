/**
 * SSA (Static Single Assignment) form construction.
 * From "Engineering a Compiler" §8.9.
 *
 * Steps:
 * 1. Compute dominators + dominance frontiers
 * 2. Insert φ-functions at dominance frontier join points
 * 3. Rename variables (unique subscripts per definition site)
 */

import type { CfgMethod, TacInstruction } from '../../types';
import { computeDominators, type DominatorResult } from './dominators';

export interface PhiFunction {
  blockId: number;
  variable: string;
  args: { blockId: number; varName: string }[];
}

export interface VarDefinition {
  blockId: number;
  instrIndex: number;
  variable: string;
  renamedTo: string;
}

export interface SsaResult {
  dominators: DominatorResult;
  phiFunctions: PhiFunction[];
  varDefs: VarDefinition[];
  /** Original variable → list of renamed versions */
  renames: Map<string, string[]>;
}

/** Extract variable names being defined in an instruction */
function getDefs(instr: TacInstruction): string[] {
  const defs: string[] = [];
  if (instr.result && isVarName(instr.result)) defs.push(instr.result);
  return defs;
}

/** Check if a name is a user variable (not a temp t0, t1, etc.) */
function isVarName(name: string): boolean {
  // Temporaries (t0, t1, ...) are fine — they also get renamed in SSA
  return /^[a-zA-Z_]/.test(name);
}

/**
 * Insert φ-functions at dominance frontier join points.
 */
function insertPhiFunctions(
  method: CfgMethod,
  domResult: DominatorResult,
  varNames: Set<string>
): PhiFunction[] {
  const phis: PhiFunction[] = [];
  const blocks = method.blocks;
  const edges = method.edges;

  for (const v of varNames) {
    // Find blocks that define variable v
    const defBlocks = new Set<number>();
    for (const block of blocks) {
      for (const stmt of block.statements) {
        const match = stmt.match(/^(\w+)\s*=/);
        if (match && match[1] === v) defBlocks.add(block.id);
      }
    }
    if (defBlocks.size === 0) continue;

    // Worklist algorithm: insert φ-functions at dominance frontiers
    const worklist = [...defBlocks];
    const inserted = new Set<number>();

    while (worklist.length > 0) {
      const x = worklist.pop()!;
      const frontier = domResult.df.get(x);
      if (!frontier) continue;

      for (const y of frontier) {
        if (inserted.has(y)) continue;
        inserted.add(y);

        // Find the predecessors of block y
        const preds = edges.filter(e => e.to === y).map(e => e.from);
        const args = preds.map(pid => ({ blockId: pid, varName: v }));

        phis.push({ blockId: y, variable: v, args });

        // If y doesn't define v, add it to worklist
        if (!defBlocks.has(y)) {
          worklist.push(y);
        }
      }
    }
  }

  // Sort by block ID for display
  phis.sort((a, b) => a.blockId - b.blockId);
  return phis;
}

/**
 * Build SSA form — dominators + φ-functions + variable renaming.
 */
export function buildSsa(method: CfgMethod, instructions: TacInstruction[], basicBlocks: { id: number; instructions: number[] }[]): SsaResult {
  const dominators = computeDominators(method);

  // Collect variable names from instructions
  const varNames = new Set<string>();
  for (const instr of instructions) {
    const defs = getDefs(instr);
    defs.forEach(d => varNames.add(d));
  }

  // Insert φ-functions
  const phiFunctions = insertPhiFunctions(method, dominators, varNames);

  // Simple renaming: assign unique subscripts to each definition
  const varDefs: VarDefinition[] = [];
  const renames = new Map<string, string[]>();

  // For visualization purposes, assign subscript numbers to each variable definition
  // Group definitions by original variable name
  const defsByVar = new Map<string, { blockId: number; instrIndex: number }[]>();
  for (const instr of instructions) {
    const defs = getDefs(instr);
    for (const d of defs) {
      if (!defsByVar.has(d)) defsByVar.set(d, []);
      defsByVar.get(d)!.push({ blockId: findBlockForInstr(basicBlocks, instr.line), instrIndex: instr.line });
    }
  }

  let counter = 0;
  for (const [varName, defs] of defsByVar) {
    const renamed: string[] = [];
    for (let i = 0; i < defs.length; i++) {
      counter++;
      const renamedTo = `${varName}₁`.split('').map((c, idx) => {
        if (idx === varName.length) return subscriptDigit(i);
        return c;
      }).join('');
      varDefs.push({
        blockId: defs[i].blockId,
        instrIndex: defs[i].instrIndex,
        variable: varName,
        renamedTo: renamedTo,
      });
      renamed.push(renamedTo);
    }
    renames.set(varName, renamed);
  }

  return { dominators, phiFunctions, varDefs, renames };
}

/** Simple helper to find which block contains a given instruction line */
function findBlockForInstr(basicBlocks: { id: number; instructions: number[] }[], instrLine: number): number {
  for (const block of basicBlocks) {
    if (block.instructions.includes(instrLine)) return block.id;
  }
  return basicBlocks[0]?.id ?? 0;
}

/** Get a subscript digit character (₁₂₃₄₅₆₇₈₉) */
function subscriptDigit(n: number): string {
  const subscripts = '₀₁₂₃₄₅₆₇₈₉';
  if (n < 10) return subscripts[n];
  // For n >= 10, use compound subscripts
  return String(n).split('').map(d => subscripts[parseInt(d)]).join('');
}
