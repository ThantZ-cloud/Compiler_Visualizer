import React, { useRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as d3 from 'd3';
import { motion } from 'framer-motion';
import type { DFA, SubsetConstructionStep } from '../../lib/lexer/types';

interface DfaGraphProps {
  dfa: DFA;
  steps: SubsetConstructionStep[];
  isPlaying: boolean;
  isCompleted: boolean;
}

const DfaGraph: React.FC<DfaGraphProps> = ({ dfa, steps, isPlaying, isCompleted }) => {
  const { t } = useTranslation();
  const svgRef = useRef<SVGSVGElement>(null);
  const [visibleSteps, setVisibleSteps] = useState(0);

  // Animate steps appearing one by one
  useEffect(() => {
    if (!isPlaying && !isCompleted) {
      setVisibleSteps(0);
      return;
    }
    if (isCompleted) {
      setVisibleSteps(steps.length);
      return;
    }
    // Playing: increment visible steps over time
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setVisibleSteps(i);
      if (i >= steps.length) clearInterval(interval);
    }, 600);
    return () => clearInterval(interval);
  }, [isPlaying, isCompleted, steps.length]);

  // Draw DFA graph
  useEffect(() => {
    if (!svgRef.current || (!isPlaying && !isCompleted)) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // When the step is already completed (not actively playing),
    // draw everything instantly with no fade-in delays.
    const animate = isPlaying;

    const width = 800;
    const height = 450;
    svg.attr('viewBox', `0 0 ${width} ${height}`);

    // Layout: arrange states in a grid
    const cols = Math.ceil(Math.sqrt(dfa.states.length));
    const rows = Math.ceil(dfa.states.length / cols);
    const cellW = width / (cols + 1);
    const cellH = height / (rows + 1);

    const positions = new Map<number, { x: number; y: number }>();
    dfa.states.forEach((s, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      positions.set(s.id, {
        x: cellW * (col + 1),
        y: cellH * (row + 1),
      });
    });

    // Arrow marker
    svg
      .append('defs')
      .append('marker')
      .attr('id', 'arrow-dfa')
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
    const transGroup = svg.append('g');

    dfa.transitions.forEach((trans, i) => {
      const from = positions.get(trans.from);
      const to = positions.get(trans.to);
      if (!from || !to) return;

      const isSelfLoop = trans.from === trans.to;

      if (isSelfLoop) {
        const loopPath = `M ${from.x - 12} ${from.y - 12} C ${from.x - 28} ${from.y - 32}, ${from.x + 28} ${from.y - 32}, ${from.x + 12} ${from.y - 12}`;
        transGroup
          .append('path')
          .attr('d', loopPath)
          .attr('fill', 'none')
          .attr('stroke', 'var(--color-cyan-dim)')
          .attr('stroke-width', 1.5)
          .attr('marker-end', 'url(#arrow-dfa)')
          .style('opacity', animate ? 0 : 1)
          .transition()
          .duration(animate ? 300 : 0)
          .delay(animate ? i * 50 : 0)
          .style('opacity', 1);

        transGroup
          .append('text')
          .attr('x', from.x)
          .attr('y', from.y - 35)
          .attr('text-anchor', 'middle')
          .attr('fill', 'var(--color-cyan)')
          .style('font-size', '8px')
          .style('font-family', 'JetBrains Mono, monospace')
          .text(trans.symbol)
          .style('opacity', animate ? 0 : 1)
          .transition()
          .duration(animate ? 300 : 0)
          .delay(animate ? i * 50 + 150 : 0)
          .style('opacity', 1);
      } else {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const offsetX = (dx / dist) * 16;
        const offsetY = (dy / dist) * 16;

        transGroup
          .append('line')
          .attr('x1', from.x + offsetX)
          .attr('y1', from.y + offsetY)
          .attr('x2', to.x - offsetX)
          .attr('y2', to.y - offsetY)
          .attr('stroke', 'var(--color-cyan-dim)')
          .attr('stroke-width', 1.5)
          .attr('marker-end', 'url(#arrow-dfa)')
          .style('opacity', animate ? 0 : 1)
          .transition()
          .duration(animate ? 300 : 0)
          .delay(animate ? i * 50 : 0)
          .style('opacity', 1);

        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2;
        transGroup
          .append('text')
          .attr('x', midX)
          .attr('y', midY - 6)
          .attr('text-anchor', 'middle')
          .attr('fill', 'var(--color-cyan)')
          .style('font-size', '8px')
          .style('font-family', 'JetBrains Mono, monospace')
          .text(trans.symbol)
          .style('opacity', animate ? 0 : 1)
          .transition()
          .duration(animate ? 300 : 0)
          .delay(animate ? i * 50 + 150 : 0)
          .style('opacity', 1);
      }
    });

    // Draw states
    const stateGroup = svg.append('g');

    dfa.states.forEach((state, i) => {
      const pos = positions.get(state.id);
      if (!pos) return;

      const g = stateGroup
        .append('g')
        .attr('transform', `translate(${pos.x}, ${pos.y})`)
        .style('opacity', animate ? 0 : 1);

      if (state.isAccept) {
        g.append('circle')
          .attr('r', 16)
          .attr('fill', 'none')
          .attr('stroke', 'var(--color-cyan)')
          .attr('stroke-width', 1.5);
      }

      g.append('circle')
        .attr('r', 12)
        .attr('fill', state.isStart ? 'var(--color-cyan-dim)' : state.isAccept ? 'var(--color-cyan-dim)' : 'var(--color-surface-3)')
        .attr('stroke', state.isStart || state.isAccept ? 'var(--color-cyan)' : 'var(--color-border-bright)')
        .attr('stroke-width', 2);

      if (state.isStart) {
        g.append('line')
          .attr('x1', -24)
          .attr('y1', 0)
          .attr('x2', -14)
          .attr('y2', 0)
          .attr('stroke', 'var(--color-cyan)')
          .attr('stroke-width', 2)
          .attr('marker-end', 'url(#arrow-dfa)');
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
          .attr('dy', 32)
          .attr('fill', 'var(--color-cyan)')
          .style('font-size', '7px')
          .style('font-family', 'JetBrains Mono, monospace')
          .text(state.acceptType);
      }

      g.transition()
        .duration(animate ? 300 : 0)
        .delay(animate ? i * 80 : 0)
        .style('opacity', 1);
    });

    return () => {
      svg.selectAll('*').remove();
    };
  }, [dfa, isPlaying, isCompleted]);

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Description */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-[var(--color-cyan)] font-display tracking-[0.1em] uppercase mb-2">
          {t('lexical.step3.title')}
        </h2>
        <p className="text-xs text-[var(--color-text-dim)] font-mono leading-relaxed">
          {t('lexical.step3.description')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
        {/* DFA Graph */}
        <div className="border border-[var(--color-border-bright)] rounded-lg overflow-hidden bg-[var(--color-card)] p-4">
          <svg
            ref={svgRef}
            className="w-full"
            style={{ minHeight: '450px' }}
            role="img"
            aria-label="DFA state diagram"
          />
        </div>

        {/* Subset construction log */}
        <div className="border border-[var(--color-border-bright)] rounded-lg bg-[var(--color-card)] flex flex-col max-h-[450px]">
          <div className="px-4 py-2 border-b border-[var(--color-border-bright)] shrink-0">
            <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-[var(--color-text-muted)] font-display">
              {t('lexical.step3.subsetLog')}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {steps.slice(0, visibleSteps).map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className={`text-[10px] font-mono leading-relaxed p-2 rounded ${
                  step.isNewState
                    ? 'bg-[var(--color-cyan-dim)] text-[var(--color-cyan)]'
                    : step.dfaStateId === -1
                    ? 'bg-[var(--color-neon-dim)] text-[var(--color-neon)] font-bold'
                    : 'text-[var(--color-text-dim)]'
                }`}
              >
                {step.description}
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-4 flex items-center gap-4 text-[10px] font-mono text-[var(--color-text-muted)]">
        <span>
          {t('lexical.step3.dfaStates')}: <span className="text-[var(--color-cyan)]">{dfa.states.length}</span>
        </span>
        {visibleSteps >= steps.length && (
          <span className="text-[var(--color-neon)]">
            {t('lexical.step3.fixedPointReached')}
          </span>
        )}
      </div>
    </div>
  );
};

export default DfaGraph;
