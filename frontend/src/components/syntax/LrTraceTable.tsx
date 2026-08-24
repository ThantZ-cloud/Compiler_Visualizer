import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { SrStep } from '../../lib/parser/shiftReduceTryIt';

interface Props {
  steps: SrStep[];
  isPlaying?: boolean;
  isCompleted?: boolean;
}

const NT_SET = new Set(['Goal', 'Expr', "Expr'", 'Term', "Term'", 'Factor']);
const STATE_SET_RE = /^[0-9]+$/;

const LrTraceTable: React.FC<Props> = ({ steps, isPlaying = false, isCompleted = true }) => {
  const [visibleCount, setVisibleCount] = useState(() => (isCompleted ? steps.length : 1));

  useEffect(() => {
    if (!isPlaying) {
      if (isCompleted) setVisibleCount(steps.length);
      return;
    }
    setVisibleCount(1);
    let idx = 1;
    const id = setInterval(() => {
      idx += 1;
      setVisibleCount(idx);
      if (idx >= steps.length) clearInterval(id);
    }, 550);
    return () => clearInterval(id);
  }, [isPlaying, isCompleted, steps.length]);

  const shown = isPlaying ? steps.slice(0, visibleCount) : isCompleted ? steps : steps.slice(0, 1);

  if (steps.length === 0)
    return (
      <div className="text-[10px] font-mono text-[var(--color-text-muted)] p-3 border border-dashed rounded">
        No parse steps
      </div>
    );

  return (
    <div className="border border-[var(--color-border-bright)] rounded-lg overflow-hidden bg-[var(--color-card)]">
      <div className="px-3 py-2 bg-[var(--color-surface-2)] border-b border-[var(--color-border-bright)] flex items-center justify-between">
        <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-[var(--color-neon)] font-display">
          Shift-Reduce Parse — {Math.max(0, steps.length - 1)} actions
        </span>
        <span className="text-[9px] font-mono text-[var(--color-text-muted)]">stack top = state · handle = rule</span>
      </div>
      <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
        <table className="w-full min-w-[560px] text-[10px] font-mono">
          <thead className="sticky top-0 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
            <tr className="text-[9px] tracking-wide uppercase text-[var(--color-text-muted)]">
              <th className="px-2 py-1.5 text-left font-bold w-[36px]">#</th>
              <th className="px-2 py-1.5 text-left font-bold w-[44px]">State</th>
              <th className="px-2 py-1.5 text-left font-bold w-[52px]">Word</th>
              <th className="px-2 py-1.5 text-left font-bold">Stack</th>
              <th className="px-2 py-1.5 text-left font-bold w-[90px]">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {shown.map((s, i) => {
              const isAccept = s.actionType === 'ACCEPT';
              const isError = s.actionType === 'ERROR';
              const isShift = s.actionType === 'SHIFT';
              const isReduce = s.actionType === 'REDUCE';
              return (
                <motion.tr
                  key={s.step}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: isPlaying ? 0 : i * 0.04 }}
                  className={`${isAccept ? 'bg-[var(--color-neon-dim)]/20' : isError ? 'bg-[var(--color-rose-dim)]/20' : ''}`}
                >
                  <td className="px-2 py-1.5 text-[var(--color-text-muted)]">{s.step}</td>
                  {/* State — top-of-stack state before acting */}
                  <td className={`px-2 py-1.5 font-bold ${isError || isAccept ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-amber)]'}`}>
                    {s.state}
                  </td>
                  {/* Word — lookahead category */}
                  <td className="px-2 py-1.5 text-[var(--color-neon)] whitespace-nowrap">{s.lookahead}</td>
                  {/* Stack — symbols + states interleaved, bottom at left, top at right */}
                  <td className="px-2 py-1.5 break-all leading-relaxed">
                    {isAccept ? (
                      <>
                        {s.stackDisplay.split(' ').filter(Boolean).map((sym, j, arr) => (
                          <span key={j} className={NT_SET.has(sym) ? 'text-[var(--color-cyan)]' : STATE_SET_RE.test(sym) ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-neon)]'}>
                            {sym}
                            {j < arr.length - 1 ? ' ' : ''}
                          </span>
                        ))}
                        <span className="text-[var(--color-neon)] font-bold ml-2">accept</span>
                      </>
                    ) : isError && s.stackDisplay === '' ? (
                      <span className="text-[var(--color-rose)] font-bold">error</span>
                    ) : (
                      s.stackDisplay.split(' ').filter(Boolean).map((sym, j, arr) => {
                        const isTop = j === arr.length - 1;
                        const isState = STATE_SET_RE.test(sym);
                        const isNTSym = NT_SET.has(sym);
                        return (
                          <span
                            key={j}
                            className={`inline-block px-0.5 rounded ${
                              isTop
                                ? 'bg-[var(--color-cyan-dim)] border border-[var(--color-cyan)]/40 font-bold text-[var(--color-cyan)]'
                                : isState
                                  ? 'text-[var(--color-text-muted)]'
                                  : isNTSym
                                    ? 'text-[var(--color-cyan)]'
                                    : 'text-[var(--color-neon)]'
                            }`}
                          >
                            {sym}
                            {j < arr.length - 1 ? ' ' : ''}
                          </span>
                        );
                      })
                    )}
                    {isError && s.stackDisplay !== '' && (
                      <span className="text-[var(--color-rose)] font-bold ml-2">error</span>
                    )}
                  </td>
                  {/* Action — shift n / reduce n / accept / — */}
                  <td className={`px-2 py-1.5 font-bold whitespace-nowrap ${isError ? 'text-[var(--color-rose)]' : isAccept ? 'text-[var(--color-neon)]' : isShift ? 'text-[var(--color-neon)]' : isReduce ? 'text-[var(--color-cyan)]' : 'text-[var(--color-text-muted)]'}`} title={s.handle ?? undefined}>
                    {s.actionDisplay}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {shown.some(s => s.handle) && (
        <div className="px-3 py-1.5 border-t border-[var(--color-border)] text-[9px] font-mono text-[var(--color-text-dim)] truncate">
          last handle:{' '}
          <span className="text-[var(--color-cyan)]">{[...shown].reverse().find(s => s.handle)?.handle}</span>
        </div>
      )}
    </div>
  );
};

export default LrTraceTable;
