import React, { useRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as d3 from 'd3';
import { motion } from 'framer-motion';
import type { DFA } from '../../lib/lexer/types';
import type { HopcroftStep } from '../../lib/lexer/hopcroft';

interface MinimizedDfaGraphProps {
  dfa: DFA;
  minDfa: DFA;
  hopcroftSteps: HopcroftStep[];
  isPlaying: boolean;
  isCompleted: boolean;
}

const MinimizedDfaGraph: React.FC<MinimizedDfaGraphProps> = ({ minDfa, hopcroftSteps, isPlaying, isCompleted }) => {
  const { t } = useTranslation();
  const svgRef = useRef<SVGSVGElement>(null);
  const [visibleSteps, setVisibleSteps] = useState(0);

  useEffect(() => {
    if (!isPlaying && !isCompleted) { setVisibleSteps(0); return; }
    if (isCompleted) { setVisibleSteps(hopcroftSteps.length); return; }
    let i = 0;
    const interval = setInterval(() => { i++; setVisibleSteps(i); if (i >= hopcroftSteps.length) clearInterval(interval); }, 650);
    return () => clearInterval(interval);
  }, [isPlaying, isCompleted, hopcroftSteps.length]);

  useEffect(() => {
    if (!svgRef.current || (!isPlaying && !isCompleted)) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    const animate = isPlaying;
    const width = 800; const height = 420;
    svg.attr('viewBox', `0 0 ${width} ${height}`);
    const cols = Math.ceil(Math.sqrt(minDfa.states.length));
    const rows = Math.ceil(minDfa.states.length / cols);
    const cellW = width / (cols + 1); const cellH = height / (rows + 1);
    const positions = new Map<number, { x: number; y: number }>();
    minDfa.states.forEach((s, i) => {
      const col = i % cols; const row = Math.floor(i / cols);
      positions.set(s.id, { x: cellW * (col + 1), y: cellH * (row + 1) });
    });
    svg.append('defs').append('marker').attr('id', 'arrow-min').attr('viewBox', '0 -5 10 10').attr('refX', 18).attr('refY', 0).attr('markerWidth', 6).attr('markerHeight', 6).attr('orient', 'auto').append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', 'var(--color-text-dim)');
    const transGroup = svg.append('g');
    minDfa.transitions.forEach((trans, i) => {
      const from = positions.get(trans.from); const to = positions.get(trans.to); if (!from || !to) return;
      const isSelfLoop = trans.from === trans.to;
      if (isSelfLoop) {
        const loopPath = `M ${from.x - 12} ${from.y - 12} C ${from.x - 28} ${from.y - 32}, ${from.x + 28} ${from.y - 32}, ${from.x + 12} ${from.y - 12}`;
        transGroup.append('path').attr('d', loopPath).attr('fill', 'none').attr('stroke', 'var(--color-neon-dim)').attr('stroke-width', 1.5).attr('marker-end', 'url(#arrow-min)').style('opacity', animate ? 0 : 1).transition().duration(animate ? 300 : 0).delay(animate ? i * 50 : 0).style('opacity', 1);
        transGroup.append('text').attr('x', from.x).attr('y', from.y - 35).attr('text-anchor', 'middle').attr('fill', 'var(--color-neon)').style('font-size', '8px').style('font-family', 'JetBrains Mono, monospace').text(trans.symbol).style('opacity', animate ? 0 : 1).transition().duration(animate ? 300 : 0).delay(animate ? i * 50 + 150 : 0).style('opacity', 1);
      } else {
        const dx = to.x - from.x; const dy = to.y - from.y; const dist = Math.sqrt(dx * dx + dy * dy); const offsetX = (dx / dist) * 16; const offsetY = (dy / dist) * 16;
        transGroup.append('line').attr('x1', from.x + offsetX).attr('y1', from.y + offsetY).attr('x2', to.x - offsetX).attr('y2', to.y - offsetY).attr('stroke', 'var(--color-neon-dim)').attr('stroke-width', 1.5).attr('marker-end', 'url(#arrow-min)').style('opacity', animate ? 0 : 1).transition().duration(animate ? 300 : 0).delay(animate ? i * 50 : 0).style('opacity', 1);
        const midX = (from.x + to.x) / 2; const midY = (from.y + to.y) / 2;
        transGroup.append('text').attr('x', midX).attr('y', midY - 6).attr('text-anchor', 'middle').attr('fill', 'var(--color-neon)').style('font-size', '8px').style('font-family', 'JetBrains Mono, monospace').text(trans.symbol).style('opacity', animate ? 0 : 1).transition().duration(animate ? 300 : 0).delay(animate ? i * 50 + 150 : 0).style('opacity', 1);
      }
    });
    const stateGroup = svg.append('g');
    minDfa.states.forEach((state, i) => {
      const pos = positions.get(state.id); if (!pos) return;
      const g = stateGroup.append('g').attr('transform', `translate(${pos.x}, ${pos.y})`).style('opacity', animate ? 0 : 1);
      if (state.isAccept) g.append('circle').attr('r', 16).attr('fill', 'none').attr('stroke', 'var(--color-neon)').attr('stroke-width', 1.5);
      g.append('circle').attr('r', 12).attr('fill', state.isStart ? 'var(--color-neon-dim)' : state.isAccept ? 'var(--color-neon-dim)' : 'var(--color-surface-3)').attr('stroke', state.isStart || state.isAccept ? 'var(--color-neon)' : 'var(--color-border-bright)').attr('stroke-width', 2);
      if (state.isStart) g.append('line').attr('x1', -24).attr('y1', 0).attr('x2', -14).attr('y2', 0).attr('stroke', 'var(--color-neon)').attr('stroke-width', 2).attr('marker-end', 'url(#arrow-min)');
      g.append('text').attr('text-anchor', 'middle').attr('dy', 4).attr('fill', 'var(--color-text)').style('font-size', '9px').style('font-family', 'JetBrains Mono, monospace').style('font-weight', 'bold').text(state.label);
      if (state.acceptType) g.append('text').attr('text-anchor', 'middle').attr('dy', 32).attr('fill', 'var(--color-neon)').style('font-size', '7px').style('font-family', 'JetBrains Mono, monospace').text(state.acceptType);
      g.transition().duration(animate ? 300 : 0).delay(animate ? i * 80 : 0).style('opacity', 1);
    });
    return () => { svg.selectAll('*').remove(); };
  }, [minDfa, isPlaying, isCompleted]);

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-[var(--color-neon)] font-display tracking-[0.1em] uppercase mb-2">
          {t('lexical.minimization.title', 'DFA Minimization (Hopcroft)')}
        </h2>
        <p className="text-xs text-[var(--color-text-dim)] font-mono leading-relaxed">
          {t('lexical.minimization.description', "Hopcroft's algorithm refines the partition of DFA states until no group can be split — the second fixed point. Each minimal state M is a merged equivalence class of original DFA states D.")}
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
        <div className="border border-[var(--color-border-bright)] rounded-lg overflow-hidden bg-[var(--color-card)] p-2 sm:p-4 overflow-x-auto">
          <svg ref={svgRef} className="w-full min-w-[480px] sm:min-w-[520px]" style={{ minHeight: '360px' }} role="img" aria-label="Minimized DFA state diagram" preserveAspectRatio="xMinYMin meet" />
        </div>
        <div className="border border-[var(--color-border-bright)] rounded-lg bg-[var(--color-card)] flex flex-col max-h-[420px]">
          <div className="px-4 py-2 border-b border-[var(--color-border-bright)] shrink-0">
            <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-[var(--color-text-muted)] font-display">
              {t('lexical.minimization.partitionLog', 'Partition Refinement Log')}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {hopcroftSteps.slice(0, visibleSteps).map((step, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}
                className={`text-[10px] font-mono leading-relaxed p-2 rounded ${step.iteration === 0 ? 'bg-[var(--color-neon-dim)] text-[var(--color-neon)]' : step.iteration === hopcroftSteps.length - 1 ? 'bg-[var(--color-cyan-dim)] text-[var(--color-cyan)] font-bold' : 'text-[var(--color-text-dim)]'}`}>
                {step.description}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-4 text-[10px] font-mono text-[var(--color-text-muted)]">
        <span>Min DFA states: <span className="text-[var(--color-neon)]">{minDfa.states.length}</span></span>
        {visibleSteps >= hopcroftSteps.length && <span className="text-[var(--color-neon)]">{t('lexical.minimization.fixedPointReached', 'Minimization fixed point reached')}</span>}
      </div>
    </div>
  );
};

export default MinimizedDfaGraph;
