import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import type { GrammarRule } from '../../lib/parser/types';
import type { Token } from '../../types';
import { buildCfgTryItData, CFG_TRYIT_PRESETS_SIMPLE, CFG_TRYIT_PRESETS_CLASSIC, SIMPLE_GRAMMAR, CLASSIC_GRAMMAR } from '../../lib/parser/cfgTryIt';
import CfgDerivationTable from './CfgDerivationTable';
import CfgParseTree from './CfgParseTree';

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

  const [active, setActive] = useState<'TABLE' | 'TRYIT'>('TABLE');
  const [customInput, setCustomInput] = useState('( a + b ) * c');
  const [grammarKind, setGrammarKind] = useState<'simple' | 'classic'>('simple');

  const presets = grammarKind === 'simple' ? CFG_TRYIT_PRESETS_SIMPLE : CFG_TRYIT_PRESETS_CLASSIC;
  const customResult = useMemo(() => buildCfgTryItData(customInput, grammarKind), [customInput, grammarKind]);

  const tabBtn = (label: string, key: 'TABLE' | 'TRYIT') => {
    const isActive = active === key;
    return (
      <button
        key={key}
        onClick={() => setActive(key)}
        className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold tracking-wide border transition-colors ${isActive ? 'bg-[var(--color-neon-dim)] text-[var(--color-neon)] border-[var(--color-neon)]' : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border-bright)] hover:text-[var(--color-text)]'}`}
      >
        {label}
      </button>
    );
  };

  const subtitle =
    active === 'TRYIT'
      ? t('syntax.step1.tryItHint', { defaultValue: 'Try It — type your own expression and watch the rightmost derivation grow, then see its parse tree. Example: a + b × c' })
      : t('syntax.step1.description');

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Description */}
      <div className="mb-4">
        <h2 className="text-lg font-bold text-[var(--color-neon)] font-display tracking-[0.1em] uppercase mb-1">
          {t('syntax.step1.title')}
        </h2>
        <p className="text-xs text-[var(--color-text-dim)] font-mono leading-relaxed">{subtitle}</p>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {[
          { key: 'TABLE' as const, labelKey: 'syntax.step1.tableView', fallback: 'Your Program' },
          { key: 'TRYIT' as const, labelKey: 'syntax.step1.tryItView', fallback: 'Try It' },
        ].map(v => tabBtn(t(v.labelKey, { defaultValue: v.fallback }), v.key))}
      </div>

      {active === 'TABLE' ? (
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
      ) : (
        <div className="flex flex-col gap-3">
          {/* Editable expression — textbook examples a + b * c */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-wide text-[var(--color-text-muted)] font-mono whitespace-nowrap">
                {t('syntax.step1.tryOwnExpr', { defaultValue: 'Try your own expression:' })}
              </span>
              <input
                value={customInput}
                onChange={e => setCustomInput(e.target.value)}
                placeholder="a + b * c  or  (a + b) * c"
                className="flex-1 min-w-0 px-2 py-1.5 rounded border border-[var(--color-border-bright)] bg-[var(--color-card)] text-xs font-mono text-[var(--color-text)] focus:outline-none focus:border-[var(--color-neon)]"
                maxLength={48}
              />
              <span className="text-[10px] font-mono text-[var(--color-text-muted)] whitespace-nowrap">
                {customResult.derivation.length > 0 ? `${customResult.derivation.length - 1} steps` : ''}
              </span>
            </div>

            {customResult.error && (
              <div className="text-[10px] font-mono text-[var(--color-error)] bg-[var(--color-error-dim)]/20 border border-[var(--color-error-dim)] rounded px-2 py-1">
                {customResult.error}
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-mono text-[var(--color-text-muted)]">Grammar:</span>
              {(['simple','classic'] as const).map(k => (
                <button key={k} onClick={() => setGrammarKind(k)} className={`px-2 py-0.5 rounded text-[10px] font-mono border ${grammarKind===k ? 'bg-[var(--color-neon-dim)] text-[var(--color-neon)] border-[var(--color-neon)]' : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border-bright)]'}`}>
                  {k === 'simple' ? 'Simple' : 'Classic'}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-1">
              {presets.map(p => (
                <button
                  key={p}
                  onClick={() => setCustomInput(p)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono border ${customInput === p ? 'bg-[var(--color-neon-dim)] text-[var(--color-neon)] border-[var(--color-neon)]' : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border-bright)] hover:text-[var(--color-text)]'}`}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Grammar preview — matches selected kind */}
            <div className="border border-[var(--color-border-bright)] rounded-lg bg-[var(--color-card)] p-3">
              <div className="text-[10px] font-mono font-bold tracking-wide uppercase text-[var(--color-text-muted)] mb-2">
                {grammarKind === 'simple'
                  ? t('syntax.step1.tryGrammarTitleSimple', { defaultValue: 'Example grammar — Simple (flat, no precedence)' })
                  : t('syntax.step1.tryGrammarTitle', { defaultValue: 'Example grammar — Classic (precedence-encoded)' })}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px] font-mono">
                {(grammarKind === 'simple' ? SIMPLE_GRAMMAR.rules : CLASSIC_GRAMMAR.rules).map(r => (
                  <span key={r.id} className="text-[var(--color-text-dim)]">
                    {r.lhs} → {r.rhs.join(' ')}  ({r.id})
                  </span>
                ))}
              </div>
              <div className="mt-2 text-[9px] font-mono text-[var(--color-text-muted)]">
                {grammarKind === 'simple'
                  ? t('syntax.step1.tryGrammarHintSimple', { defaultValue: 'Start symbol is Expr. Terminals are name, +, -, *, /, (, ). Rightmost derivation rewrites rightmost NT each step — same input gives same tree for leftmost/rightmost.' })
                  : t('syntax.step1.tryGrammarHint', { defaultValue: 'Start symbol is Goal. Terminals are name, +, -, *, /, (, ). Classic grammar adds Term/Factor levels to encode precedence — a + b × c groups as a + (b × c).' })}
              </div>
            </div>

            {!customResult.error && customResult.derivation.length > 0 && (
              <>
                <CfgDerivationTable derivation={customResult.derivation} isPlaying={isPlaying && active === 'TRYIT'} isCompleted={isCompleted || active === 'TRYIT'} grammarKind={grammarKind} />
                <div className="border border-[var(--color-cyan)]/30 rounded-lg bg-[var(--color-card)] p-3 overflow-auto">
                  <div className="text-[10px] font-mono font-bold tracking-wide uppercase text-[var(--color-cyan)] mb-2">
                    {t('syntax.step1.tryTreeTitle', { defaultValue: 'Corresponding Parse Tree' })}
                  </div>
                  <CfgParseTree tree={customResult.parseTree} isPlaying={isPlaying && active === 'TRYIT'} isCompleted={isCompleted || active === 'TRYIT'} />
                  <div className="mt-2 text-[9px] font-mono text-[var(--color-text-muted)]">
                    {t('syntax.step1.tryTreeHint', { defaultValue: 'Sequential: derivation builds top-down, tree fills post-order. Same tree results from leftmost or rightmost order — only application order differs.' })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GrammarRulesTable;