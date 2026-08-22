import type { DFA } from '../../lib/lexer/types';

// ── Layered (Sugiyama-lite) layout for DFA graphs ──
// The old grid layout placed states in a naive square grid, so edges between
// distant cells criss-crossed the whole canvas. Here we:
//   1. assign each state a depth = BFS distance from the start state
//   2. order states within each layer with a few barycenter sweeps to reduce
//      edge crossings
//   3. position states column-by-depth, spread vertically inside the layer
// The result reads left→right like the subset-construction process itself.

export interface DagLayout {
  positions: Map<number, { x: number; y: number }>;
  width: number;
  height: number;
}

interface LayoutOptions {
  nodeRadius?: number;
  minRowGap?: number;
  colStep?: number;
}

export function layeredLayout(dfa: DFA, opts: LayoutOptions = {}): DagLayout {
  const r = opts.nodeRadius ?? 16;
  const rowGap = opts.minRowGap ?? 52;
  const colStep = opts.colStep ?? 120;

  const ids = dfa.states.map(s => s.id);
  const idSet = new Set(ids);

  // adjacency
  const adj = new Map<number, number[]>();
  for (const t of dfa.transitions) {
    if (!idSet.has(t.from) || !idSet.has(t.to)) continue;
    if (!adj.has(t.from)) adj.set(t.from, []);
    const list = adj.get(t.from)!;
    if (!list.includes(t.to)) list.push(t.to);
  }

  // 1. BFS depth
  const depth = new Map<number, number>();
  const queue: number[] = [dfa.startState];
  depth.set(dfa.startState, 0);
  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const nxt of adj.get(cur) ?? []) {
      if (!depth.has(nxt)) {
        depth.set(nxt, depth.get(cur)! + 1);
        queue.push(nxt);
      }
    }
  }
  // unreachable states → deepest layer + 1 (shouldn't happen post subset construction)
  let maxDepth = Math.max(0, ...Array.from(depth.values()));
  for (const id of ids) {
    if (!depth.has(id)) depth.set(id, ++maxDepth);
  }

  // 2. layers
  const layers: number[][] = Array.from({ length: maxDepth + 1 }, () => []);
  for (const id of ids) layers[depth.get(id)!].push(id);
  // sort initial order by id for stability
  for (const layer of layers) layer.sort((a, b) => a - b);

  // predecessors map for barycenter
  const preds = new Map<number, number[]>();
  for (const t of dfa.transitions) {
    if (!idSet.has(t.from) || !idSet.has(t.to)) continue;
    if (!preds.has(t.to)) preds.set(t.to, []);
    preds.get(t.to)!.push(t.from);
  }

  const posInLayer = new Map<number, number>();
  const refreshPos = () => {
    layers.forEach(layer => layer.forEach((id, i) => posInLayer.set(id, i)));
  };
  refreshPos();

  const barycenterSweep = (forward: boolean) => {
    const ordered = forward ? [...layers.keys()] : [...layers.keys()].reverse();
    for (const li of ordered) {
      const layer = layers[li];
      if (layer.length <= 1) continue;
      const key = new Map<number, number>();
      for (const id of layer) {
        const nbrs = forward ? (preds.get(id) ?? []) : (adj.get(id) ?? []);
        if (nbrs.length === 0) {
          key.set(id, posInLayer.get(id) ?? 0);
        } else {
          const sum = nbrs.reduce((acc, n) => acc + (posInLayer.get(n) ?? 0), 0);
          key.set(id, sum / nbrs.length);
        }
      }
      layer.sort((a, b) => key.get(a)! - key.get(b)! || a - b);
      layer.forEach((id, i) => posInLayer.set(id, i));
    }
  };
  for (let sweep = 0; sweep < 4; sweep++) {
    barycenterSweep(true);
    barycenterSweep(false);
  }

  // 3. coordinates
  const widest = Math.max(...layers.map(l => l.length));
  const height = Math.max(320, widest * rowGap + 2 * r);
  const width = 60 + (maxDepth + 1) * colStep;

  const positions = new Map<number, { x: number; y: number }>();
  layers.forEach((layer, li) => {
    const gap = Math.min(rowGap * 1.6, (height - 2 * r) / Math.max(1, layer.length));
    const startY = (height - gap * (layer.length - 1)) / 2;
    layer.forEach((id, i) => {
      positions.set(id, { x: 60 + li * colStep, y: layer.length === 1 ? height / 2 : startY + i * gap });
    });
  });

  return { positions, width, height };
}
