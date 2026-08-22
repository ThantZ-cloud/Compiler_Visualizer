import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import type { GrammarRule } from '../../lib/parser/types';
import type { Token } from '../../types';

interface GrammarRulesTableProps {
  /** Grammar rules exercised by the input program */
  rules: GrammarRule[];
  /** Token stream straight from the lexical analysis phase */
  tokens: Token[];
  /** Rule ids used so far during the parse */
  activeRuleIds: Set<string>;
  /** Rule id of the most recent reduction */
  currentRuleId?: string;
  isPlaying: boolean;
  isCompleted: boolean;
}

const TOKEN_COLORS: Record<string, string> = {
  KEYWORD: 'var(--color-magenta)',
  TYPE: 'var(--color-cyan)',
  IDENTIFIER: 'var(--color-neon)',
  STRING_LITERAL: 'var(--color-amber)',
  CHAR_LITERAL: 'var(--color-amber)',
  INTEGER_LITERAL: 'var(--color-amber)',
  LONG_LITERAL: 'var(--color-amber)',
  FLOAT_LITERAL: 'var(--color-amber)',
  DOUBLE_LITERAL: 'var(--color-amber)',
  BOOLEAN_LITERAL: 'var(--color-amber)',
  NULL_LITERAL: 'var(--color-amber)',
  SEPARATOR: 'var(--color-text-dim)',
  OPERATOR: 'var(--color-text-dim)',
};

function tokenColor(type: string): string {
  return TOKEN_COLORS[type.toUpperCase()] ?? 'var(--color-text-dim)';
}

const MAX_TOKENS = 48;

const GrammarRulesTable: React.FC<GrammarRulesTableProps> = ({
  rules,
  tokens,
  activeRuleIds,
  currentRuleId,
  isPlaying,
  isCompleted,
}) => {
  const { t } = useTranslation();
  const visible = tokens.slice(0, MAX_TOKENS);
  const hidden = tokens.length - visible.length;

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Description */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-[var(--color-neon)] font-display tracking-[0.1em] uppercase mb-2">
          {t('syntax.step1.title')}
        </h2>
        <p className="text-xs text-[var(--color-text-dim)] font-mono leading-relaxed">
          {t('syntax.step1.description')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-4">
        {/* Token stream from lexical analysis */}
        <div className="border border-[var(--color-border-bright)] rounded-lg bg-[var(--color-card)] p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-[var(--color-text-muted)] font-display">
              {t('syntax.step1.inputTokens')}
            </span>
            <span className="text-[9px] font-mono text-[var(--color-neon)]">
              {tokens.length} {t('syntax.step1.fromLexical')}
            </span>
          </div>

          <motion.div
            className="flex flex-wrap gap-1.5"
            initial="hidden"
            animate={isPlaying || isCompleted ? 'show' : 'hidden'}
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.02 } } }}
          >
            {visible.map((token, i) => (
              <motion.span
                key={i}
                variants={{
                  hidden: { opacity: 0, scale: 0.8 },
                  show: { opacity: 1, scale: 1 },
                }}
                className="px-1.5 py-0.5 text-[10px] font-mono rounded border"
                style={{
                  color: tokenColor(token.type),
                  borderColor: tokenColor(token.type),
                  backgroundColor: 'var(--color-card)',
                }}
                title={`${token.type} — line ${token.line}:${token.column}`}
              >
                {token.value}
              </motion.span>
            ))}
            {hidden > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-mono text-[var(--color-text-muted)] rounded border border-[var(--color-border)]">
                +{hidden} more…
              </span>
            )}
            {tokens.length === 0 && (
              <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
                {t('tokens.noTokens')}
              </span>
            )}
          </motion.div>
        </div>

        {/* CFG rules */}
        <div className="border border-[var(--color-border-bright)] rounded-lg bg-[var(--color-card)] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-bright)] bg-[var(--color-surface-2)]">
            <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-[var(--color-text-muted)] font-display">
              {t('syntax.step1.grammarRules')}
            </span>
            <span className="text-[9px] font-mono text-[var(--color-amber)]">
              {rules.length}/{t('syntax.step1.rewrites')}
            </span>
          </div>

          <div className="max-h-[320px] overflow-y-auto divide-y divide-[var(--color-border)]">
            {rules.map((rule, i) => {
              const used = activeRuleIds.has(rule.id);
              const current = currentRuleId === rule.id;
              const isVisible = isPlaying || isCompleted;
              return (
                <motion.div
                  key={rule.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={isVisible ? { opacity: used ? 1 : 0.35, x: 0 } : { opacity: 0, x: -20 }}
                  transition={{ delay: i * 0.08, duration: 0.35, ease: 'easeOut' }}
                  className={`px-4 py-2.5 ${
                    current
                      ? 'bg-[rgba(0,255,136,0.06)] border-l-2 border-l-[var(--color-neon)]'
                      : used
                      ? 'bg-[var(--color-card)]'
                      : 'opacity-40'
                  }`}
                >
                  <div className="flex items-baseline gap-2">
                    <span className={`text-[9px] font-mono font-bold ${used ? 'text-[var(--color-neon)]' : 'text-[var(--color-text-muted)]'}`}>
                      {rule.id}
                    </span>
                    <code className="text-[11px] font-mono text-[var(--color-text)] break-all">
                      <span className="text-[var(--color-cyan)]">{rule.lhs}</span>
                      <span className="text-[var(--color-text-muted)]"> → </span>
                      {rule.rhs.join(' ')}
                    </code>
                  </div>
                  {rule.description && (
                    <div className="mt-0.5 text-[9px] font-mono text-[var(--color-text-dim)] pl-6">
                      {rule.description}
                    </div>
                  )}
                </motion.div>
              );
            })}
            {rules.length === 0 && (
              <div className="px-4 py-6 text-center text-[10px] font-mono text-[var(--color-text-muted)]">
                {t('syntax.step1.noRules')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GrammarRulesTable;