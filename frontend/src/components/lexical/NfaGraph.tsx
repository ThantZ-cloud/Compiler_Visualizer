import React, { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import * as d3 from 'd3';
import type { NFA } from '../../lib/lexer/types';

interface NfaGraphProps {
  nfa: NFA;
  isPlaying: boolean;
  isCompleted: boolean;
}

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

    const width = 800;
    const baseHeight = 500;

    // ── Branch layout ──
    // BFS from the unified start state to isolate each token group's
    // regex branch (KEYWORD, IDENTIFIER, ...). Each branch becomes a lane.
    const startState = nfa.states.find(s => s.isStart);
    const branches: Record<string, typeof nfa.states> = {};

    if (startState) {
      const startTransitions = nfa.transitions.filter(t => t.from === startState.id);
      startTransitions.forEach(t => {
        const visited = new Set<number>();
        const queue: number[] = [t.to];
        let branchName = 'UNKNOWN';

        while (queue.length > 0) {
          const curr = queue.shift()!;
          if (visited.has(curr)) continue;
          visited.add(curr);

          const state = nfa.states.find(s => s.id === curr);
          if (state?.acceptType) branchName = state.acceptType;

          for (const tr of nfa.transitions) {
            if (tr.from === curr) queue.push(tr.to);
          }
        }

        branches[branchName] = Array.from(visited)
          .map(id => nfa.states.find(s => s.id === id)!)
          .sort((a, b) => a.id - b.id);
      });
    }

    const branchKeys = Object.keys(branches);
    const laneHeight = 110;
    const height = Math.max(baseHeight, (branchKeys.length + 1) * laneHeight + 40);
    svg.attr('viewBox', `0 0 ${width} ${height}`);

    // Position states: start state on the left, branch lanes below/above
    const positions = new Map<number, { x: number; y: number }>();
    if (startState) {
      positions.set(startState.id, { x: 55, y: height / 2 });
    }

    branchKeys.forEach((key, bi) => {
      const states = branches[key];
      const y = laneHeight * (bi + 1);
      states.forEach((s, si) => {
        positions.set(s.id, { x: 160 + si * 95, y });
      });
    });

    // Define arrow marker
    svg
      .append('defs')
      .append('marker')
      .attr('id', 'arrow-nfa')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 18)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', 'var(--color-text-dim)');

    // Draw transitions
    const transitionGroup = svg.append('g').attr('class', 'transitions');

    nfa.transitions.forEach((trans, i) => {
      const from = positions.get(trans.from);
      const to = positions.get(trans.to);
      if (!from || !to) return;

      const isSelfLoop = trans.from === trans.to;
      const label = trans.symbol === '' ? t('lexical.step2.epsilon') : trans.symbol;

      if (isSelfLoop) {
        // Draw self-loop as arc above the node
        const loopPath = `M ${from.x - 12} ${from.y - 12} C ${from.x - 30} ${from.y - 35}, ${from.x + 30} ${from.y - 35}, ${from.x + 12} ${from.y - 12}`;

        transitionGroup
          .append('path')
          .attr('d', loopPath)
          .attr('fill', 'none')
          .attr('stroke', 'var(--color-border-bright)')
          .attr('stroke-width', 1.5)
          .attr('marker-end', 'url(#arrow-nfa)')
          .style('opacity', animate ? 0 : 1)
          .transition()
          .duration(animate ? 400 : 0)
          .delay(animate ? i * 80 : 0)
          .style('opacity', 1);

        transitionGroup
          .append('text')
          .attr('x', from.x)
          .attr('y', from.y - 38)
          .attr('text-anchor', 'middle')
          .attr('fill', 'var(--color-text-muted)')
          .style('font-size', '9px')
          .style('font-family', 'JetBrains Mono, monospace')
          .text(label)
          .style('opacity', animate ? 0 : 1)
          .transition()
          .duration(animate ? 400 : 0)
          .delay(animate ? i * 80 + 200 : 0)
          .style('opacity', 1);
      } else {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const offsetX = (dx / dist) * 16;
        const offsetY = (dy / dist) * 16;

        transitionGroup
          .append('line')
          .attr('x1', from.x + offsetX)
          .attr('y1', from.y + offsetY)
          .attr('x2', to.x - offsetX)
          .attr('y2', to.y - offsetY)
          .attr('stroke', 'var(--color-border-bright)')
          .attr('stroke-width', 1.5)
          .attr('marker-end', 'url(#arrow-nfa)')
          .style('opacity', animate ? 0 : 1)
          .transition()
          .duration(animate ? 400 : 0)
          .delay(animate ? i * 80 : 0)
          .style('opacity', 1);

        // Label at midpoint
        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2;
        transitionGroup
          .append('text')
          .attr('x', midX)
          .attr('y', midY - 6)
          .attr('text-anchor', 'middle')
          .attr('fill', 'var(--color-text-dim)')
          .style('font-size', '9px')
          .style('font-family', 'JetBrains Mono, monospace')
          .text(label)
          .style('opacity', animate ? 0 : 1)
          .transition()
          .duration(animate ? 400 : 0)
          .delay(animate ? i * 80 + 200 : 0)
          .style('opacity', 1);
      }
    });

    // Draw states
    const stateGroup = svg.append('g').attr('class', 'states');

    nfa.states.forEach((state, i) => {
      const pos = positions.get(state.id);
      if (!pos) return;

      const g = stateGroup
        .append('g')
        .attr('transform', `translate(${pos.x}, ${pos.y})`)
        .style('opacity', animate ? 0 : 1);

      // Accept state gets double circle
      if (state.isAccept) {
        g.append('circle')
          .attr('r', 16)
          .attr('fill', 'none')
          .attr('stroke', 'var(--color-neon)')
          .attr('stroke-width', 1.5);
      }

      // Main circle
      g.append('circle')
        .attr('r', 12)
        .attr('fill', state.isStart ? 'var(--color-neon-dim)' : state.isAccept ? 'var(--color-neon-dim)' : 'var(--color-surface-3)')
        .attr('stroke', state.isStart ? 'var(--color-neon)' : state.isAccept ? 'var(--color-neon)' : 'var(--color-border-bright)')
        .attr('stroke-width', 2);

      // Start state arrow
      if (state.isStart) {
        g.append('line')
          .attr('x1', -24)
          .attr('y1', 0)
          .attr('x2', -14)
          .attr('y2', 0)
          .attr('stroke', 'var(--color-neon)')
          .attr('stroke-width', 2)
          .attr('marker-end', 'url(#arrow-nfa)');
      }

      // State label
      g.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', 4)
        .attr('fill', 'var(--color-text)')
        .style('font-size', '9px')
        .style('font-family', 'JetBrains Mono, monospace')
        .style('font-weight', 'bold')
        .text(state.label);

      // Accept type label below
      if (state.acceptType) {
        g.append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', 32)
          .attr('fill', 'var(--color-neon)')
          .style('font-size', '8px')
          .style('font-family', 'JetBrains Mono, monospace')
          .style('font-weight', 'bold')
          .text(state.acceptType);
      }

      g.transition()
        .duration(animate ? 400 : 0)
        .delay(animate ? i * 60 : 0)
        .style('opacity', 1);
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

      {/* Graph */}
      <div className="border border-[var(--color-border-bright)] rounded-lg overflow-hidden bg-[var(--color-card)] p-4">
        <svg
          ref={svgRef}
          className="w-full"
          style={{ minHeight: '500px' }}
          role="img"
          aria-label="NFA state diagram"
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