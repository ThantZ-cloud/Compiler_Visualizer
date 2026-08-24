import React from 'react';

interface Props {
  first: Record<string, string[]>;
  follow: Record<string, string[]>;
  order?: string[]; // NT order
}

const NT_ORDER = ["Goal", "Expr", "Expr'", "Term", "Term'", "Factor"];

const FirstFollowDisplay: React.FC<Props> = ({ first, follow, order = NT_ORDER }) => {
  return (
    <div className="border border-[var(--color-border-bright)] rounded-lg overflow-hidden bg-[var(--color-card)]">
      <div className="px-3 py-2 bg-[var(--color-surface-2)] border-b border-[var(--color-border-bright)] flex items-center justify-between">
        <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-[var(--color-amber)] font-display">
          FIRST &amp; FOLLOW
        </span>
        <span className="text-[9px] font-mono text-[var(--color-text-muted)]">How it works</span>
      </div>
      <div className="divide-y divide-[var(--color-border)]">
        {/* Header */}
        <div className="grid grid-cols-[90px_1fr_1fr] gap-2 px-3 py-2 bg-[var(--color-surface)] text-[9px] font-mono font-bold tracking-wide uppercase text-[var(--color-text-muted)]">
          <span>NT</span>
          <span>FIRST</span>
          <span>FOLLOW</span>
        </div>
        {order.map(nt => (
          <div key={nt} className="grid grid-cols-[90px_1fr_1fr] gap-2 px-3 py-2 items-start">
            <span className="text-[11px] font-mono font-bold text-[var(--color-cyan)]">{nt}</span>
            <span className="flex flex-wrap gap-1">
              {(first[nt] ?? []).map(sym => (
                <span key={sym} className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${sym === 'ε' ? 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border-[var(--color-border)]' : 'bg-[var(--color-neon-dim)] text-[var(--color-neon)] border-[var(--color-neon)]/30'}`}>
                  {sym}
                </span>
              ))}
            </span>
            <span className="flex flex-wrap gap-1">
              {(follow[nt] ?? []).map(sym => (
                <span key={sym} className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${sym === '$' ? 'bg-[var(--color-amber-dim)] text-[var(--color-amber)] border-[var(--color-amber)]/30' : sym === ')' ? 'bg-[var(--color-amber-dim)]/60 text-[var(--color-amber)] border-[var(--color-amber)]/30' : 'bg-[var(--color-magenta-dim)] text-[var(--color-magenta)] border-[var(--color-magenta)]/30'}`}>
                  {sym}
                </span>
              ))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FirstFollowDisplay;
