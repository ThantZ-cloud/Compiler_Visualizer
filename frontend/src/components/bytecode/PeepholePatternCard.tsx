import React from 'react';
import { useTranslation } from 'react-i18next';
import { Scissors } from 'lucide-react';
import type { PeepholePattern } from '../../lib/cfg/bytecodeParser';

interface PeepholePatternCardProps {
  patterns: PeepholePattern[];
}

const TYPE_COLORS: Record<string, string> = {
  'Unnecessary Goto': '#FF3366',
  'Redundant Load': '#00D4FF',
  'Store-Load': '#00FF88',
  'Duplicate Constant': '#8A2BE2',
};

const PeepholePatternCard: React.FC<PeepholePatternCardProps> = ({ patterns }) => {
  const { t } = useTranslation();

  if (patterns.length === 0) return null;

  return (
    <div className="bg-[var(--color-card)] border border-[var(--color-border)] p-3">
      <div className="flex items-center gap-2 mb-2">
        <Scissors size={12} className="text-[#FFB000]" />
        <span className="text-[9px] font-bold text-[#FFB000] font-display tracking-[0.1em] uppercase">
          {t('bytecode.peephole.title', 'Peephole Optimization')}
        </span>
        <span className="text-[8px] text-[var(--color-text-muted)] font-mono">
          ({patterns.length} {t('bytecode.peephole.patternsFound', 'patterns found')})
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        {patterns.map((p) => (
          <div key={p.id} className="flex items-start gap-2 px-2 py-1 bg-[var(--color-surface-2)] border-l-2"
            style={{ borderLeftColor: TYPE_COLORS[p.type] || '#FFB000' }}>
            <span className="text-[8px] font-bold font-mono whitespace-nowrap" style={{ color: TYPE_COLORS[p.type] || '#FFB000' }}>
              {p.type}
            </span>
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[8px] font-mono text-[var(--color-text-dim)] leading-relaxed">
                @{p.startOffset}-{p.endOffset}: {p.description}
              </span>
              <span className="text-[8px] font-mono text-[var(--color-text-muted)]">
                {p.replacement} · saves {p.savings} byte{savingsLabel(p.savings)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  function savingsLabel(n: number) {
    return n === 1 ? '' : 's';
  }
};

export default PeepholePatternCard;