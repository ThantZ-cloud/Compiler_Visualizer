import React, { useRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import type { DFA } from '../../lib/lexer/types';
import type { HopcroftStep } from '../../lib/lexer/hopcroft';
import { drawDfaGraph } from './drawDfaGraph';

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
    const svgEl = svgRef.current;
    if (!svgEl) return;
    drawDfaGraph(svgEl, minDfa, {
      accent: 'var(--color-neon)',
      accentDim: 'var(--color-neon-dim)',
      animate: isPlaying,
    });
    return () => {
      while (svgEl.firstChild) svgEl.removeChild(svgEl.firstChild);
    };
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
        <div className="border border-[var(--color-border-bright)] rounded-lg overflow-auto bg-[var(--color-card)] p-2 sm:p-4 max-h-[70vh]">
          <svg ref={svgRef} className="block" role="img" aria-label="Minimized DFA state diagram" preserveAspectRatio="xMinYMin meet" />
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
