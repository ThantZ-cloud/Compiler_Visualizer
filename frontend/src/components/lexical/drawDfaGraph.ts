import * as d3 from 'd3';
import type { DFA } from '../../lib/lexer/types';
import { layeredLayout } from './dagLayout';

// ── Shared DFA graph renderer ──
// Used by DfaGraph (subset construction) and MinimizedDfaGraph (Hopcroft).
// Draws the automaton with a layered layout and bundles parallel edges
// (same from→to) into one curved path with combined labels, which removes
// the arrow spaghetti of the old grid layout.

interface DrawOptions {
  accent: string; // main color, e.g. var(--color-cyan)
  accentDim: string;
  animate: boolean;
}

const R = 13;

export function drawDfaGraph(
  svgRef: SVGSVGElement | null,
  dfa: DFA,
  opts: DrawOptions
): void {
  if (!svgRef) return;
  const svg = d3.select(svgRef);
  svg.selectAll('*').remove();
  const { accent, accentDim, animate } = opts;

  const layout = layeredLayout(dfa, { nodeRadius: R });
  const positions = layout.positions;
  svg.attr('viewBox', `0 0 ${layout.width} ${layout.height}`);
  // Render at natural size (1:1 px) so the card scrolls instead of shrinking
  // the diagram into an unreadable hairball.
  svg.attr('width', layout.width).attr('height', layout.height);

  const fadeIn = (sel: d3.Selection<d3.BaseType, unknown, null, undefined>, delay: number) =>
    sel.style('opacity', animate ? 0 : 1).transition().duration(animate ? 300 : 0).delay(animate ? delay : 0).style('opacity', 1);

  // Arrow marker
  svg.append('defs').append('marker')
    .attr('id', `arrow-dfa-${accent.replace(/[^a-z-]/g, '')}`)
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 9)
    .attr('refY', 0)
    .attr('markerWidth', 5)
    .attr('markerHeight', 5)
    .attr('orient', 'auto')
    .append('path')
    .attr('d', 'M0,-5L10,0L0,5')
    .attr('fill', accentDim);
  const markerId = `arrow-dfa-${accent.replace(/[^a-z-]/g, '')}`;

  const transGroup = svg.append('g');
  const stateGroup = svg.append('g');

  const stateById = new Map(dfa.states.map(s => [s.id, s]));

  // ── Bundle parallel transitions: same ordered (from,to) pair → one curve ──
  interface Bundle {
    from: number;
    to: number;
    symbols: string[]; // deduped display labels
    index: number;
    total: number;
  }
  const bundles = new Map<string, Bundle>();
  for (const t of dfa.transitions) {
    const key = `${t.from}->${t.to}`;
    const b = bundles.get(key) ?? { from: t.from, to: t.to, symbols: [], index: 0, total: 0 };
    if (!b.symbols.includes(t.symbol)) b.symbols.push(t.symbol);
    bundles.set(key, b);
  }
  for (const b of bundles.values()) {
    // cap label length
    if (b.symbols.length > 3) b.symbols = [...b.symbols.slice(0, 2), `+${b.symbols.length - 2}`];
  }
  const byPair = new Map<string, Bundle[]>();
  for (const b of bundles.values()) {
    const pairKey = `${Math.min(b.from, b.to)}|${Math.max(b.from, b.to)}`;
    if (!byPair.has(pairKey)) byPair.set(pairKey, []);
    byPair.get(pairKey)!.push(b);
  }
  let ti = 0;
  for (const group of byPair.values()) {
    const bidirectional = group.length === 2 && group[0].from !== group[0].to &&
      ((group[0].from === group[1].to && group[0].to === group[1].from));
    group.forEach((b, k) => {
      b.total = bidirectional ? 2 : group.length;
      b.index = bidirectional ? (k === 0 ? -1 : 1) : k - (group.length - 1) / 2;
    });
  }

  for (const b of bundles.values()) {
    const from = positions.get(b.from);
    const to = positions.get(b.to);
    if (!from || !to) continue;
    const stateTo = stateById.get(b.to);

    if (b.from === b.to) {
      // self-loop above-right
      const path = `M ${from.x + 4} ${from.y - R + 2} C ${from.x - 24} ${from.y - R - 26}, ${from.x + 34} ${from.y - R - 26}, ${from.x + 12} ${from.y - R + 2}`;
      const p = transGroup.append('path').attr('d', path).attr('fill', 'none')
        .attr('stroke', accentDim).attr('stroke-width', 1.5).attr('marker-end', `url(#${markerId})`);
      fadeIn(p as unknown as d3.Selection<d3.BaseType, unknown, null, undefined>, ti * 50);
      const txt = transGroup.append('text').attr('x', from.x + 6).attr('y', from.y - R - 16)
        .attr('text-anchor', 'middle').attr('fill', accent)
        .style('font-size', '8px').style('font-family', 'JetBrains Mono, monospace')
        .style('paint-order', 'stroke').attr('stroke', 'var(--color-card)').attr('stroke-width', 3)
        .text(b.symbols.join('|'));
      fadeIn(txt as unknown as d3.Selection<d3.BaseType, unknown, null, undefined>, ti * 50 + 150);
    } else {
      // curved edge; curvature fans out parallel/bidirectional bundles
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx = -dy / dist;
      const ny = dx / dist;
      const curve = b.index * 0.16 * dist;

      const sx = from.x + (dx / dist) * (R + 2) + nx * curve * 0.35;
      const sy = from.y + (dy / dist) * (R + 2) + ny * curve * 0.35;
      const ex = to.x - (dx / dist) * (R + 5) + nx * curve * 0.35;
      const ey = to.y - (dy / dist) * (R + 5) + ny * curve * 0.35;
      const c1x = from.x + dx * 0.28 + nx * curve;
      const c1y = from.y + dy * 0.28 + ny * curve;
      const c2x = from.x + dx * 0.72 + nx * curve;
      const c2y = from.y + dy * 0.72 + ny * curve;

      const p = transGroup.append('path')
        .attr('d', `M ${sx} ${sy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${ex} ${ey}`)
        .attr('fill', 'none').attr('stroke', accentDim).attr('stroke-width', 1.5)
        .attr('marker-end', `url(#${markerId})`);
      fadeIn(p as unknown as d3.Selection<d3.BaseType, unknown, null, undefined>, ti * 50);

      // label near the middle, nudged along the normal
      const mx = (from.x + to.x) / 2 + nx * curve;
      const my = (from.y + to.y) / 2 + ny * curve - (curve === 0 ? 7 : 0);
      const txt = transGroup.append('text').attr('x', mx).attr('y', my)
        .attr('text-anchor', 'middle').attr('fill', accent)
        .style('font-size', '8px').style('font-family', 'JetBrains Mono, monospace')
        .style('paint-order', 'stroke').attr('stroke', 'var(--color-card)').attr('stroke-width', 3)
        .text(b.symbols.join('|'));
      fadeIn(txt as unknown as d3.Selection<d3.BaseType, unknown, null, undefined>, ti * 50 + 150);
    }
    void stateTo;
    ti++;
  }

  // ── States ──
  dfa.states.forEach((state, i) => {
    const pos = positions.get(state.id);
    if (!pos) return;

    const g = stateGroup
      .append('g')
      .attr('transform', `translate(${pos.x}, ${pos.y})`)
      .style('opacity', animate ? 0 : 1);

    if (state.isAccept) {
      g.append('circle').attr('r', R + 4).attr('fill', 'none')
        .attr('stroke', accent).attr('stroke-width', 1.5);
    }

    g.append('circle')
      .attr('r', R)
      .attr('fill', state.isStart || state.isAccept ? accentDim : 'var(--color-surface-3)')
      .attr('stroke', state.isStart || state.isAccept ? accent : 'var(--color-border-bright)')
      .attr('stroke-width', 2);

    if (state.isStart) {
      g.append('line').attr('x1', -R - 12).attr('y1', 0).attr('x2', -R - 3).attr('y2', 0)
        .attr('stroke', accent).attr('stroke-width', 2).attr('marker-end', `url(#${markerId})`);
    }

    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 4)
      .attr('fill', 'var(--color-text)')
      .style('font-size', '9px')
      .style('font-family', 'JetBrains Mono, monospace')
      .style('font-weight', 'bold')
      .text(state.label);

    if (state.acceptType) {
      g.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', R + 14)
        .attr('fill', accent)
        .style('font-size', '7px')
        .style('font-family', 'JetBrains Mono, monospace')
        .text(state.acceptType.length > 14 ? `${state.acceptType.slice(0, 13)}…` : state.acceptType);
    }

    g.transition().duration(animate ? 300 : 0).delay(animate ? i * 60 : 0).style('opacity', 1);
  });
}
