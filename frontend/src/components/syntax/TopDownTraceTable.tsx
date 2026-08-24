import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { TopDownStep } from '../../lib/parser/pdaTryIt';

interface Props {
  steps: TopDownStep[];
  isPlaying?: boolean;
  isCompleted?: boolean;
}

const NT_SET = new Set(['Goal', 'Expr', "Expr'", 'Term', "Term'", 'Factor']);

const TopDownTraceTable: React.FC<Props> = ({ steps, isPlaying = false, isCompleted = true }) => {
  const [visibleCount, setVisibleCount] = useState(() => (isCompleted ? steps.length : 0));

  useEffect(() => {
    if (!isPlaying) {
      if (isCompleted) setVisibleCount(steps.length);
      return;
    }
    setVisibleCount(0);
    let idx = 0;
    const id = setInterval(() => {
      idx += 1;
      setVisibleCount(idx + 1);
      if (idx + 1 >= steps.length) clearInterval(id);
    }, 650);
    return () => clearInterval(id);
  }, [isPlaying, isCompleted, steps.length]);

  // When not playing, show all if completed else first step
  const shown = isPlaying ? steps.slice(0, visibleCount) : isCompleted ? steps : steps.slice(0, 1);

  if (steps.length === 0) return <div className="text-[10px] font-mono text-[var(--color-text-muted)] p-3 border border-dashed rounded">No parse steps</div>;

  return (
    <div className="border border-[var(--color-border-bright)] rounded-lg overflow-hidden bg-[var(--color-card)]">
      <div className="px-3 py-2 bg-[var(--color-surface-2)] border-b border-[var(--color-border-bright)] flex items-center justify-between">
        <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-[var(--color-neon)] font-display">
          Leftmost Top-Down Parse — {steps.length - 1} steps
        </span>
        <span className="text-[9px] font-mono text-[var(--color-text-muted)]">number = predict · ! = match</span>
      </div>
      <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
        <table className="w-full min-w-[480px] text-[10px] font-mono">
          <thead className="sticky top-0 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
            <tr className="text-[9px] tracking-wide uppercase text-[var(--color-text-muted)]">
              <th className="px-2 py-1.5 text-left font-bold w-[52px]">Rule</th>
              <th className="px-2 py-1.5 text-left font-bold">Stack</th>
              <th className="px-2 py-1.5 text-left font-bold">Input</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {shown.map((s, i) => {
              const isAccept = s.action === 'ACCEPT';
              const isError = s.action === 'ERROR';
              const stackSymbols = s.stackDisplay.length > 0 ? s.stackDisplay.split(' ') : [];
              const topIdx = stackSymbols.length - 1;
              return (
                <motion.tr
                  key={s.step}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: isPlaying ? 0 : i * 0.05 }}
                  className={`${isAccept ? 'bg-[var(--color-neon-dim)]/20' : isError ? 'bg-[var(--color-rose-dim)]/20' : ''}`}
                >
                  {/* Rule — number = predict, ! = match */}
                  <td className={`px-2 py-1.5 font-bold ${isError ? 'text-[var(--color-rose)]' : s.ruleDisplay === '!' ? 'text-[var(--color-neon)]' : s.ruleDisplay === '—' ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-cyan)]'}`}>
                    {s.ruleDisplay}
                  </td>
                  {/* Stack — bottom at left, top at right, no $ */}
                  <td className="px-2 py-1.5 break-all leading-relaxed">
                    {isAccept ? (
                      <span className="text-[var(--color-neon)] font-bold">accept</span>
                    ) : (
                      stackSymbols.map((sym, j) => {
                        const isTop = j === topIdx;
                        const isNT = NT_SET.has(sym);
                        return (
                          <span
                            key={j}
                            className={`inline-block px-0.5 rounded ${
                              isTop
                                ? 'bg-[var(--color-cyan-dim)] border border-[var(--color-cyan)]/40 font-bold text-[var(--color-cyan)]'
                                : isNT
                                  ? 'text-[var(--color-cyan)]'
                                  : 'text-[var(--color-neon)]'
                            }`}
                          >
                            {sym}
                            {j < topIdx ? ' ' : ''}
                          </span>
                        );
                      })
                    )}
                  </td>
                  {/* Input — categories with cursor at inputPos */}
                  <td className="px-2 py-1.5 break-all leading-relaxed whitespace-nowrap">
                    {s.inputCategories.map((cat, j) => (
                      <React.Fragment key={j}>
                        {j === s.inputPos && (
                          <span className="text-[var(--color-amber)] font-bold mx-px" title="parser position">↑</span>
                        )}
                        <span
                          className={`inline-block px-0.5 rounded ${
                            j < s.inputPos
                              ? 'text-[var(--color-text-muted)] opacity-50'
                              : NT_SET.has(cat)
                                ? 'text-[var(--color-cyan)]'
                                : cat === 'name' || cat === 'num'
                                  ? 'text-[var(--color-neon)]'
                                  : 'text-[var(--color-amber)]'
                          }`}
                        >
                          {cat}
                        </span>
                        {j < s.inputCategories.length - 1 ? ' ' : ''}
                      </React.Fragment>
                    ))}
                    {s.inputPos >= s.inputCategories.length && (
                      <span className="text-[var(--color-amber)] font-bold ml-0.5" title="parser position">↑</span>
                    )}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TopDownTraceTable;
