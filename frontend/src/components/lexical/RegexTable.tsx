import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import type { TokenGroupDef } from '../../lib/lexer/tokenGroups';

interface RegexTableProps {
  groups: TokenGroupDef[];
  /** Whether the animation is currently playing */
  isPlaying: boolean;
  /** Whether this step has been completed */
  isCompleted: boolean;
}

const RegexTable: React.FC<RegexTableProps> = ({ groups, isPlaying, isCompleted }) => {
  const { t } = useTranslation();

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Description */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-[var(--color-neon)] font-display tracking-[0.1em] uppercase mb-2">
          {t('lexical.step1.title')}
        </h2>
        <p className="text-xs text-[var(--color-text-dim)] font-mono leading-relaxed">
          {t('lexical.step1.description')}
        </p>
      </div>

      {/* Table */}
      <div className="border border-[var(--color-border-bright)] rounded-lg overflow-hidden bg-[var(--color-card)] overflow-x-auto">
        <div className="min-w-[320px]">
        {/* Header */}
        <div className="grid grid-cols-[110px_1fr_60px] sm:grid-cols-[140px_1fr_70px] lg:grid-cols-[180px_1fr_80px] gap-2 px-3 sm:px-4 py-3 bg-[var(--color-surface-2)] border-b border-[var(--color-border-bright)]">
          <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-[var(--color-text-muted)] font-display">
            {t('lexical.step1.columnType')}
          </span>
          <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-[var(--color-text-muted)] font-display">
            {t('lexical.step1.columnRegex')}
          </span>
          <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-[var(--color-text-muted)] font-display text-right">
            {t('lexical.step1.columnCount')}
          </span>
        </div>

        {/* Rows */}
        {groups.map((group, i) => (
          <motion.div
            key={group.name}
            initial={{ opacity: 0, x: -20 }}
            animate={
              isPlaying || isCompleted
                ? { opacity: 1, x: 0 }
                : { opacity: 0, x: -20 }
            }
            transition={{ delay: i * 0.15, duration: 0.4, ease: 'easeOut' }}
            className={`grid grid-cols-[110px_1fr_60px] sm:grid-cols-[140px_1fr_70px] lg:grid-cols-[180px_1fr_80px] gap-2 px-3 sm:px-4 py-3 border-b border-[var(--color-border)] items-center ${
              group.found
                ? 'bg-[var(--color-card)]'
                : 'bg-[var(--color-card)] opacity-50'
            }`}
          >
            {/* Type badge */}
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: group.color }}
              />
              <span className="text-xs font-bold font-mono" style={{ color: group.color }}>
                {group.name}
              </span>
              {group.found && (
                <span className="text-[8px] font-bold uppercase text-[var(--color-neon)] tracking-wider">
                  ●
                </span>
              )}
            </div>

            {/* Regex pattern */}
            <code className="text-xs font-mono text-[var(--color-text)] break-all">
              {group.regexPattern}
            </code>

            {/* Count */}
            <span
              className={`text-xs font-mono text-right ${
                group.found
                  ? 'text-[var(--color-neon)]'
                  : 'text-[var(--color-text-muted)]'
              }`}
            >
              {group.count}
            </span>
          </motion.div>
        ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-[10px] font-mono text-[var(--color-text-muted)]">
        <span className="flex items-center gap-1">
          <span className="text-[var(--color-neon)]">●</span>
          {t('lexical.step1.foundInCode')}
        </span>
        <span className="flex items-center gap-1 opacity-50">
          <span>○</span>
          {t('lexical.step1.notFoundInCode')}
        </span>
      </div>
    </div>
  );
};

export default RegexTable;
