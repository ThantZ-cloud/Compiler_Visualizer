import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { DerivationStep } from '../../lib/parser/cfgTryIt';

interface Props {
  derivation: DerivationStep[];
  isPlaying: boolean;
  isCompleted: boolean;
  grammarKind?: 'simple' | 'classic';
}

const CfgDerivationTable: React.FC<Props> = ({ derivation, isPlaying, isCompleted, grammarKind = 'simple' }) => {
  const [visibleCount, setVisibleCount] = useState(() =>
    isCompleted ? derivation.length : 0,
  );

  useEffect(() => {
    if (!isPlaying) {
      if (isCompleted) setVisibleCount(derivation.length);
      return;
    }
    setVisibleCount(0);
    let idx = 0;
    const id = setInterval(() => {
      idx += 1;
      setVisibleCount(idx + 1);
      if (idx + 1 >= derivation.length) clearInterval(id);
    }, 650);
    return () => clearInterval(id);
  }, [isPlaying, isCompleted, derivation.length]);

  // When not playing, show all if completed, else first step
  const shown = isPlaying ? derivation.slice(0, visibleCount) : isCompleted ? derivation : derivation.slice(0, 1);

  if (derivation.length === 0) return null;

  return (
    <div className="border border-[var(--color-border-bright)] rounded-lg overflow-hidden bg-[var(--color-card)]">
      <div className="px-3 py-2 bg-[var(--color-surface-2)] border-b border-[var(--color-border-bright)] flex items-center justify-between">
        <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-[var(--color-cyan)] font-display">
          Rightmost Derivation — {derivation.length - 1} steps {grammarKind === 'simple' ? 'Example A' : 'Example B'}
        </span>
        <span className="text-[9px] font-mono text-[var(--color-text-muted)]">rightmost NT first</span>
      </div>
      <div className="divide-y divide-[var(--color-border)] max-h-[280px] overflow-y-auto">
        {shown.map((s, i) => {
          const isLast = i === derivation.length - 1 && isCompleted;
          return (
            <motion.div
              key={`${s.step}-${s.ruleId}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: isPlaying ? 0 : i * 0.08 }}
              className={`px-3 py-2 flex items-start gap-3 ${s.step === 0 ? 'bg-[var(--color-card)]' : ''} ${isLast ? 'bg-[var(--color-neon-dim)]/20' : ''}`}
            >
              <span className="text-[10px] font-mono font-bold text-[var(--color-text-muted)] mt-0.5 min-w-[20px]">
                {s.step}.
              </span>
              <span className="text-[10px] font-mono text-[var(--color-cyan)] min-w-[110px] shrink-0">
                {s.ruleLabel}
              </span>
              <span className="text-[11px] font-mono text-[var(--color-text)] break-all leading-relaxed">
                {s.sententialForm.map((sym, j) => {
                  const highlight = s.step > 0 && j >= s.replacedIndex && j < s.replacedIndex + s.rhsLength;
                  const isNT = grammarKind === 'simple'
                    ? ['Expr', 'Op'].includes(sym)
                    : ['Goal', 'Expr', 'Term', 'Factor'].includes(sym);
                  return (
                    <span
                      key={j}
                      className={`inline-block px-0.5 rounded ${highlight ? 'bg-[var(--color-cyan-dim)] text-[var(--color-cyan)] border border-[var(--color-cyan)]/40' : ''} ${isNT && !highlight ? 'text-[var(--color-cyan)]' : ''} ${!isNT && !highlight ? 'text-[var(--color-neon)]' : ''} ${highlight ? 'font-bold' : ''}`}
                    >
                      {sym}
                      {j < s.sententialForm.length - 1 ? ' ' : ''}
                    </span>
                  );
                })}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default CfgDerivationTable;
