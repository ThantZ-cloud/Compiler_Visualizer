import React, { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import * as d3 from 'd3';
import type { NFA, NFAState } from '../../lib/lexer/types';

interface NfaGraphProps {
  nfa: NFA;
  isPlaying: boolean;
  isCompleted: boolean;
}

const R = 12; // state circle radius

// ── Layout constants ──
const START_X = 60;
const START_Y = 46;
const LANES_X0 = 170; // first column x for branch states
const LANES_RIGHT = 780;
const LANE_H = 104;
const LANES_Y0 = 110;
const MIN_STEP = 38;
const COLLAPSE_ABOVE = 40; // lanes longer than this show head+ellipsis+tail
const HEAD_SHOWN = 6;
const TAIL_SHOWN = 3;

const NfaGraph: React.FC<NfaGraphProps> = ({ nfa, isPlaying, isCompleted }) => {
  const { t } = useTranslation();
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || (!isPlaying && !isCompleted)) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // When the step is already completed (not actively playing),
    // draw everything instantly with no fade-in delays.
    const animate = isPlaying;

    // ── Branch discovery ──
    // BFS from the unified start state to isolate each token group's regex
    // branch (KEYWORD, IDENTIFIER, ...). States reachable through several
    // branches (e.g. the shared keyword accept) are positioned once, in the
    // first branch that reaches them.
    const startState = nfa.states.find(s => s.isStart);
    const branchOrder: string[] = [];
    const branchStates = new Map<string, NFAState[]>();
    const owner = new Map<number, string>(); // stateId → first branch name

    if (startState) {
      for (const t0 of nfa.transitions.filter(tr => tr.from === startState.id)) {
        const visited: number[] = [];
        const seen = new Set<number>();
        const queue: number[] = [t0.to];
        let branchName = 'UNKNOWN';

        while (queue.length > 0) {
          const curr = queue.shift()!;
          if (seen.has(curr)) continue;
          seen.add(curr);
          visited.push(curr);

          const st = nfa.states.find(s => s.id === curr);
          if (st?.acceptType) branchName = st.acceptType;

          for (const tr of nfa.transitions) {
            if (tr.from === curr && !seen.has(tr.to) && tr.to !== startState.id) queue.push(tr.to);
          }
        }

        if (!branchStates.has(branchName)) {
          branchOrder.push(branchName);
          branchStates.set(branchName, []);
        }
        const bucket = branchStates.get(branchName)!;
        for (const id of visited) {
          if (!owner.has(id)) {
            owner.set(id, branchName);
            const st = nfa.states.find(s => s.id === id);
            if (st) bucket.push(st);
          }
        }
      }
      for (const name of branchOrder) {
        branchStates.get(name)!.sort((a, b) => a.id - b.id);
      }
    }

    // ── Positions ──
    const positions = new Map<number, { x: number; y: number }>();
    const collapsedBridges: { fromId: number; toId: number; hidden: number; y: number; x1: number; x2: number }[] = [];
    const laneLabels: { name: string; count: number; x: number; y: number }[] = [];

    if (startState) positions.set(startState.id, { x: START_X, y: START_Y });

    // First pass: measure lanes so the viewBox can grow when a lane needs
    // more than LANES_RIGHT (e.g. the OPERATOR lane's 22 multi-char branches).
    let width = 800;
    const lanePlans = branchOrder.map((name, bi) => {
      const states = branchStates.get(name)!;
      const fits = states.length <= COLLAPSE_ABOVE;
      const visibleCount = fits ? states.length : HEAD_SHOWN + TAIL_SHOWN;
      return { name, states, bi, fits, visibleCount };
    });
    for (const plan of lanePlans) {
      const step = Math.max(MIN_STEP, Math.min(95, (LANES_RIGHT - LANES_X0) / Math.max(1, plan.visibleCount - 1)));
      width = Math.max(width, LANES_X0 + (plan.visibleCount - 1) * step + 40);
    }

    lanePlans.forEach(plan => {
      const { name, states, bi, fits, visibleCount } = plan;
      const yc = LANES_Y0 + bi * LANE_H + LANE_H / 2;
      laneLabels.push({ name, count: states.length, x: 8, y: yc - 24 });

      const step = Math.max(MIN_STEP, Math.min(95, (width - 40 - LANES_X0) / Math.max(1, visibleCount - 1)));

      const place = (s: NFAState, si: number) => positions.set(s.id, { x: LANES_X0 + si * step, y: yc });

      if (fits) {
        states.forEach(place);
      } else {
        // head states … ellipsis … tail states (last one is typically accept)
        states.slice(0, HEAD_SHOWN).forEach(place);
        states.slice(states.length - TAIL_SHOWN).forEach((s, i) => place(s, HEAD_SHOWN + i));
        collapsedBridges.push({
          fromId: states[HEAD_SHOWN - 1].id,
          toId: states[states.length - TAIL_SHOWN].id,
          hidden: states.length - HEAD_SHOWN - TAIL_SHOWN,
          y: yc,
          x1: LANES_X0 + (HEAD_SHOWN - 1) * step + R + 4,
          x2: LANES_X0 + HEAD_SHOWN * step - R - 4,
        });
      }
    });

    const height = LANES_Y0 + branchOrder.length * LANE_H + 30;
    svg.attr('viewBox', `0 0 ${width} ${height}`);

    // ── Arrow marker ──
    svg
      .append('defs')
      .append('marker')
      .attr('id', 'arrow-nfa')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 9)
      .attr('refY', 0)
      .attr('markerWidth', 5)
      .attr('markerHeight', 5)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', 'var(--color-text-dim)');

    const transitionGroup = svg.append('g').attr('class', 'transitions');

    const fadeIn = (sel: d3.Selection<d3.BaseType, unknown, null, undefined>, delay: number) =>
      sel.style('opacity', animate ? 0 : 1).transition().duration(animate ? 400 : 0).delay(animate ? delay : 0).style('opacity', 1);

    // ── Lane backgrounds + headers ──
    laneLabels.forEach((lane, i) => {
      transitionGroup
        .append('rect')
        .attr('x', 4)
        .attr('y', LANES_Y0 + i * LANE_H + 4)
        .attr('width', width - 8)
        .attr('height', LANE_H - 8)
        .attr('rx', 8)
        .attr('fill', 'var(--color-surface-2)')
        .attr('opacity', 0.35);
      transitionGroup
        .append('text')
        .attr('x', lane.x)
        .attr('y', lane.y)
        .attr('fill', 'var(--color-neon)')
        .style('font-size', '9px')
        .style('font-family', 'JetBrains Mono, monospace')
        .style('font-weight', 'bold')
        .text(`${lane.name} (${lane.count})`);
    });

    // ── Transitions ──
    nfa.transitions.forEach((trans, i) => {
      const from = positions.get(trans.from);
      const to = positions.get(trans.to);
      if (!from || !to) return;

      const label = trans.symbol === '' ? t('lexical.step2.epsilon') : trans.symbol;

      // ε-fan from unified start to each branch head — straight lines
      if (trans.from === nfa.startState) {
        const dx = to.x - START_X - R;
        const dy = to.y - START_Y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const line = transitionGroup
          .append('line')
          .attr('x1', START_X + R + 2)
          .attr('y1', START_Y)
          .attr('x2', to.x - R - 4)
          .attr('y2', to.y - 2)
          .attr('stroke', 'var(--color-border-bright)')
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '3,3')
          .attr('marker-end', 'url(#arrow-nfa)');
        fadeIn(line as unknown as d3.Selection<d3.BaseType, unknown, null, undefined>, i * 80);

        const lbl = transitionGroup
          .append('text')
          .attr('x', START_X + R + dist * 0.45)
          .attr('y', START_Y + dy * 0.42)
          .attr('text-anchor', 'middle')
          .attr('fill', 'var(--color-text-muted)')
          .style('font-size', '8px')
          .style('font-family', 'JetBrains Mono, monospace')
          .text(label);
        fadeIn(lbl as unknown as d3.Selection<d3.BaseType, unknown, null, undefined>, i * 80 + 200);
        return;
      }

      if (trans.from === trans.to) {
        // Self-loop above the node
        const loopPath = `M ${from.x - 10} ${from.y - R + 2} C ${from.x - 26} ${from.y - R - 22}, ${from.x + 26} ${from.y - R - 22}, ${from.x + 10} ${from.y - R + 2}`;
        const p = transitionGroup.append('path').attr('d', loopPath).attr('fill', 'none').attr('stroke', 'var(--color-border-bright)').attr('stroke-width', 1.5).attr('marker-end', 'url(#arrow-nfa)');
        fadeIn(p as unknown as d3.Selection<d3.BaseType, unknown, null, undefined>, i * 80);
        const txt = transitionGroup.append('text').attr('x', from.x).attr('y', from.y - R - 14).attr('text-anchor', 'middle').attr('fill', 'var(--color-text-dim)').style('font-size', '9px').style('font-family', 'JetBrains Mono, monospace').text(label);
        fadeIn(txt as unknown as d3.Selection<d3.BaseType, unknown, null, undefined>, i * 80 + 200);
      } else {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const ux = dx / dist;
        const uy = dy / dist;

        const line = transitionGroup
          .append('line')
          .attr('x1', from.x + ux * (R + 2))
          .attr('y1', from.y + uy * (R + 2))
          .attr('x2', to.x - ux * (R + 4))
          .attr('y2', to.y - uy * (R + 4))
          .attr('stroke', 'var(--color-border-bright)')
          .attr('stroke-width', 1.5)
          .attr('marker-end', 'url(#arrow-nfa)');
        fadeIn(line as unknown as d3.Selection<d3.BaseType, unknown, null, undefined>, i * 80);

        // Label above midpoint only when there is room
        if (dist >= MIN_STEP) {
          const txt = transitionGroup
            .append('text')
            .attr('x', (from.x + to.x) / 2)
            .attr('y', (from.y + to.y) / 2 - 7)
            .attr('text-anchor', 'middle')
            .attr('fill', 'var(--color-text-dim)')
            .style('font-size', '9px')
            .style('font-family', 'JetBrains Mono, monospace')
            .text(label);
          fadeIn(txt as unknown as d3.Selection<d3.BaseType, unknown, null, undefined>, i * 80 + 200);
        }
      }
    });

    // ── Collapse bridges ──
    collapsedBridges.forEach((b, i) => {
      const g = transitionGroup.append('g');
      g.append('line')
        .attr('x1', b.x1)
        .attr('y1', b.y)
        .attr('x2', b.x2)
        .attr('y2', b.y)
        .attr('stroke', 'var(--color-text-muted)')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '4,4');
      g.append('text')
        .attr('x', (b.x1 + b.x2) / 2)
        .attr('y', b.y - 6)
        .attr('text-anchor', 'middle')
        .attr('fill', 'var(--color-text-muted)')
        .style('font-size', '8px')
        .style('font-family', 'JetBrains Mono, monospace')
        .text(`+${b.hidden} states (char chains)`);
      void b.fromId; void b.toId;
      fadeIn(g as unknown as d3.Selection<d3.BaseType, unknown, null, undefined>, i * 120);
    });

    // ── States ──
    const stateGroup = svg.append('g').attr('class', 'states');

    let si = 0;
    nfa.states.forEach(state => {
      const pos = positions.get(state.id);
      if (!pos) return;

      const g = stateGroup
        .append('g')
        .attr('transform', `translate(${pos.x}, ${pos.y})`)
        .style('opacity', animate ? 0 : 1);

      if (state.isAccept) {
        g.append('circle')
          .attr('r', R + 4)
          .attr('fill', 'none')
          .attr('stroke', 'var(--color-neon)')
          .attr('stroke-width', 1.5);
      }

      g.append('circle')
        .attr('r', R)
        .attr('fill', state.isStart || state.isAccept ? 'var(--color-neon-dim)' : 'var(--color-surface-3)')
        .attr('stroke', state.isStart || state.isAccept ? 'var(--color-neon)' : 'var(--color-border-bright)')
        .attr('stroke-width', 2);

      if (state.isStart) {
        g.append('line')
          .attr('x1', -R - 12)
          .attr('y1', 0)
          .attr('x2', -R - 3)
          .attr('y2', 0)
          .attr('stroke', 'var(--color-neon)')
          .attr('stroke-width', 2)
          .attr('marker-end', 'url(#arrow-nfa)');
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
          .attr('dy', R + 16)
          .attr('fill', 'var(--color-neon)')
          .style('font-size', '8px')
          .style('font-family', 'JetBrains Mono, monospace')
          .style('font-weight', 'bold')
          .text(state.acceptType.length > 12 ? `${state.acceptType.slice(0, 11)}…` : state.acceptType);
      }

      g.transition().duration(animate ? 400 : 0).delay(animate ? si * 60 : 0).style('opacity', 1);
      si++;
    });

    return () => {
      svg.selectAll('*').remove();
    };
  }, [nfa, isPlaying, isCompleted, t]);

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Description */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-[var(--color-neon)] font-display tracking-[0.1em] uppercase mb-2">
          {t('lexical.step2.title')}
        </h2>
        <p className="text-xs text-[var(--color-text-dim)] font-mono leading-relaxed">
          {t('lexical.step2.description')}
        </p>
      </div>

      {/* Graph — horizontally scrollable on small screens */}
      <div className="border border-[var(--color-border-bright)] rounded-lg overflow-hidden bg-[var(--color-card)] p-2 sm:p-4 overflow-x-auto">
        <svg
          ref={svgRef}
          className="w-full min-w-[520px] sm:min-w-[640px]"
          style={{ minHeight: '380px' }}
          role="img"
          aria-label="NFA state diagram"
          preserveAspectRatio="xMinYMin meet"
        />
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 text-[10px] font-mono text-[var(--color-text-muted)]">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full border-2 border-[var(--color-neon)] inline-block" />
          {t('lexical.step2.acceptState')}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-[var(--color-neon-dim)] border-2 border-[var(--color-neon)] inline-block" />
          {t('lexical.step2.startState')}
        </span>
        <span className="flex items-center gap-1">
          <span className="text-[var(--color-text-dim)]">{t('lexical.step2.epsilon')}</span>
          = epsilon transition
        </span>
      </div>
    </div>
  );
};

export default NfaGraph;
