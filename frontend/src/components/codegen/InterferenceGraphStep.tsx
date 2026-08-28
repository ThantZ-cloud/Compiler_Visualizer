import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Cpu } from 'lucide-react';
import type { RegAllocationResult } from '../../lib/cfg/regalloc';
import InterferenceGraph from './InterferenceGraph';
import { REG_COLORS } from '../../lib/cfg/regColors';

interface Props {
  allocation: RegAllocationResult;
  isPlaying: boolean;
  isCompleted: boolean;
}

const InterferenceGraphStep: React.FC<Props> = ({ allocation, isPlaying, isCompleted }) => {
  const { t } = useTranslation();
  const [highlightVar, setHighlightVar] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isPlaying) {
      if (isCompleted) {
        setHighlightVar(allocation.variables[allocation.variables.length - 1] || null);
      } else {
        setHighlightVar(null);
      }
      return;
    }
    setHighlightVar(null);
    let i = 0;
    const show = () => {
      if (i >= allocation.variables.length) return;
      setHighlightVar(allocation.variables[i]);
      i++;
      timerRef.current = setTimeout(show, 400);
    };
    timerRef.current = setTimeout(show, 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isPlaying, isCompleted, allocation]);

  return (
    <div className="flex flex-col gap-3 bg-[var(--color-card)] border border-[var(--color-border)] p-4">
      <div className="flex items-center gap-2">
        <Cpu size={14} className="text-[#8A2BE2] shrink-0" />
        <h3 className="text-sm font-bold text-[var(--color-text)] font-display tracking-[0.1em] uppercase">
          {t('codegen.step3.title')}
        </h3>
        <span className="text-[8px] font-bold font-mono px-1.5 py-0.5 tracking-wider border border-[rgba(138,43,226,0.3)] text-[#8A2BE2] bg-[rgba(138,43,226,0.06)]">
          {t('codegen.step3.algorithm')}
        </span>
        <span className="text-[9px] text-[var(--color-text-muted)] font-mono">
          ({allocation.variables.length} vars, {allocation.interferenceGraph.length} edges)
        </span>
      </div>
      <p className="text-xs text-[var(--color-text-muted)] font-mono">
        {t('codegen.step3.description')}
      </p>

      <div className="flex gap-4 px-1">
        <div className="text-[9px] font-mono text-[var(--color-text-muted)]">
          <span className="text-[#8A2BE2] font-bold">{allocation.variables.length}</span> variables
        </div>
        <div className="text-[9px] font-mono text-[var(--color-text-muted)]">
          <span className="text-[#00FF88] font-bold">{allocation.interferenceGraph.length}</span> interference edges
        </div>
        <div className="text-[9px] font-mono text-[var(--color-text-muted)]">
          <span className="text-[#FF3366] font-bold">{allocation.spills.length}</span> spills
        </div>
      </div>

      {allocation.variables.length > 0 ? (
        <div className="bg-[var(--color-void)] border border-[var(--color-border)] overflow-hidden">
          <div className="flex items-center justify-between px-3 pt-2.5 pb-1 gap-2 flex-wrap">
            <div className="text-[9px] text-[#8A2BE2] font-bold font-display tracking-[0.1em] uppercase">
              Interference Graph
            </div>
            <div className="flex items-center gap-2">
              {allocation.variables.map(v => {
                const reg = allocation.assignments.get(v);
                const color = reg === undefined ? '#FF3366' : REG_COLORS[reg % REG_COLORS.length];
                return (
                  <span key={v} className="flex items-center gap-1 text-[8px] font-mono text-[var(--color-text-muted)]">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ background: color }} />
                    {v}
                  </span>
                );
              })}
            </div>
          </div>
          <InterferenceGraph allocation={allocation} highlightVar={highlightVar} />
          {allocation.interferenceGraph.length === 0 && (
            <div className="text-[9px] font-mono text-[var(--color-text-muted)] text-center pb-2">No interferences — all variables can share registers</div>
          )}
        </div>
      ) : (
        <div className="border border-[var(--color-border)] bg-[var(--color-void)] h-[120px] flex items-center justify-center">
          <span className="text-[10px] font-mono text-[var(--color-text-muted)]">No variables to allocate</span>
        </div>
      )}

      {allocation.variables.length > 0 && (
        <div className="bg-[var(--color-void)] border border-[var(--color-border)] p-3">
          <div className="text-[9px] text-[var(--color-text-muted)] font-bold font-display tracking-[0.1em] uppercase mb-2">
            Live Variables
          </div>
          <div className="flex flex-wrap gap-1.5">
            {allocation.variables.map(v => {
              const reg = allocation.assignments.get(v);
              const spilled = allocation.spills.includes(v);
              const color = spilled ? '#FF3366' : (reg !== undefined ? REG_COLORS[reg % REG_COLORS.length] : '#6A7B9B');
              return (
                <span
                  key={v}
                  className={`text-[10px] font-mono px-2 py-1 border ${highlightVar === v ? 'ring-1 ring-[var(--color-neon)]' : ''}`}
                  style={{ color, borderColor: `${color}40`, backgroundColor: `${color}0D` }}
                >
                  {v}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default InterferenceGraphStep;
