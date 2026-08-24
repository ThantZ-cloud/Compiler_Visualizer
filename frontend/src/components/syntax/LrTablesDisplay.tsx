import React from 'react';
import { ACTION_TABLE, GOTO_TABLE, TERMINALS, GOTO_NTS } from '../../lib/parser/shiftReduceTryIt';

interface Props {
  /** Current parser state (top of stack) to highlight its table rows */
  activeState?: number | null;
  /** Current lookahead terminal to highlight the Action column */
  activeLookahead?: string | null;
}

const cellText = (a: { kind: string; to?: number; ruleLabel?: string }): string => {
  if (a.kind === 'shift') return `s${a.to}`;
  if (a.kind === 'reduce') return `r${a.ruleLabel}`;
  if (a.kind === 'accept') return 'acc';
  return '—';
};

const LrTablesDisplay: React.FC<Props> = ({ activeState = null, activeLookahead = null }) => {
  const stateIds = Object.keys(ACTION_TABLE)
    .map(Number)
    .sort((x, y) => x - y);

  const th = 'px-1.5 py-1 text-[9px] font-bold uppercase tracking-wide text-[var(--color-text-muted)] border-b border-[var(--color-border)]';
  const td = 'px-1.5 py-1 text-[9px] font-mono border-b border-[var(--color-border)]';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {/* Action table */}
      <div className="border border-[var(--color-border-bright)] rounded-lg overflow-hidden bg-[var(--color-card)]">
        <div className="px-3 py-2 bg-[var(--color-surface-2)] border-b border-[var(--color-border-bright)] flex items-center justify-between">
          <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-[var(--color-neon)] font-display">
            Action Table
          </span>
          <span className="text-[8px] font-mono text-[var(--color-text-muted)]">s=shift · r=reduce · acc</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--color-surface)] sticky top-0">
              <tr>
                <th className={`${th} text-left w-[44px]`}>State</th>
                {TERMINALS.map(t => (
                  <th
                    key={t}
                    className={`${th} text-center ${activeLookahead === t ? 'text-[var(--color-amber)]' : ''}`}
                  >
                    {t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stateIds.map(sid => (
                <tr key={sid} className={activeState === sid ? 'bg-[var(--color-neon-dim)]/20' : ''}>
                  <td className={`${td} font-bold ${activeState === sid ? 'text-[var(--color-amber)]' : 'text-[var(--color-text-dim)]'}`}>
                    {sid}
                  </td>
                  {TERMINALS.map(t => {
                    const a = ACTION_TABLE[sid][t];
                    const isActive = activeState === sid && activeLookahead === t;
                    const color =
                      a.kind === 'error'
                        ? 'text-[var(--color-text-muted)] opacity-40'
                        : a.kind === 'accept'
                          ? 'text-[var(--color-neon)] font-bold'
                          : a.kind === 'shift'
                            ? 'text-[var(--color-neon)]'
                            : 'text-[var(--color-cyan)]';
                    return (
                      <td key={t} className={`${td} text-center ${color} ${isActive ? 'bg-[var(--color-amber)]/20 ring-1 ring-inset ring-[var(--color-amber)]' : ''}`}>
                        {cellText(a)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Goto table */}
      <div className="border border-[var(--color-border-bright)] rounded-lg overflow-hidden bg-[var(--color-card)] self-start">
        <div className="px-3 py-2 bg-[var(--color-surface-2)] border-b border-[var(--color-border-bright)] flex items-center justify-between">
          <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-[var(--color-cyan)] font-display">
            Goto Table
          </span>
          <span className="text-[8px] font-mono text-[var(--color-text-muted)]">after reduce by A → β</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--color-surface)] sticky top-0">
              <tr>
                <th className={`${th} text-left w-[44px]`}>State</th>
                {GOTO_NTS.map(nt => (
                  <th key={nt} className={`${th} text-center`}>
                    {nt}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stateIds.map(sid => (
                <tr key={sid} className={activeState === sid ? 'bg-[var(--color-neon-dim)]/20' : ''}>
                  <td className={`${td} font-bold ${activeState === sid ? 'text-[var(--color-amber)]' : 'text-[var(--color-text-dim)]'}`}>
                    {sid}
                  </td>
                  {GOTO_NTS.map(nt => {
                    const g = GOTO_TABLE[sid]?.[nt];
                    return (
                      <td key={nt} className={`${td} text-center ${g != null ? 'text-[var(--color-cyan)]' : 'text-[var(--color-text-muted)] opacity-40'}`}>
                        {g != null ? g : '—'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LrTablesDisplay;
