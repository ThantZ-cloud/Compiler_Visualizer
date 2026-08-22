import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { CfgMethod } from '../../types';
import type { DataFlowResult } from '../../lib/cfg/dataflow';
import { Activity } from 'lucide-react';

interface DataFlowAnalysisProps {
  method: CfgMethod;
  result: DataFlowResult;
  isPlaying: boolean;
  isCompleted: boolean;
}

const DataFlowAnalysis: React.FC<DataFlowAnalysisProps> = ({ method, result, isPlaying, isCompleted }) => {
  const { t } = useTranslation();
  const [visibleSteps, setVisibleSteps] = useState<Set<number>>(new Set());
  const [activeBlock, setActiveBlock] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isPlaying) {
      if (isCompleted) {
        setVisibleSteps(new Set(result.steps.map((_, i) => i)));
      } else {
        setVisibleSteps(new Set());
        setActiveBlock(null);
      }
      return;
    }
    setVisibleSteps(new Set());
    let i = 0;
    const show = () => {
      if (i >= result.steps.length) return;
      setVisibleSteps(prev => new Set([...prev, i]));
      setActiveBlock(result.steps[i].blockId);
      i++;
      timerRef.current = setTimeout(show, 150);
    };
    timerRef.current = setTimeout(show, 200);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isPlaying, isCompleted, result]);

  const isVisible = isPlaying || isCompleted;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 px-1">
        <Activity size={14} className="text-[#FF00FF]" />
        <h4 className="text-[11px] font-bold text-[var(--color-text)] font-display tracking-[0.1em] uppercase m-0">
          {t('optimizer.step4.title', 'Data-Flow Analysis')}
        </h4>
        <span className="text-[9px] text-[var(--color-text-muted)] font-mono">
          ({result.totalIterations} iterations, {result.converged ? 'converged' : 'max iterations'})
        </span>
      </div>
      <p className="text-[10px] text-[var(--color-text-dim)] font-mono px-1 -mt-1">
        {t('optimizer.step4.description', 'Liveness analysis propagates variable usage information backward through the CFG. A variable is "live" at a point if its value may be read before being redefined.')}
      </p>

      {/* Summary stats */}
      <div className="flex gap-3 px-1">
        <div className="flex items-center gap-1.5 text-[9px] font-mono text-[var(--color-text-muted)]">
          <span className="w-2 h-2 rounded-full bg-[#00FF88]" />
          Live IN
        </div>
        <div className="flex items-center gap-1.5 text-[9px] font-mono text-[var(--color-text-muted)]">
          <span className="w-2 h-2 rounded-full bg-[#FF3366]" />
          Live OUT
        </div>
        <div className="flex items-center gap-1.5 text-[9px] font-mono text-[var(--color-text-muted)]">
          <span className="w-2 h-2 rounded-full bg-[#FFB000]" />
          USE
        </div>
        <div className="flex items-center gap-1.5 text-[9px] font-mono text-[var(--color-text-muted)]">
          <span className="w-2 h-2 rounded-full bg-[#8A2BE2]" />
          DEF
        </div>
      </div>

      {/* Block liveness table */}
      <div className="bg-[var(--color-card)] border border-[var(--color-border)] overflow-hidden">
        <div className="grid gap-px bg-[var(--color-border)]" style={{ gridTemplateColumns: '60px 1fr 1fr 1fr 1fr' }}>
          {/* Header */}
          <div className="bg-[var(--color-surface-2)] px-2 py-1.5 text-[9px] font-bold text-[var(--color-text-muted)] font-display uppercase">Block</div>
          <div className="bg-[var(--color-surface-2)] px-2 py-1.5 text-[9px] font-bold text-[#00FF88] font-display uppercase">IN</div>
          <div className="bg-[var(--color-surface-2)] px-2 py-1.5 text-[9px] font-bold text-[#FF3366] font-display uppercase">OUT</div>
          <div className="bg-[var(--color-surface-2)] px-2 py-1.5 text-[9px] font-bold text-[#FFB000] font-display uppercase">USE</div>
          <div className="bg-[var(--color-surface-2)] px-2 py-1.5 text-[9px] font-bold text-[#8A2BE2] font-display uppercase">DEF</div>

          {/* Rows */}
          {method.blocks.map(block => {
            const state = result.states.get(block.id);
            if (!state) return null;
            const isActive = activeBlock === block.id;
            return (
              <React.Fragment key={block.id}>
                <div className={`bg-[var(--color-card)] px-2 py-1.5 text-[10px] font-mono transition-colors duration-200 ${
                  isActive ? 'bg-[rgba(255,0,255,0.08)] text-[#FF00FF]' : 'text-[var(--color-text)]'
                } ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
                  B{block.id}
                </div>
                <div className={`bg-[var(--color-card)] px-2 py-1.5 text-[9px] font-mono text-[#00FF88] ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
                  {state.in.size > 0 ? `{${[...state.in].join(', ')}}` : '∅'}
                </div>
                <div className={`bg-[var(--color-card)] px-2 py-1.5 text-[9px] font-mono text-[#FF3366] ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
                  {state.out.size > 0 ? `{${[...state.out].join(', ')}}` : '∅'}
                </div>
                <div className={`bg-[var(--color-card)] px-2 py-1.5 text-[9px] font-mono text-[#FFB000] ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
                  {state.use.size > 0 ? `{${[...state.use].join(', ')}}` : '∅'}
                </div>
                <div className={`bg-[var(--color-card)] px-2 py-1.5 text-[9px] font-mono text-[#8A2BE2] ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
                  {state.def.size > 0 ? `{${[...state.def].join(', ')}}` : '∅'}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Iteration log (animation steps) */}
      {isPlaying && (
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] p-3 max-h-[150px] overflow-y-auto">
          <div className="text-[9px] text-[var(--color-text-muted)] font-bold font-display tracking-[0.1em] uppercase mb-2">
            Iteration Log
          </div>
          <div className="flex flex-col gap-0.5">
            {[...result.steps].reverse().map((step, ri) => {
              const idx = result.steps.length - 1 - ri;
              const visible = visibleSteps.has(idx);
              return (
                <div
                  key={idx}
                  className={`text-[9px] font-mono transition-all duration-200 ${
                    visible ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <span className="text-[var(--color-text-muted)]">iter {step.iteration}</span>
                  <span className="text-[var(--color-text-muted)] mx-1">·</span>
                  <span className="text-[#FF00FF]">B{step.blockId}</span>
                  <span className="text-[var(--color-text-muted)] mx-1">→</span>
                  <span className="text-[var(--color-text-dim)]">{step.description}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default DataFlowAnalysis;
