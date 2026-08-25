import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Hash, Copy, Zap, Sigma } from 'lucide-react';
import type { LvnResult } from '../../lib/cfg/lvn';

interface LocalValueNumberingProps {
  result: LvnResult;
  isPlaying: boolean;
  isCompleted: boolean;
}

const LocalValueNumbering: React.FC<LocalValueNumberingProps> = ({ result, isPlaying, isCompleted }) => {
  const { t } = useTranslation();
  const [visibleRows, setVisibleRows] = useState<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isPlaying) {
      if (isCompleted) {
        const all = new Set<string>();
        for (const b of result.blocks) for (let i = 0; i < b.entries.length; i++) all.add(`${b.blockId}-${i}`);
        setVisibleRows(all);
      } else {
        setVisibleRows(new Set());
      }
      return;
    }
    setVisibleRows(new Set());
    const flat: string[] = [];
    for (const b of result.blocks) for (let i = 0; i < b.entries.length; i++) flat.push(`${b.blockId}-${i}`);
    let idx = 0;
    const show = () => {
      if (idx >= flat.length) return;
      setVisibleRows(prev => new Set([...prev, flat[idx]]));
      idx++;
      timerRef.current = setTimeout(show, 180);
    };
    timerRef.current = setTimeout(show, 200);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isPlaying, isCompleted, result]);

  // animation driven by visibleRows, not isVisible

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-2 px-1">
        <Hash size={14} className="text-[#00D4FF]" />
        <h4 className="text-[11px] font-bold text-[var(--color-text)] font-display tracking-[0.1em] uppercase m-0">
          {t('optimizer.step2.title', 'Value Numbering')}
        </h4>
        <span className="text-[9px] text-[var(--color-text-muted)] font-mono">
          ({result.totalRedundant} redundant, {result.totalFolded} folded)
        </span>
        <span className="ml-auto text-[8px] font-mono px-1.5 py-0.5 rounded border border-[rgba(0,212,255,0.3)] text-[#00D4FF] bg-[rgba(0,212,255,0.08)]">
          LVN — Thompson-style
        </span>
      </div>
      <p className="text-[10px] text-[var(--color-text-dim)] font-mono px-1 -mt-1">
        {t('optimizer.step2.description', 'Local Value Numbering assigns a number to each distinct value. When the same expression reappears with the same operand numbers, it is redundant and can be replaced by a copy.')}
      </p>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 px-1">
        <span className="flex items-center gap-1 text-[8px] font-mono text-[var(--color-text-muted)]">
          <span className="w-2 h-2 rounded-sm bg-[#00FF88] inline-block" /> new value
        </span>
        <span className="flex items-center gap-1 text-[8px] font-mono text-[var(--color-text-muted)]">
          <span className="w-2 h-2 rounded-sm bg-[#FF3366] inline-block" /> redundant
        </span>
        <span className="flex items-center gap-1 text-[8px] font-mono text-[var(--color-text-muted)]">
          <span className="w-2 h-2 rounded-sm bg-[#FFB000] inline-block" /> constant fold
        </span>
        <span className="flex items-center gap-1 text-[8px] font-mono text-[var(--color-text-muted)]">
          <span className="w-2 h-2 rounded-sm bg-[#8A2BE2] inline-block" /> identity
        </span>
      </div>

      {/* Per-block tables */}
      {result.blocks.map(block => (
        <div key={block.blockId} className="bg-[var(--color-card)] border border-[var(--color-border)] overflow-hidden">
          {/* Block header */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-surface-2)] border-b border-[var(--color-border)]">
            <span className="text-[10px] font-bold text-[var(--color-text)] font-mono">B{block.blockId}</span>
            {block.blockLabel && <span className="text-[9px] text-[var(--color-text-muted)] font-mono">({block.blockLabel})</span>}
            <span className="text-[8px] text-[var(--color-text-muted)] font-mono ml-auto">
              {block.entries.length} stmts
              {block.redundantCount > 0 && <span className="text-[#FF3366]"> · {block.redundantCount} redundant</span>}
              {block.constantFoldCount > 0 && <span className="text-[#FFB000]"> · {block.constantFoldCount} folded</span>}
            </span>
          </div>

          {block.entries.length === 0 ? (
            <div className="px-3 py-2 text-[9px] font-mono text-[var(--color-text-muted)] italic">empty block</div>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {block.entries.map(entry => {
                const key = `${block.blockId}-${entry.index}`;
                const visible = visibleRows.has(key);
                const rowBg = entry.isRedundant
                  ? 'bg-[rgba(255,51,102,0.06)]'
                  : entry.isConstantFold
                    ? 'bg-[rgba(255,176,0,0.06)]'
                    : entry.identityApplied
                      ? 'bg-[rgba(138,43,226,0.06)]'
                      : '';

                return (
                  <div
                    key={entry.index}
                    className={`flex items-center gap-2 px-3 py-1.5 text-[10px] font-mono transition-all duration-200 ${rowBg} ${visible ? 'opacity-100' : 'opacity-0'}`}
                  >
                    {/* line number */}
                    <span className="text-[var(--color-text-muted)] w-5 text-right shrink-0">{entry.index}:</span>

                    {/* statement text */}
                    <span className={`flex-1 truncate ${entry.isRedundant ? 'line-through text-[#FF3366]' : 'text-[var(--color-text)]'}`}>
                      {entry.text}
                    </span>

                    {/* value number badge */}
                    {entry.lhs && (
                      <span className={`shrink-0 px-1 py-0.5 rounded text-[8px] font-bold border ${entry.isRedundant ? 'bg-[rgba(255,51,102,0.12)] border-[rgba(255,51,102,0.3)] text-[#FF3366]' : 'bg-[rgba(0,255,136,0.08)] border-[rgba(0,255,136,0.25)] text-[#00FF88]'}`}>
                        {entry.lhs} → v{entry.valueNumber}
                      </span>
                    )}

                    {/* hash key */}
                    {entry.hashKey && !entry.isConstantFold && (
                      <span className="shrink-0 text-[8px] text-[var(--color-text-muted)] hidden sm:inline">
                        key: {entry.hashKey}
                      </span>
                    )}

                    {/* redundant annotation */}
                    {entry.isRedundant && entry.redundantWith !== null && (
                      <span className="shrink-0 flex items-center gap-1 text-[8px] text-[#FF3366]">
                        <Copy size={10} /> reuse v{entry.valueNumber} (line {entry.redundantWith})
                      </span>
                    )}

                    {/* constant fold annotation */}
                    {entry.isConstantFold && entry.foldedValue !== null && (
                      <span className="shrink-0 flex items-center gap-1 text-[8px] text-[#FFB000]">
                        <Zap size={10} /> → {entry.foldedValue}
                      </span>
                    )}

                    {/* identity annotation */}
                    {entry.identityApplied && !entry.isRedundant && (
                      <span className="shrink-0 flex items-center gap-1 text-[8px] text-[#8A2BE2]">
                        <Sigma size={10} /> {entry.identityApplied}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Optimized output for this block */}
          {(block.redundantCount > 0 || block.constantFoldCount > 0) && (
            <div className="px-3 py-2 bg-[rgba(0,255,136,0.04)] border-t border-[var(--color-border)]">
              <div className="text-[8px] font-bold text-[#00FF88] font-display tracking-[0.1em] uppercase mb-1">After LVN</div>
              <div className="flex flex-col gap-0.5">
                {block.entries.map(entry => {
                  const key = `${block.blockId}-${entry.index}`;
                  const visible = visibleRows.has(key);
                  if (!visible) return null;
                  let optimized: string;
                  if (entry.lhs === null) {
                    optimized = entry.text;
                  } else if (entry.isRedundant && entry.redundantWith !== null) {
                    const orig = block.entries[entry.redundantWith];
                    optimized = `${entry.lhs} = ${orig?.lhs ?? '?' }  // reuse v${entry.valueNumber}`;
                  } else if (entry.isConstantFold && entry.foldedValue !== null) {
                    optimized = `${entry.lhs} = ${entry.foldedValue}  // folded`;
                  } else {
                    optimized = entry.text;
                  }
                  return (
                    <div key={`opt-${entry.index}`} className={`text-[9px] font-mono ${entry.isRedundant || entry.isConstantFold ? 'text-[#00FF88]' : 'text-[var(--color-text-dim)]'}`}>
                      {optimized}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ))}

      {result.blocks.length === 0 && (
        <div className="text-[10px] font-mono text-[var(--color-text-muted)] p-3 border border-[var(--color-border)] rounded">No blocks to analyze</div>
      )}
    </div>
  );
};

export default LocalValueNumbering;
