import React from 'react';

interface Props {
  table: Record<string, Record<string, string | null>>;
  rowOrder?: string[];
  colOrder?: string[];
  highlight?: { nt: string; terminal: string } | null;
}

const ROW_ORDER = ["Goal", "Expr", "Expr'", "Term", "Term'", "Factor"];
const COL_ORDER = ['+', '-', '*', '/', '(', ')', 'name', 'num', '$'];

const Ll1Table: React.FC<Props> = ({ table, rowOrder = ROW_ORDER, colOrder = COL_ORDER, highlight }) => {
  return (
    <div className="border border-[var(--color-border-bright)] rounded-lg overflow-hidden bg-[var(--color-card)] overflow-x-auto">
      <div className="px-3 py-2 bg-[var(--color-surface-2)] border-b border-[var(--color-border-bright)] flex items-center justify-between min-w-[520px]">
        <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-[var(--color-cyan)] font-display">
          LL(1) Parse Table — Example walkthrough
        </span>
        <span className="text-[9px] font-mono text-[var(--color-text-muted)]">— = error</span>
      </div>
      <div className="min-w-[520px]">
        {/* Header row */}
        <div className="grid gap-px bg-[var(--color-border)]" style={{ gridTemplateColumns: `90px repeat(${colOrder.length}, 1fr)` }}>
          <div className="bg-[var(--color-surface)] px-2 py-1.5 text-[9px] font-mono font-bold text-[var(--color-text-muted)]">NT \\ LA</div>
          {colOrder.map(col => (
            <div key={col} className="bg-[var(--color-surface)] px-1 py-1.5 text-center text-[10px] font-mono font-bold text-[var(--color-text-muted)]">
              {col}
            </div>
          ))}
        </div>
        {/* Rows */}
        <div className="grid gap-px bg-[var(--color-border)]" style={{ gridTemplateColumns: `90px repeat(${colOrder.length}, 1fr)` }}>
          {rowOrder.map(nt => (
            <React.Fragment key={nt}>
              <div className="bg-[var(--color-card)] px-2 py-1.5 text-[11px] font-mono font-bold text-[var(--color-cyan)] flex items-center">
                {nt}
              </div>
              {colOrder.map(col => {
                const cell = table[nt]?.[col] ?? null;
                const isHighlighted = highlight?.nt === nt && highlight?.terminal === col;
                const isError = cell == null;
                return (
                  <div
                    key={`${nt}-${col}`}
                    className={`px-1 py-1.5 text-center text-[11px] font-mono flex items-center justify-center min-h-[28px] ${
                      isHighlighted
                        ? 'bg-[var(--color-neon-dim)] border border-[var(--color-neon)] text-[var(--color-neon)] font-bold'
                        : isError
                          ? 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)] opacity-60'
                          : 'bg-[var(--color-card)] text-[var(--color-text)] border border-[var(--color-border-bright)]'
                    }`}
                  >
                    {isError ? '—' : cell}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Ll1Table;
