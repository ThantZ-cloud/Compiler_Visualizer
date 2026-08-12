/**
 * Dominator tree computation (Cooper, Harvey, Kennedy — iterative algorithm).
 * From "Engineering a Compiler" §8.7.
 */

import type { CfgMethod, CfgEdge } from '../../types';

export interface DominatorResult {
  /** idom[b] = immediate dominator of block b (null for entry) */
  idom: Map<number, number | null>;
  /** Dom(b) = set of all dominators of block b */
  dom: Map<number, Set<number>>;
  /** Tree edges: idom → child */
  treeEdges: { from: number; to: number }[];
  /** Dominance frontier of each block */
  df: Map<number, Set<number>>;
}

/** Get the immediate dominator from the dom sets by finding the single dominator that isn't dominated by any other dominator */
function getImmediateDominators(dom: Map<number, Set<number>>, blockId: number): number | null {
  const dominators = dom.get(blockId);
  if (!dominators || dominators.size <= 1) return null;
  // The idom is the dominator that isn't dominated by any other dominator in the set
  for (const d of dominators) {
    if (d === blockId) continue;
    const dd = dom.get(d);
    if (dd) {
      let isIdom = true;
      for (const other of dominators) {
        if (other === d || other === blockId) continue;
        if (dd.has(other)) { isIdom = false; break; }
      }
      if (isIdom) return d;
    }
  }
  return null;
}

/** Get predecessors from edges */
function getPredecessors(edges: CfgEdge[], nodeId: number): number[] {
  return edges.filter(e => e.to === nodeId).map(e => e.from);
}

/**
 * Compute dominators using the iterative algorithm.
 * Block IDs must be integers. Entry block is blocks[0].
 */
export function computeDominators(method: CfgMethod): DominatorResult {
  const blocks = method.blocks;
  const edges = method.edges;
  if (blocks.length === 0) {
    return { idom: new Map(), dom: new Map(), treeEdges: [], df: new Map() };
  }

  const blockIds = blocks.map(b => b.id);
  const entryId = blocks[0].id;

  // Initialize Dom(entry) = {entry}
  const dom = new Map<number, Set<number>>();
  for (const id of blockIds) {
    dom.set(id, new Set(blockIds)); // Start with all blocks as dominators
  }
  dom.set(entryId, new Set([entryId]));

  // Iterative fixpoint
  let changed = true;
  while (changed) {
    changed = false;
    for (const b of blockIds) {
      if (b === entryId) continue;
      const preds = getPredecessors(edges, b).filter(p => dom.has(p));
      if (preds.length === 0) continue;

      // NewDom(b) = {b} ∪ (∩ Dom(p) for all predecessors p)
      let newDom: Set<number>;
      if (preds.length === 1) {
        newDom = new Set(dom.get(preds[0]));
        newDom.add(b);
      } else {
        newDom = new Set<number>();
        // Start with first predecessor's dominators
        let first = true;
        for (const p of preds) {
          const pDom = dom.get(p)!;
          if (first) {
            for (const d of pDom) newDom.add(d);
            first = false;
          } else {
            // Intersect
            for (const d of newDom) {
              if (!pDom.has(d)) newDom.delete(d);
            }
          }
        }
        newDom.add(b);
      }

      const oldDom = dom.get(b)!;
      if (newDom.size !== oldDom.size || ![...newDom].every(d => oldDom.has(d))) {
        dom.set(b, newDom);
        changed = true;
      }
    }
  }

  // Compute idom from dom sets
  const idom = new Map<number, number | null>();
  for (const b of blockIds) {
    if (b === entryId) {
      idom.set(b, null);
    } else {
      idom.set(b, getImmediateDominators(dom, b));
    }
  }

  // Build tree edges
  const treeEdges: { from: number; to: number }[] = [];
  for (const [child, parent] of idom) {
    if (parent !== null) {
      treeEdges.push({ from: parent, to: child });
    }
  }

  // Compute dominance frontiers
  const df = new Map<number, Set<number>>();
  for (const b of blockIds) df.set(b, new Set());

  for (const b of blockIds) {
    const preds = getPredecessors(edges, b);
    if (preds.length < 2) continue;
    for (const p of preds) {
      // Walk up dominator tree from p
      let runner: number | null = p;
      while (runner !== idom.get(b) && runner !== null) {
        df.get(runner)!.add(b);
        runner = idom.get(runner) ?? null;
      }
    }
  }

  return { idom, dom, treeEdges, df };
}
