import React, { useRef, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as d3 from 'd3';
import type { NFA, NFAState } from '../../lib/lexer/types';
import { constructGroups, buildFigure25Example, type GroupConstruction, type ReNode } from '../../lib/lexer/thompson';
import { buildNFAFromRE, PRESET_RES } from '../../lib/lexer/reParser';

// ── Tree-driven Thompson machine viewer ──
// thompson.ts records, for every token group, the RE TREE that drove its
// construction (ch.2 p.48 sidebar: transformations applied in postorder over
// the expression tree). Instead of re-inferring structure from flat
// transition lists with a generic DAG layout, this viewer lays each machine
// out recursively from that tree, so every tab reads like the textbook
// figures: symbol pairs glued by ε, alternations fanning from a fresh start
// to a fresh accept, and star closures looping back over the top.
//
// Three presentation modes (all circles-and-arrows):
//  • OVERVIEW — unified start circle fans ε to one circle per token group (collapsed but still graph)
//  • FULL — raw combined NFA as a layered DAG (full ε mesh)
//  • EXAMPLES — step-by-step walkthrough for a(b|c)* (how the templates compose)
// The drawing is derived from the construction alone — user code only ever
// influences presentation (which keyword branches float to the front), never
// the machine's structure.

interface NfaGraphProps {
  nfa: NFA;
  keywords?: string[];
  groupCounts?: Record<string, number>;
  isPlaying: boolean;
  isCompleted: boolean;
}

const R = 13;
const PAD = 18;
const SYM_W = 110;
const ROW_H = 40;
const GLUE = 52;
const ALT_SIDE = 56;
const BRANCH_GAP = 20;
const LOOP_CLEAR = 42;
const SKIP_CLEAR = 34;
const MARGIN_V = 14;
const KEYWORDS_SHOWN = 6;
const BRIDGE_ID = 9999;

const TAB_ORDER = ['KEYWORD', 'IDENTIFIER', 'STRING', 'NUMBER', 'OPERATOR', 'SEPARATOR', 'WHITESPACE', 'COMMENT'];

// ── Recursive fragment layout ──
interface Pt { x: number; y: number }
type EdgeKind = 'sym' | 'eps' | 'skip' | 'loop';
interface EdgeSpec { fromId: number; toId: number; label: string; kind: EdgeKind }
interface Frag {
  w: number;
  h: number;
  nodes: Map<number, Pt>;
  edges: EdgeSpec[];
  startId: number;
  acceptId: number;
}
type AltItem = { kind: 'frag'; node: ReNode } | { kind: 'bridge'; count: number };

function translate(f: Frag, dx: number, dy: number): Frag {
  for (const p of f.nodes.values()) { p.x += dx; p.y += dy; }
  return f;
}
function layoutSym(node: Extract<ReNode, { kind: 'sym' }>): Frag {
  return {
    w: SYM_W,
    h: ROW_H,
    nodes: new Map([
      [node.startId, { x: R + 11, y: ROW_H / 2 }],
      [node.acceptId, { x: SYM_W - R - 11, y: ROW_H / 2 }],
    ]),
    edges: [{ fromId: node.startId, toId: node.acceptId, label: node.label, kind: 'sym' }],
    startId: node.startId,
    acceptId: node.acceptId,
  };
}
function mergeInto(target: Frag, part: Frag): void {
  for (const [id, p] of part.nodes) target.nodes.set(id, p);
  target.edges.push(...part.edges);
}
function layoutConcat(node: Extract<ReNode, { kind: 'concat' }>): Frag {
  const parts = node.children.map(layoutNode);
  if (parts.length === 0) {
    return { w: SYM_W, h: ROW_H, nodes: new Map(), edges: [], startId: node.startId, acceptId: node.acceptId };
  }
  const midY = Math.max(...parts.map(p => p.h)) / 2;
  const frag: Frag = {
    w: parts.reduce((acc, p) => acc + p.w, 0) + GLUE * (parts.length - 1),
    h: Math.max(...parts.map(p => p.h)),
    nodes: new Map(),
    edges: [],
    startId: parts[0].startId,
    acceptId: parts[parts.length - 1].acceptId,
  };
  let x = 0;
  parts.forEach((p, i) => {
    translate(p, x, midY - p.h / 2);
    mergeInto(frag, p);
    if (i > 0) frag.edges.push({ fromId: parts[i - 1].acceptId, toId: p.startId, label: '', kind: 'eps' });
    x += p.w + GLUE;
  });
  return frag;
}
function layoutBridge(): Frag {
  return { w: 76, h: 32, nodes: new Map([[BRIDGE_ID, { x: 38, y: 16 }]]), edges: [], startId: BRIDGE_ID, acceptId: BRIDGE_ID };
}
function layoutAlt(node: Extract<ReNode, { kind: 'alt' }>, items?: AltItem[]): Frag {
  const branchItems: AltItem[] = items ?? node.children.map(c => ({ kind: 'frag', node: c }));
  const parts = branchItems.map(it => it.kind === 'frag' ? layoutNode(it.node) : layoutBridge());
  const contentW = Math.max(...parts.map(p => p.w));
  const innerH = parts.reduce((acc, p) => acc + p.h, 0) + BRANCH_GAP * (parts.length - 1);
  const w = ALT_SIDE * 2 + contentW;
  const h = innerH + MARGIN_V * 2;
  const cy = h / 2;
  const frag: Frag = { w, h, nodes: new Map([[node.startId, { x: ALT_SIDE / 2, y: cy }], [node.acceptId, { x: w - ALT_SIDE / 2, y: cy }]]), edges: [], startId: node.startId, acceptId: node.acceptId };
  let y = MARGIN_V;
  for (const p of parts) {
    const bx = ALT_SIDE + (contentW - p.w) / 2;
    translate(p, bx, y);
    mergeInto(frag, p);
    frag.edges.push({ fromId: node.startId, toId: p.startId, label: '', kind: 'eps' });
    frag.edges.push({ fromId: p.acceptId, toId: node.acceptId, label: '', kind: 'eps' });
    y += p.h + BRANCH_GAP;
  }
  return frag;
}
function layoutStar(node: Extract<ReNode, { kind: 'star' }>): Frag { return wrapWithLoop(node.child, node.startId, node.acceptId, true); }
function layoutOpt(node: Extract<ReNode, { kind: 'opt' }>): Frag { return wrapWithLoop(node.child, node.startId, node.acceptId, false); }
function wrapWithLoop(child: ReNode, startId: number, acceptId: number, loop: boolean): Frag {
  const inner = layoutNode(child);
  const w = ALT_SIDE * 2 + inner.w;
  const topPad = loop ? LOOP_CLEAR : 12;
  const h = topPad + inner.h + SKIP_CLEAR;
  const cy = topPad + inner.h / 2;
  translate(inner, ALT_SIDE, topPad);
  const frag: Frag = {
    w, h, nodes: new Map([[startId, { x: ALT_SIDE / 2, y: cy }], [acceptId, { x: w - ALT_SIDE / 2, y: cy }]]),
    edges: [...inner.edges, { fromId: startId, toId: inner.startId, label: '', kind: 'eps' }, { fromId: inner.acceptId, toId: acceptId, label: '', kind: 'eps' }, { fromId: startId, toId: acceptId, label: '', kind: 'skip' }],
    startId, acceptId,
  };
  for (const [id, p] of inner.nodes) frag.nodes.set(id, p);
  if (loop) frag.edges.push({ fromId: inner.acceptId, toId: inner.startId, label: '', kind: 'loop' });
  return frag;
}
function layoutNode(node: ReNode): Frag {
  switch (node.kind) {
    case 'sym': return layoutSym(node);
    case 'concat': return layoutConcat(node);
    case 'alt': return layoutAlt(node);
    case 'star': return layoutStar(node);
    case 'opt': return layoutOpt(node);
  }
}
function wordOf(node: ReNode): string {
  if (node.kind === 'sym') return node.label;
  if (node.kind === 'concat') return node.children.map(wordOf).join('');
  return '';
}
function prunedKeywordItems(root: ReNode, keywords: string[]): { items: AltItem[]; hidden: number } | null {
  if (root.kind !== 'alt') return null;
  const foundSet = new Set(keywords);
  const idx = root.children.map((c) => ({ c, word: wordOf(c) }));
  if (idx.some(e => !e.word)) return null;
  idx.sort((a, b) => {
    const af = foundSet.has(a.word) ? 0 : 1;
    const bf = foundSet.has(b.word) ? 0 : 1;
    if (af !== bf) return af - bf;
    if (a.word.length !== b.word.length) return a.word.length - b.word.length;
    return a.word.localeCompare(b.word);
  });
  const kept = idx.slice(0, KEYWORDS_SHOWN);
  const hidden = idx.length - kept.length;
  const items: AltItem[] = kept.map(e => ({ kind: 'frag', node: e.c }));
  if (hidden > 0) items.push({ kind: 'bridge', count: hidden });
  return { items, hidden };
}

// ── Full NFA layered layout — left→right BFS layers ──
function nfaLayeredPositions(nfa: NFA) {
  const ids = nfa.states.map(s => s.id);
  const idSet = new Set(ids);
  const adj = new Map<number, number[]>();
  for (const t of nfa.transitions) {
    if (!idSet.has(t.from) || !idSet.has(t.to)) continue;
    if (!adj.has(t.from)) adj.set(t.from, []);
    const list = adj.get(t.from)!;
    if (!list.includes(t.to)) list.push(t.to);
  }
  const depth = new Map<number, number>();
  const q: number[] = [nfa.startState];
  depth.set(nfa.startState, 0);
  while (q.length) {
    const cur = q.shift()!;
    for (const nxt of adj.get(cur) ?? []) if (!depth.has(nxt)) { depth.set(nxt, depth.get(cur)! + 1); q.push(nxt); }
  }
  let maxD = Math.max(0, ...Array.from(depth.values()));
  for (const id of ids) if (!depth.has(id)) depth.set(id, ++maxD);
  const layers: number[][] = Array.from({ length: maxD + 1 }, () => []);
  for (const id of ids) layers[depth.get(id)!].push(id);
  for (const l of layers) l.sort((a, b) => a - b);
  const rowGap = 38, colStep = 72;
  const widest = Math.max(...layers.map(l => l.length));
  const height = Math.max(360, widest * rowGap + 40);
  const width = 80 + (maxD + 1) * colStep;
  const pos = new Map<number, { x: number; y: number }>();
  layers.forEach((layer, li) => {
    const gap = Math.min(rowGap * 1.5, (height - 20) / Math.max(1, layer.length));
    const startY = (height - gap * (layer.length - 1)) / 2;
    layer.forEach((id, i) => pos.set(id, { x: 50 + li * colStep, y: layer.length === 1 ? height / 2 : startY + i * gap }));
  });
  return { positions: pos, width, height };
}

const VIEW_TABS: Array<{ key: string; labelKey: string; fallback: string }> = [
  { key: 'OVERVIEW', labelKey: 'lexical.step2.overview', fallback: 'OVERVIEW' },
  { key: 'FLAT', labelKey: 'lexical.step2.flatView', fallback: 'FULL' },
  { key: 'BUILD', labelKey: 'lexical.step2.buildView', fallback: 'EXAMPLES' },
];

const NfaGraph: React.FC<NfaGraphProps> = ({ nfa, keywords = [], groupCounts = {}, isPlaying, isCompleted }) => {
  const { t } = useTranslation();
  const svgRef = useRef<SVGSVGElement>(null);
  const flatSvgRef = useRef<SVGSVGElement>(null);
  const customSvgRef = useRef<SVGSVGElement>(null);
  // Machines are dynamic per program: keyword branches = foundKeywords in this file (token counts not static)
  const machines = useMemo(() => constructGroups(keywords.length > 0 ? keywords : []), [keywords]);
  const ordered = useMemo(() => TAB_ORDER.map(name => machines.find(m => m.name === name)).filter(Boolean) as GroupConstruction[], [machines]);
  const figureExample = useMemo(() => buildFigure25Example(), []);
  const [customInput, setCustomInput] = useState('(a|b)*');
  const customResult = useMemo(() => {
    const v = customInput.trim();
    if (!v) return null;
    return buildNFAFromRE(v);
  }, [customInput]);
  const customFrag = useMemo(() => {
    if (!customResult?.root) return null;
    try { return layoutNode(customResult.root); } catch { return null; }
  }, [customResult]);
  // stepwise fragments for BUILD tab
  const buildFrags = useMemo(() => {
    const ex = figureExample;
    if (ex.root.kind !== 'concat' || ex.root.children.length !== 2) return [] as Array<{ label: string; frag: Frag; re: string }>;
    const symA = ex.root.children[0];
    const starNode = ex.root.children[1] as Extract<ReNode, { kind: 'star' }>;
    const altNode = starNode.child as ReNode;
    if (altNode.kind !== 'alt' || altNode.children.length < 2) return [] as Array<{ label: string; frag: Frag; re: string }>;
    const symB = altNode.children[0];
    const symC = altNode.children[1];
    // Step 1: three isolated symbols (Fig 2.5a) — not concatenated, just three sym pairs side-by-side
    const sA = layoutSym(symA as Extract<ReNode, { kind: 'sym' }>);
    const sB = layoutSym(symB as Extract<ReNode, { kind: 'sym' }>);
    const sC = layoutSym(symC as Extract<ReNode, { kind: 'sym' }>);
    // place B after A, C after B with gap
    translate(sB, sA.w + 28, 0);
    translate(sC, sA.w + sB.w + 56, 0);
    const step1Frag: Frag = {
      w: sA.w + sB.w + sC.w + 56,
      h: Math.max(sA.h, sB.h, sC.h),
      nodes: new Map([...sA.nodes, ...sB.nodes, ...sC.nodes]),
      edges: [...sA.edges, ...sB.edges, ...sC.edges],
      startId: sA.startId,
      acceptId: sC.acceptId,
    };
    return [
      { label: '1 — symbols a, b, c', re: 'a   b   c', frag: step1Frag },
      { label: '2 — b | c', re: '(b | c)', frag: layoutNode(altNode) },
      { label: '3 — (b | c)*', re: '(b | c)*', frag: layoutNode(starNode) },
      { label: '4 — a (b | c)*', re: 'a (b | c)*', frag: layoutNode(ex.root) },
    ];
  }, [figureExample]);

  const [active, setActive] = useState<string>('FLAT'); // default Full — show combined NFA construction first
  const [buildStep, setBuildStep] = useState<number>(0); // start at step 1 (no.1)

  const machine = useMemo(() => ordered.find(m => m.name === active) ?? null, [ordered, active]);
  const pruned = useMemo(() => {
    if (!machine || machine.name !== 'KEYWORD') return null;
    return prunedKeywordItems(machine.root, keywords);
  }, [machine, keywords]);
  const hiddenCount = pruned?.hidden ?? 0;

  // ── FLAT NFA effect ──
  useEffect(() => {
    if (active !== 'FLAT') return;
    const svgEl = flatSvgRef.current;
    if (!svgEl) return;
    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();
    const { positions, width, height } = nfaLayeredPositions(nfa);
    svg.attr('viewBox', `0 0 ${width} ${height}`).attr('width', width).attr('height', height);
    svg.append('defs').append('marker').attr('id', 'arrow-flat').attr('viewBox', '0 -5 10 10').attr('refX', 9).attr('refY', 0).attr('markerWidth', 5).attr('markerHeight', 5).attr('orient', 'auto').append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', 'var(--color-text-dim)');
    const transG = svg.append('g');
    const stateG = svg.append('g');
    // edges
    for (const tr of nfa.transitions) {
      const a = positions.get(tr.from), b = positions.get(tr.to);
      if (!a || !b) continue;
      const isEps = tr.symbol === '';
      const dx = b.x - a.x, dy = b.y - a.y;
      // For flat, we draw straight lines with slight curve for self-loops / multi-edges
      const d = Math.hypot(dx, dy) || 1;
      const ux = dx / d, uy = dy / d;
      const x1 = a.x + ux * (R + 2), y1 = a.y + uy * (R + 2);
      const x2 = b.x - ux * (R + 4), y2 = b.y - uy * (R + 4);
      // If there are parallel edges, offset a bit; simple heuristic: use offset on dy
      const isLoop = tr.from === tr.to;
      let pathD: string;
      if (isLoop) {
        pathD = `M ${a.x + R} ${a.y - 6} A 16 16 0 1 1 ${a.x + R - 1} ${a.y - 5}`;
      } else if (Math.abs(dy) > 30) {
        pathD = `M ${x1} ${y1} C ${x1 + 20} ${y1}, ${x2 - 20} ${y2}, ${x2} ${y2}`;
      } else {
        pathD = `M ${x1} ${y1} L ${x2} ${y2}`;
      }
      const p = transG.append('path').attr('d', pathD).attr('fill', 'none').attr('stroke', isEps ? 'var(--color-text-dim)' : 'var(--color-border-bright)').attr('stroke-width', 1.2).attr('marker-end', 'url(#arrow-flat)');
      if (isEps) p.attr('stroke-dasharray', '4,3');
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 - 6;
      if (tr.symbol !== '') {
        transG.append('text').attr('x', mx).attr('y', my).attr('text-anchor', 'middle').attr('fill', 'var(--color-text-dim)').style('font-size', '7px').style('font-family', 'JetBrains Mono, monospace').style('paint-order', 'stroke').attr('stroke', 'var(--color-card)').attr('stroke-width', 2).text(tr.symbol);
      } else {
        transG.append('text').attr('x', mx).attr('y', my).attr('text-anchor', 'middle').attr('fill', 'var(--color-text-muted)').style('font-size', '7px').style('font-family', 'JetBrains Mono, monospace').text(t('lexical.step2.epsilon'));
      }
    }
    // states
    const byId = new Map<number, NFAState>(nfa.states.map(s => [s.id, s]));
    for (const [id, pos] of positions) {
      const st = byId.get(id);
      if (!st) continue;
      const g = stateG.append('g').attr('transform', `translate(${pos.x},${pos.y})`);
      if (st.isAccept) g.append('circle').attr('r', R + 4.2).attr('fill', 'none').attr('stroke', 'var(--color-neon)').attr('stroke-width', 1.4);
      g.append('circle').attr('r', R).attr('fill', st.isStart || st.isAccept ? 'var(--color-neon-dim)' : 'var(--color-surface-3)').attr('stroke', st.isStart || st.isAccept ? 'var(--color-neon)' : 'var(--color-border-bright)').attr('stroke-width', 1.8);
      if (st.isStart) g.append('line').attr('x1', -R - 12).attr('y1', 0).attr('x2', -R - 3).attr('y2', 0).attr('stroke', 'var(--color-neon)').attr('stroke-width', 1.8).attr('marker-end', 'url(#arrow-flat)');
      g.append('text').attr('text-anchor', 'middle').attr('dy', 3.5).attr('fill', 'var(--color-text)').style('font-size', '7px').style('font-family', 'JetBrains Mono, monospace').style('font-weight', 'bold').text(st.label);
      if (st.isAccept && st.acceptType) g.append('text').attr('text-anchor', 'middle').attr('dy', R + 12).attr('fill', 'var(--color-neon)').style('font-size', '6px').style('font-family', 'JetBrains Mono, monospace').text(st.acceptType.slice(0, 4));
    }
    return () => { svg.selectAll('*').remove(); };
  }, [active, nfa, t, groupCounts, ordered]);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    if (active === 'FLAT') return; // flat uses flatSvgRef
    if (active === 'BUILD') return; // build draws separately
    if (!isPlaying && !isCompleted) {
      // still render even when idle — previously gated, now always render for inspection
    }
    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();
    const animate = isPlaying;
    const fadeIn = (sel: d3.Selection<d3.BaseType, unknown, null, undefined>, delay: number) =>
      sel.style('opacity', animate ? 0 : 1).transition().duration(animate ? 300 : 0).delay(animate ? delay : 0).style('opacity', 1);

    svg.append('defs').append('marker').attr('id', 'arrow-nfa').attr('viewBox', '0 -5 10 10').attr('refX', 9).attr('refY', 0).attr('markerWidth', 5).attr('markerHeight', 5).attr('orient', 'auto').append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', 'var(--color-text-dim)');

    const transGroup = svg.append('g');
    const stateGroup = svg.append('g');

    if (active === 'OVERVIEW' || !machine) {
      // Pure circles-and-arrows overview (textbook style): unified start circle fans ε to one circle per token group
      const startLabel = nfa.states.find(s => s.isStart)?.label ?? 'q0';
      const OVER_R = 22;
      const GAP_Y = 58;
      const groupsX = 220;
      const startX = 60;
      const width = PAD * 2 + groupsX + 120;
      const height = PAD * 2 + 30 + ordered.length * GAP_Y;
      svg.attr('viewBox', `0 0 ${width} ${height}`).attr('width', width).attr('height', height);
      const sy = height / 2;
      // start state — circle + incoming arrow + label (Thompson start)
      const sg = stateGroup.append('g').attr('transform', `translate(${startX},${sy})`);
      sg.append('circle').attr('r', R).attr('fill', 'var(--color-neon-dim)').attr('stroke', 'var(--color-neon)').attr('stroke-width', 2);
      sg.append('line').attr('x1', -R - 14).attr('y1', 0).attr('x2', -R - 4).attr('y2', 0).attr('stroke', 'var(--color-neon)').attr('stroke-width', 2).attr('marker-end', 'url(#arrow-nfa)');
      sg.append('text').attr('text-anchor', 'middle').attr('dy', 4).attr('fill', 'var(--color-text)').style('font-size', '9px').style('font-family', 'JetBrains Mono, monospace').style('font-weight', 'bold').text(startLabel);
      sg.append('text').attr('text-anchor', 'middle').attr('dy', R + 14).attr('fill', 'var(--color-neon)').style('font-size', '7px').style('font-family', 'JetBrains Mono, monospace').text('START');
      // one circle per token group — collapsed Thompson machine; badge shows TOKEN COUNTS per Java program (dynamic)
      ordered.forEach((m, i) => {
        const py = PAD + 18 + i * GAP_Y + OVER_R;
        const isAcceptGroup = m.states.some(s => s.isAccept);
        const tokCount = groupCounts[m.name] ?? 0;
        const hasTokens = tokCount > 0;
        const g = stateGroup.append('g').attr('transform', `translate(${groupsX},${py})`).attr('opacity', hasTokens ? 1 : 0.45);
        if (isAcceptGroup) g.append('circle').attr('r', OVER_R + 4).attr('fill', 'none').attr('stroke', hasTokens ? 'var(--color-neon)' : 'var(--color-border-bright)').attr('stroke-width', 1.2).attr('opacity', hasTokens ? 0.8 : 0.3);
        g.append('circle').attr('r', OVER_R).attr('fill', hasTokens ? 'var(--color-neon-dim)' : 'var(--color-surface-3)').attr('stroke', hasTokens ? 'var(--color-neon)' : 'var(--color-border-bright)').attr('stroke-width', hasTokens ? 2 : 1.2);
        g.append('text').attr('text-anchor', 'middle').attr('dy', -2).attr('fill', hasTokens ? 'var(--color-neon)' : 'var(--color-text-muted)').style('font-size', '8px').style('font-family', 'JetBrains Mono, monospace').style('font-weight', 'bold').text(m.name.slice(0, 4));
        g.append('text').attr('text-anchor', 'middle').attr('dy', 9).attr('fill', hasTokens ? 'var(--color-neon)' : 'var(--color-text-muted)').style('font-size', '7px').style('font-family', 'JetBrains Mono, monospace').style('font-weight', 'bold').text(`${tokCount} tok`);
        // epsilon arrow from unified start to this group circle (circle→circle, trimmed at perimeters)
        const dx = groupsX - startX, dy = py - sy, dist = Math.hypot(dx, dy) || 1;
        const ux = dx / dist, uy = dy / dist;
        const x1 = startX + ux * (R + 2), y1 = sy + uy * (R + 2);
        const x2 = groupsX - ux * (OVER_R + 4), y2 = py - uy * (OVER_R + 4);
        const line = transGroup.append('line').attr('x1', x1).attr('y1', y1).attr('x2', x2).attr('y2', y2).attr('stroke', 'var(--color-text-dim)').attr('stroke-width', 1).attr('stroke-dasharray', '4,3').attr('marker-end', 'url(#arrow-nfa)');
        fadeIn(line as unknown as d3.Selection<d3.BaseType, unknown, null, undefined>, i * 50);
        const mx = (x1 + x2) / 2 - 6, my = (y1 + y2) / 2 - 4;
        const lbl = transGroup.append('text').attr('x', mx).attr('y', my).attr('text-anchor', 'middle').attr('fill', 'var(--color-text-muted)').style('font-size', '8px').style('font-family', 'JetBrains Mono, monospace').text(t('lexical.step2.epsilon'));
        fadeIn(lbl as unknown as d3.Selection<d3.BaseType, unknown, null, undefined>, i * 50 + 90);
      });
      return () => { svg.selectAll('*').remove(); };
    }

    // FRAGMENT MODE
    const items = pruned?.items;
    let frag: Frag;
    if (machine.name === 'KEYWORD' && items && machine.root.kind === 'alt') frag = layoutAlt(machine.root, items);
    else frag = layoutNode(machine.root);
    const width = frag.w + PAD * 2;
    const height = frag.h + PAD * 2 + 20;
    svg.attr('viewBox', `0 0 ${width} ${height}`).attr('width', width).attr('height', height);
    for (const p of frag.nodes.values()) { p.x += PAD; p.y += PAD + 20; }
    svg.append('text').attr('x', PAD).attr('y', 14).attr('fill', 'var(--color-text-muted)').style('font-size', '8px').style('font-family', 'JetBrains Mono, monospace').text(`RE: ${machine.re}`);
    const stateById = new Map<number, NFAState>(machine.states.map(s => [s.id, s]));
    const pt = (id: number): Pt => frag.nodes.get(id)!;
    const trim = (a: Pt, b: Pt) => {
      const dx = b.x - a.x, dy = b.y - a.y; const d = Math.hypot(dx, dy) || 1; const ux = dx / d, uy = dy / d;
      return { x1: a.x + ux * (R + 2), y1: a.y + uy * (R + 2), x2: b.x - ux * (R + 4), y2: b.y - uy * (R + 4) };
    };
    let ti = 0;
    for (const e of frag.edges) {
      const a = pt(e.fromId), b = pt(e.toId);
      const isEps = e.kind !== 'sym';
      const stroke = isEps ? 'var(--color-text-dim)' : 'var(--color-border-bright)';
      const dash = isEps ? '4,3' : null;
      let pathD: string; let lx: number, ly: number;
      if (e.kind === 'skip') {
        const dip = Math.max(b.y, a.y) + SKIP_CLEAR * 0.65;
        const c1x = a.x + (b.x - a.x) * 0.3, c2x = a.x + (b.x - a.x) * 0.7;
        pathD = `M ${a.x} ${a.y} C ${c1x} ${dip}, ${c2x} ${dip}, ${b.x - R - 4} ${b.y}`; lx = (a.x + b.x) / 2; ly = dip + 2;
      } else if (e.kind === 'loop') {
        const apex = Math.min(a.y, b.y) - LOOP_CLEAR * 0.75;
        pathD = `M ${a.x} ${a.y} C ${a.x - 14} ${apex}, ${b.x + 14} ${apex}, ${b.x + R + 4} ${b.y}`; lx = (a.x + b.x) / 2; ly = apex - 4;
      } else if (e.kind === 'eps' && Math.abs(a.y - b.y) > 2) {
        const t0 = trim(a, b); const c1x = a.x + (b.x - a.x) * 0.5, c2x = b.x - (b.x - a.x) * 0.5;
        pathD = `M ${t0.x1} ${t0.y1} C ${c1x} ${a.y}, ${c2x} ${b.y}, ${t0.x2} ${t0.y2}`; lx = (a.x + b.x) / 2; ly = (a.y + b.y) / 2 - 5;
      } else { const t0 = trim(a, b); pathD = `M ${t0.x1} ${t0.y1} L ${t0.x2} ${t0.y2}`; lx = (t0.x1 + t0.x2) / 2; ly = (t0.y1 + t0.y2) / 2 - 7; }
      const p = transGroup.append('path').attr('d', pathD).attr('fill', 'none').attr('stroke', stroke).attr('stroke-width', 1.4).attr('marker-end', 'url(#arrow-nfa)');
      if (dash) p.attr('stroke-dasharray', dash);
      fadeIn(p as unknown as d3.Selection<d3.BaseType, unknown, null, undefined>, ti * 40);
      const label = e.kind === 'sym' ? e.label : t('lexical.step2.epsilon');
      const txt = transGroup.append('text').attr('x', lx).attr('y', ly).attr('text-anchor', 'middle').attr('fill', isEps ? 'var(--color-text-muted)' : 'var(--color-text-dim)').style('font-size', '9px').style('font-family', 'JetBrains Mono, monospace').style('paint-order', 'stroke').attr('stroke', 'var(--color-card)').attr('stroke-width', 3).text(label);
      if (e.kind === 'sym') txt.append('title').text(`class: ${e.label}`);
      fadeIn(txt as unknown as d3.Selection<d3.BaseType, unknown, null, undefined>, ti * 40 + 120);
      ti++;
    }
    frag.nodes.forEach((pos, id) => {
      const st = stateById.get(id);
      const isBridge = id === BRIDGE_ID;
      const g = stateGroup.append('g').attr('transform', `translate(${pos.x},${pos.y})`).style('opacity', animate ? 0 : 1);
      if (isBridge) {
        g.append('rect').attr('x', -38).attr('y', -15).attr('width', 76).attr('height', 30).attr('rx', 9).attr('fill', 'var(--color-surface-3)').attr('stroke', 'var(--color-border-bright)').attr('stroke-width', 1.2).attr('stroke-dasharray', '4,3');
        g.append('text').attr('text-anchor', 'middle').attr('dy', 4).attr('fill', 'var(--color-text)').style('font-size', '10px').style('font-family', 'JetBrains Mono, monospace').style('font-weight', 'bold').text(`+${hiddenCount}`);
        g.append('text').attr('text-anchor', 'middle').attr('dy', 26).attr('fill', 'var(--color-text-muted)').style('font-size', '7px').style('font-family', 'JetBrains Mono, monospace').text(t('lexical.step2.moreBranchesNote'));
      } else if (st) {
        if (st.isAccept) g.append('circle').attr('r', R + 4.5).attr('fill', 'none').attr('stroke', 'var(--color-neon)').attr('stroke-width', 1.5);
        g.append('circle').attr('r', R).attr('fill', st.isStart || st.isAccept ? 'var(--color-neon-dim)' : 'var(--color-surface-3)').attr('stroke', st.isStart || st.isAccept ? 'var(--color-neon)' : 'var(--color-border-bright)').attr('stroke-width', 2);
        if (st.isStart) g.append('line').attr('x1', -R - 14).attr('y1', 0).attr('x2', -R - 4).attr('y2', 0).attr('stroke', 'var(--color-neon)').attr('stroke-width', 2).attr('marker-end', 'url(#arrow-nfa)');
        g.append('text').attr('text-anchor', 'middle').attr('dy', 4).attr('fill', 'var(--color-text)').style('font-size', '9px').style('font-family', 'JetBrains Mono, monospace').style('font-weight', 'bold').text(st.label);
        if (st.isAccept) g.append('text').attr('text-anchor', 'middle').attr('dy', R + 15).attr('fill', 'var(--color-neon)').style('font-size', '7px').style('font-family', 'JetBrains Mono, monospace').text(machine.name);
      }
      g.transition().duration(animate ? 300 : 0).delay(animate ? ti * 40 + 200 : 0).style('opacity', 1);
    });
    return () => { svg.selectAll('*').remove(); };
  }, [nfa, machines, ordered, active, machine, pruned, hiddenCount, groupCounts, isPlaying, isCompleted, t]);

  // BUILD tab SVG
  const buildSvgRef = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (active !== 'BUILD') return;
    const svgEl = buildSvgRef.current;
    if (!svgEl) return;
    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();
    const animate = isPlaying;
    svg.append('defs').append('marker').attr('id', 'arrow-build').attr('viewBox', '0 -5 10 10').attr('refX', 9).attr('refY', 0).attr('markerWidth', 5).attr('markerHeight', 5).attr('orient', 'auto').append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', 'var(--color-text-dim)');
    const entry = buildFrags[buildStep];
    if (!entry) return;
    const frag = entry.frag;
    const width = frag.w + PAD * 2;
    const height = frag.h + PAD * 2 + 24;
    svg.attr('viewBox', `0 0 ${width} ${height}`).attr('width', width).attr('height', height);
    for (const p of frag.nodes.values()) { p.x += PAD; p.y += PAD + 18; }
    svg.append('text').attr('x', PAD).attr('y', 13).attr('fill', 'var(--color-neon)').style('font-size', '9px').style('font-family', 'JetBrains Mono, monospace').style('font-weight', 'bold').text(`${entry.label}   RE: ${entry.re}`);
    const stateById = new Map<number, NFAState>([...figureExample.nfa.states.map(s => [s.id, s] as const)]);
    const pt = (id: number) => frag.nodes.get(id);
    const trim = (a: Pt, b: Pt) => { const dx = b.x - a.x, dy = b.y - a.y; const d = Math.hypot(dx, dy) || 1; const ux = dx / d, uy = dy / d; return { x1: a.x + ux * (R + 2), y1: a.y + uy * (R + 2), x2: b.x - ux * (R + 4), y2: b.y - uy * (R + 4) }; };
    const transG = svg.append('g');
    const stateG = svg.append('g');
    let ti = 0;
    for (const e of frag.edges) {
      const a = pt(e.fromId), b = pt(e.toId);
      if (!a || !b) continue;
      const isEps = e.kind !== 'sym';
      const stroke = isEps ? 'var(--color-text-dim)' : 'var(--color-neon)';
      const dash = isEps ? '4,3' : null;
      let pathD: string; let lx: number, ly: number;
      if (e.kind === 'skip') {
        const dip = Math.max(b.y, a.y) + SKIP_CLEAR * 0.65;
        const c1x = a.x + (b.x - a.x) * 0.3, c2x = a.x + (b.x - a.x) * 0.7;
        pathD = `M ${a.x} ${a.y} C ${c1x} ${dip}, ${c2x} ${dip}, ${b.x - R - 4} ${b.y}`; lx = (a.x + b.x) / 2; ly = dip + 2;
      } else if (e.kind === 'loop') {
        const apex = Math.min(a.y, b.y) - LOOP_CLEAR * 0.75;
        pathD = `M ${a.x} ${a.y} C ${a.x - 14} ${apex}, ${b.x + 14} ${apex}, ${b.x + R + 4} ${b.y}`; lx = (a.x + b.x) / 2; ly = apex - 4;
      } else if (e.kind === 'eps' && Math.abs(a.y - b.y) > 2) {
        const t0 = trim(a, b); const c1x = a.x + (b.x - a.x) * 0.5, c2x = b.x - (b.x - a.x) * 0.5;
        pathD = `M ${t0.x1} ${t0.y1} C ${c1x} ${a.y}, ${c2x} ${b.y}, ${t0.x2} ${t0.y2}`; lx = (a.x + b.x) / 2; ly = (a.y + b.y) / 2 - 5;
      } else { const t0 = trim(a, b); pathD = `M ${t0.x1} ${t0.y1} L ${t0.x2} ${t0.y2}`; lx = (t0.x1 + t0.x2) / 2; ly = (t0.y1 + t0.y2) / 2 - 7; }
      const p = transG.append('path').attr('d', pathD).attr('fill', 'none').attr('stroke', stroke).attr('stroke-width', 1.4).attr('marker-end', 'url(#arrow-build)');
      if (dash) p.attr('stroke-dasharray', dash);
      if (animate) p.style('opacity', 0).transition().duration(300).delay(ti * 60).style('opacity', 1);
      const txt = transG.append('text').attr('x', lx).attr('y', ly).attr('text-anchor', 'middle').attr('fill', isEps ? 'var(--color-text-muted)' : 'var(--color-neon)').style('font-size', '9px').style('font-family', 'JetBrains Mono, monospace').style('paint-order', 'stroke').attr('stroke', 'var(--color-card)').attr('stroke-width', 3).text(isEps ? t('lexical.step2.epsilon') : e.label);
      if (animate) txt.style('opacity', 0).transition().duration(300).delay(ti * 60 + 80).style('opacity', 1);
      ti++;
    }
    frag.nodes.forEach((pos, id) => {
      const st = stateById.get(id);
      const g = stateG.append('g').attr('transform', `translate(${pos.x},${pos.y})`).style('opacity', animate ? 0 : 1);
      if (st) {
        if (st.isAccept) g.append('circle').attr('r', R + 4).attr('fill', 'none').attr('stroke', 'var(--color-neon)').attr('stroke-width', 1.2);
        g.append('circle').attr('r', R).attr('fill', st.isStart || st.isAccept ? 'var(--color-neon-dim)' : 'var(--color-surface-3)').attr('stroke', st.isStart || st.isAccept ? 'var(--color-neon)' : 'var(--color-border-bright)').attr('stroke-width', 1.8);
        g.append('text').attr('text-anchor', 'middle').attr('dy', 3.5).attr('fill', 'var(--color-text)').style('font-size', '8px').style('font-family', 'JetBrains Mono, monospace').style('font-weight', 'bold').text(st.label);
      } else {
        g.append('circle').attr('r', R).attr('fill', 'var(--color-surface-3)').attr('stroke', 'var(--color-border-bright)').attr('stroke-width', 1.5);
        g.append('text').attr('text-anchor', 'middle').attr('dy', 3.5).attr('fill', 'var(--color-text-muted)').style('font-size', '8px').style('font-family', 'JetBrains Mono, monospace').text(`q${id}`);
      }
      if (animate) g.transition().duration(300).delay(ti * 60 + 120).style('opacity', 1);
    });
    return () => { svg.selectAll('*').remove(); };
  }, [active, buildStep, buildFrags, figureExample, isPlaying, t]);

  // Custom RE NFA (editable) — reuse Thompson layout
  useEffect(() => {
    if (active !== 'BUILD' || !customFrag || !customResult?.nfa || customResult.error) return;
    const svgEl = customSvgRef.current;
    if (!svgEl) return;
    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();
    svg.append('defs').append('marker').attr('id', 'arrow-custom').attr('viewBox', '0 -5 10 10').attr('refX', 9).attr('refY', 0).attr('markerWidth', 5).attr('markerHeight', 5).attr('orient', 'auto').append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', 'var(--color-text-dim)');
    const frag = customFrag;
    const width = frag.w + PAD * 2;
    const height = frag.h + PAD * 2 + 12;
    svg.attr('viewBox', `0 0 ${width} ${height}`).attr('width', width).attr('height', height);
    for (const p of frag.nodes.values()) { p.x += PAD; p.y += PAD + 8; }
    const stateById = new Map<number, NFAState>(customResult.nfa.states.map(s => [s.id, s] as const));
    const pt = (id: number) => frag.nodes.get(id);
    const trim = (a: Pt, b: Pt) => { const dx = b.x - a.x, dy = b.y - a.y; const d = Math.hypot(dx, dy) || 1; const ux = dx / d, uy = dy / d; return { x1: a.x + ux * (R + 2), y1: a.y + uy * (R + 2), x2: b.x - ux * (R + 4), y2: b.y - uy * (R + 4) }; };
    const transG = svg.append('g');
    const stateG = svg.append('g');
    for (const e of frag.edges) {
      const a = pt(e.fromId), b = pt(e.toId);
      if (!a || !b) continue;
      const isEps = e.kind !== 'sym';
      const stroke = isEps ? 'var(--color-text-dim)' : 'var(--color-neon)';
      const dash = isEps ? '4,3' : null;
      let pathD: string; let lx: number, ly: number;
      if (e.kind === 'skip') {
        const dip = Math.max(b.y, a.y) + SKIP_CLEAR * 0.65;
        const c1x = a.x + (b.x - a.x) * 0.3, c2x = a.x + (b.x - a.x) * 0.7;
        pathD = `M ${a.x} ${a.y} C ${c1x} ${dip}, ${c2x} ${dip}, ${b.x - R - 4} ${b.y}`; lx = (a.x + b.x) / 2; ly = dip + 2;
      } else if (e.kind === 'loop') {
        const apex = Math.min(a.y, b.y) - LOOP_CLEAR * 0.75;
        pathD = `M ${a.x} ${a.y} C ${a.x - 14} ${apex}, ${b.x + 14} ${apex}, ${b.x + R + 4} ${b.y}`; lx = (a.x + b.x) / 2; ly = apex - 4;
      } else if (e.kind === 'eps' && Math.abs(a.y - b.y) > 2) {
        const t0 = trim(a, b); const c1x = a.x + (b.x - a.x) * 0.5, c2x = b.x - (b.x - a.x) * 0.5;
        pathD = `M ${t0.x1} ${t0.y1} C ${c1x} ${a.y}, ${c2x} ${b.y}, ${t0.x2} ${t0.y2}`; lx = (a.x + b.x) / 2; ly = (a.y + b.y) / 2 - 5;
      } else { const t0 = trim(a, b); pathD = `M ${t0.x1} ${t0.y1} L ${t0.x2} ${t0.y2}`; lx = (t0.x1 + t0.x2) / 2; ly = (t0.y1 + t0.y2) / 2 - 7; }
      const p = transG.append('path').attr('d', pathD).attr('fill', 'none').attr('stroke', stroke).attr('stroke-width', 1.4).attr('marker-end', 'url(#arrow-custom)');
      if (dash) p.attr('stroke-dasharray', dash);
      const txt = transG.append('text').attr('x', lx).attr('y', ly).attr('text-anchor', 'middle').attr('fill', isEps ? 'var(--color-text-muted)' : 'var(--color-neon)').style('font-size', '9px').style('font-family', 'JetBrains Mono, monospace').style('paint-order', 'stroke').attr('stroke', 'var(--color-card)').attr('stroke-width', 3).text(isEps ? t('lexical.step2.epsilon') : e.label);
      void txt;
    }
    frag.nodes.forEach((pos, id) => {
      const st = stateById.get(id);
      const g = stateG.append('g').attr('transform', `translate(${pos.x},${pos.y})`);
      if (st) {
        if (st.isAccept) g.append('circle').attr('r', R + 4).attr('fill', 'none').attr('stroke', 'var(--color-neon)').attr('stroke-width', 1.2);
        g.append('circle').attr('r', R).attr('fill', st.isStart || st.isAccept ? 'var(--color-neon-dim)' : 'var(--color-surface-3)').attr('stroke', st.isStart || st.isAccept ? 'var(--color-neon)' : 'var(--color-border-bright)').attr('stroke-width', 1.8);
        if (st.isStart) g.append('line').attr('x1', -R - 14).attr('y1', 0).attr('x2', -R - 4).attr('y2', 0).attr('stroke', 'var(--color-neon)').attr('stroke-width', 2).attr('marker-end', 'url(#arrow-custom)');
        g.append('text').attr('text-anchor', 'middle').attr('dy', 3.5).attr('fill', 'var(--color-text)').style('font-size', '8px').style('font-family', 'JetBrains Mono, monospace').style('font-weight', 'bold').text(st.label);
      }
    });
    return () => { svg.selectAll('*').remove(); };
  }, [active, customFrag, customResult, t]);

  const tabBtn = (label: string, key: string) => {
    const isActive = active === key;
    return (
      <button key={key} onClick={() => setActive(key)} className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold tracking-wide border transition-colors ${isActive ? 'bg-[var(--color-neon-dim)] text-[var(--color-neon)] border-[var(--color-neon)]' : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border-bright)] hover:text-[var(--color-text)]'}`}>
        {label}
      </button>
    );
  };

  const subtitle = active === 'OVERVIEW' ? t('lexical.step2.overviewHint') : active === 'FLAT' ? t('lexical.step2.flatHint') : active === 'BUILD' ? t('lexical.step2.buildHint') : (hiddenCount > 0 ? t('lexical.step2.keywordHint', { shown: KEYWORDS_SHOWN, hidden: hiddenCount + KEYWORDS_SHOWN }) : t('lexical.step2.description'));

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-[var(--color-neon)] font-display tracking-[0.1em] uppercase mb-1">{t('lexical.step2.title')}</h2>
        <p className="text-xs text-[var(--color-text-dim)] font-mono leading-relaxed">{subtitle}</p>
        <p className="text-[10px] text-[var(--color-text-muted)] font-mono mt-1">{t('lexical.step2.caption')}</p>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {VIEW_TABS.map(v => tabBtn(t(v.labelKey), v.key))}
      </div>
      {active === 'BUILD' && (
        <div className="flex flex-col gap-2 mb-3">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-wide text-[var(--color-text-muted)] font-mono">Try your own RE:</span>
              <input value={customInput} onChange={e => setCustomInput(e.target.value)} placeholder="(a|b)*  or  (a(b|c))*  — use | for or, * + ? quantifiers" className="flex-1 px-2 py-1 rounded border border-[var(--color-border-bright)] bg-[var(--color-card)] text-xs font-mono text-[var(--color-text)] focus:outline-none focus:border-[var(--color-neon)]" maxLength={64} />
              <span className="text-[10px] font-mono text-[var(--color-text-muted)]">{customResult?.statesCount ?? 0} states</span>
            </div>
            {customResult?.error && <div className="text-[10px] font-mono text-[var(--color-error)] bg-[var(--color-error-dim)]/20 border border-[var(--color-error-dim)] rounded px-2 py-1">{customResult.error} {customInput.includes('/') && !customInput.includes('|') ? '— did you mean | for alternation? / is literal.' : ''}</div>}
            <div className="flex flex-wrap gap-1">
              {PRESET_RES.map(p => (
                <button key={p} onClick={() => setCustomInput(p)} className={`px-2 py-0.5 rounded text-[10px] font-mono border ${customInput === p ? 'bg-[var(--color-neon-dim)] text-[var(--color-neon)] border-[var(--color-neon)]' : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border-bright)] hover:text-[var(--color-text)]'}`}>{p}</button>
              ))}
            </div>
            {customResult?.nfa && customFrag && !customResult.error && (
              <div className="border border-[var(--color-neon)]/30 rounded-lg overflow-auto bg-[var(--color-card)] p-2">
                <div className="text-[10px] font-mono text-[var(--color-neon)] mb-1">Your RE: {customInput} — Thompson NFA (q0 start)</div>
                <svg ref={customSvgRef} className="block" role="img" aria-label="Custom RE NFA" />
              </div>
            )}
          </div>
          <div className="flex gap-1.5">
            <span className="text-[10px] font-mono text-[var(--color-text-muted)] self-center">Walkthrough a(b|c)*:</span>
            {buildFrags.map((_, i) => (
              <button key={i} onClick={() => setBuildStep(i)} className={`px-2 py-0.5 rounded text-[10px] font-mono border ${buildStep === i ? 'bg-[var(--color-neon-dim)] text-[var(--color-neon)] border-[var(--color-neon)]' : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border-bright)]'}`}>{i + 1}</button>
            ))}
            <span className="text-[10px] font-mono text-[var(--color-text-muted)] self-center ml-2">{buildFrags[buildStep]?.re}</span>
          </div>
        </div>
      )}
      {machine && active !== 'OVERVIEW' && active !== 'FLAT' && active !== 'BUILD' && (
        <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] font-mono text-[var(--color-text-muted)]">
          <span className="text-[var(--color-neon)] font-bold">{machine.name}</span>
          <span>· {machine.re}</span>
          <span className={ (groupCounts[machine.name] ?? 0) > 0 ? 'text-[var(--color-neon)] font-bold' : ''}>· {groupCounts[machine.name] ?? 0} tokens in this file</span>
          <span>· {t('lexical.step2.statesCount', { count: machine.states.length })}</span>
          <span>· {t('lexical.step2.transitionsCount', { count: machine.transitions.length })}</span>
          {hiddenCount > 0 && <span className="text-[var(--color-text-dim)]">· {t('lexical.step2.showingNote', { shown: KEYWORDS_SHOWN, total: machine.states.length })}</span>}
        </div>
      )}
      {active === 'FLAT' ? (
        <div className="border border-[var(--color-border-bright)] rounded-lg overflow-auto bg-[var(--color-card)] p-2 sm:p-4 max-h-[70vh]">
          <svg ref={flatSvgRef} className="block" role="img" aria-label="Flat NFA state diagram" preserveAspectRatio="xMinYMin meet" />
        </div>
      ) : active === 'BUILD' ? (
        <div className="border border-[var(--color-border-bright)] rounded-lg overflow-auto bg-[var(--color-card)] p-2 sm:p-4 max-h-[70vh]">
          <svg ref={buildSvgRef} className="block" role="img" aria-label="Stepwise Thompson construction for a(b|c)*" preserveAspectRatio="xMinYMin meet" />
        </div>
      ) : (
        <div className="border border-[var(--color-border-bright)] rounded-lg overflow-auto bg-[var(--color-card)] p-2 sm:p-4 max-h-[70vh]">
          <svg ref={svgRef} className="block" role="img" aria-label="NFA state diagram" preserveAspectRatio="xMinYMin meet" />
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-4 text-[10px] font-mono text-[var(--color-text-muted)]">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full border-2 border-[var(--color-neon)] inline-block" />{t('lexical.step2.acceptState')}</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[var(--color-neon-dim)] border-2 border-[var(--color-neon)] inline-block" />{t('lexical.step2.startState')}</span>
        <span className="flex items-center gap-1"><span className="text-[var(--color-text-dim)]">{t('lexical.step2.epsilon')}</span>= epsilon transition</span>
        <span className="flex items-center gap-1"><span className="inline-block w-4 h-0 border-t border-dashed border-[var(--color-border-bright)]" />{t('lexical.step2.hiddenHint')}</span>
      </div>
    </div>
  );
};

export default NfaGraph;
