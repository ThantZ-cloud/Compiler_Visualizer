import React, { useRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import type { DFA, SubsetConstructionStep } from '../../lib/lexer/types';
import { drawDfaGraph } from './drawDfaGraph';

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
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setVisibleSteps(i);
      if (i >= steps.length) clearInterval(interval);
    }, 600);
    return () => clearInterval(interval);
  }, [isPlaying, isCompleted, steps.length]);

  // Draw DFA graph (layered layout, bundled parallel edges)
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl || (!isPlaying && !isCompleted)) return;
    drawDfaGraph(svgEl, dfa, {
      accent: 'var(--color-cyan)',
      accentDim: 'var(--color-cyan-dim)',
      animate: isPlaying,
    });
    return () => {
      while (svgEl.firstChild) svgEl.removeChild(svgEl.firstChild);
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
        <div className="border border-[var(--color-border-bright)] rounded-lg overflow-auto bg-[var(--color-card)] p-2 sm:p-4 max-h-[70vh]">
          <svg
            ref={svgRef}
            className="block"
            role="img"
            aria-label="DFA state diagram"
            preserveAspectRatio="xMinYMin meet"
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
