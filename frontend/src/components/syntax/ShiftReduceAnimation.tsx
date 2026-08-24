import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import type { ParseStep } from '../../lib/parser/types';
import {
  buildShiftReduceTryItData,
  RIGHT_RECURSIVE_GRAMMAR,
  PDA_TRYIT_PRESETS,
} from '../../lib/parser/shiftReduceTryIt';
import LrTraceTable from './LrTraceTable';
import LrTablesDisplay from './LrTablesDisplay';

interface ShiftReduceAnimationProps {
  steps: ParseStep[];
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

const MAX_INPUT_SHOWN = 24;
const MAX_LOG = 60;

const ShiftReduceAnimation: React.FC<ShiftReduceAnimationProps> = ({
  steps,
  isPlaying,
  isCompleted,
}) => {
  const { t } = useTranslation();
  const [idx, setIdx] = useState(0);
  const logRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<'TABLE' | 'TRYIT'>('TABLE');
  const [customInput, setCustomInput] = useState('a + b * c');
  const customResult = useMemo(() => buildShiftReduceTryItData(customInput), [customInput]);

  useEffect(() => {
    if (!isPlaying) {
      setIdx(isCompleted ? steps.length - 1 : 0);
      return;
    }
    setIdx(0);
    const interval = setInterval(() => {
      setIdx(prev => {
        if (prev >= steps.length - 1) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 350);
    return () => clearInterval(interval);
  }, [isPlaying, isCompleted, steps]);

  // Auto-scroll the action log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [idx, view]);

  const current = steps[Math.min(idx, steps.length - 1)];
  const log = steps.slice(Math.max(0, idx - MAX_LOG + 1), idx + 1);
  const input = current?.inputRemaining ?? [];
  const stack = current?.stack ?? [];
  const done = current?.action.type === 'ACCEPT';
  const isVisible = isPlaying || isCompleted;

  const subtitle =
    view === 'TRYIT'
      ? t('syntax.step3.tryItHint', { defaultValue: 'Try It — type your own expression and watch the bottom-up parser shift tokens, find handles, and reduce to Goal. Example: a + b × c' })
      : t('syntax.step3.description');

  const tabBtn = (label: string, key: 'TABLE' | 'TRYIT') => (
    <button
      key={key}
      onClick={() => setView(key)}
      className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold tracking-wide border transition-colors ${view === key ? 'bg-[var(--color-neon-dim)] text-[var(--color-neon)] border-[var(--color-neon)]' : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border-bright)] hover:text-[var(--color-text)]'}`}
    >
      {label}
    </button>
  );

  const lastStep = customResult.steps[customResult.steps.length - 1];

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Description */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-[var(--color-cyan)] font-display tracking-[0.1em] uppercase mb-2">
          {t('syntax.step3.title')}
          <span className="ml-2 align-middle px-1.5 py-0.5 rounded border border-[var(--color-cyan)]/50 text-[9px] font-mono tracking-normal normal-case text-[var(--color-cyan)]">
            Shift-Reduce Parsing
          </span>
        </h2>
        <p className="text-xs text-[var(--color-text-dim)] font-mono leading-relaxed">
          {subtitle}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {[
          { key: 'TABLE' as const, labelKey: 'syntax.step3.tableView', fallback: 'Your Program' },
          { key: 'TRYIT' as const, labelKey: 'syntax.step3.tryItView', fallback: 'Try It' },
        ].map(v => tabBtn(t(v.labelKey, { defaultValue: v.fallback }), v.key))}
      </div>

      {view === 'TABLE' && (
        <>
        {!isVisible ? (
          <div className="border border-[var(--color-border-bright)] rounded-lg bg-[var(--color-card)] h-[280px] flex items-center justify-center">
            <span className="text-[10px] font-mono text-[var(--color-text-muted)]">Press Play to animate shift-reduce parsing</span>
          </div>
        ) : (
        <>
        {/* Action bar */}
        <div className="flex items-center justify-between gap-3 mb-4 px-4 py-2 border border-[var(--color-border-bright)] rounded-lg bg-[var(--color-card)]">
          <span className={`text-xs font-mono font-bold ${done ? 'text-[var(--color-amber)]' : 'text-[var(--color-neon)]'}`}>
            {current?.action.detail ?? '...'}
          </span>
          <span className="text-[10px] font-mono text-[var(--color-text-muted)] shrink-0">
            {Math.min(idx + 1, steps.length)}/{steps.length}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Input buffer */}
          <div className="border border-[var(--color-border-bright)] rounded-lg bg-[var(--color-card)] flex flex-col min-h-[220px]">
            <div className="px-4 py-2 border-b border-[var(--color-border-bright)] flex items-center justify-between shrink-0">
              <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-[var(--color-text-muted)] font-display">
                {t('syntax.step3.inputBuffer')}
              </span>
              <span className="text-[9px] font-mono text-[var(--color-amber)]">{input.length} left</span>
            </div>
            <div className="flex-1 p-3 flex flex-wrap gap-1.5 content-start">
              {input.slice(0, MAX_INPUT_SHOWN).map((token, i) => (
                <motion.span
                  key={`${token.line}-${token.column}`}
                  initial={i === 0 ? { scale: 1.15, boxShadow: '0 0 6px var(--color-neon-dim)' } : false}
                  className={`px-1.5 py-0.5 text-[10px] font-mono rounded border ${
                    i === 0 && isPlaying ? 'border-[var(--color-neon)] text-[var(--color-neon)]' : ''
                  }`}
                  style={{
                    color: i === 0 && isPlaying ? 'var(--color-neon)' : tokenColor(token.type),
                    borderColor: i === 0 && isPlaying ? 'var(--color-neon)' : tokenColor(token.type),
                  }}
                >
                  {token.value}
                </motion.span>
              ))}
              {input.length === 0 && (
                <div className="text-[10px] font-mono text-[var(--color-text-muted)] py-4 w-full text-center">
                  {done ? t('syntax.step3.bufferEmpty') : '...'}
                </div>
              )}
              {input.length > MAX_INPUT_SHOWN && (
                <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
                  +{input.length - MAX_INPUT_SHOWN} more…
                </span>
              )}
            </div>
          </div>

          {/* Parse stack */}
          <div className="border border-[var(--color-border-bright)] rounded-lg bg-[var(--color-card)] flex flex-col min-h-[220px]">
            <div className="px-4 py-2 border-b border-[var(--color-border-bright)] flex items-center justify-between shrink-0">
              <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-[var(--color-text-muted)] font-display">
                {t('syntax.step3.parseStack')}
              </span>
              <span className="text-[9px] font-mono text-[var(--color-amber)]">{stack.length} items</span>
            </div>
            <div className="flex-1 p-3 overflow-hidden">
              <div className="flex flex-col-reverse gap-1 max-h-[180px] overflow-y-auto">
                <AnimatePresence mode="popLayout">
                  {stack.map(item => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: -10, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.9 }}
                      className={`px-2 py-1 text-[10px] font-mono rounded border w-full text-center truncate ${
                        item.kind === 'nonterminal'
                          ? 'text-[var(--color-cyan)] border-[var(--color-cyan)]/40 bg-[rgba(0,212,255,0.06)]'
                          : 'text-[var(--color-neon)] border-[var(--color-neon)]/40 bg-[rgba(0,255,136,0.05)]'
                      }`}
                    >
                      {item.symbol}
                    </motion.div>
                  ))}
                </AnimatePresence>
                {stack.length === 0 && (
                  <div className="text-[10px] font-mono text-[var(--color-text-muted)] text-center py-4">
                    {t('syntax.step3.empty')}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action log */}
        <div className="mt-4 border border-[var(--color-border-bright)] rounded-lg bg-[var(--color-card)] overflow-hidden">
          <div className="px-4 py-2 border-b border-[var(--color-border-bright)] flex items-center justify-between shrink-0">
            <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-[var(--color-text-muted)] font-display">
              {t('syntax.step3.actionLog')}
            </span>
            <span className="text-[9px] font-mono text-[var(--color-text-muted)]">
              {idx + 1} / {steps.length}
            </span>
          </div>
          <div ref={logRef} className="h-[180px] overflow-y-auto p-3 space-y-1 font-mono">
            <AnimatePresence initial={false}>
              {log.map(step => {
                const action = step.action;
                const color =
                  action.type === 'SHIFT'
                    ? 'text-[var(--color-neon)]'
                    : action.type === 'REDUCE'
                    ? 'text-[var(--color-cyan)]'
                    : 'text-[var(--color-amber)]';
                return (
                  <motion.div
                    key={step.index}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`text-[10px] ${color}`}
                  >
                    <span className="text-[var(--color-text-muted)] mr-2">
                      {String(step.index).padStart(3, ' ')}
                    </span>
                    {action.detail}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
        </>
        )}
        </>
      )}

      {view === 'TRYIT' && (
        <div className="flex flex-col gap-3">
          {/* Editable input — textbook expression grammar */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-wide text-[var(--color-text-muted)] font-mono whitespace-nowrap">
                {t('syntax.step3.tryOwnInput', { defaultValue: 'Try your own expression:' })}
              </span>
              <input
                value={customInput}
                onChange={e => setCustomInput(e.target.value)}
                placeholder="a + b * c  or  (a + b) * c"
                className="flex-1 min-w-0 px-2 py-1.5 rounded border border-[var(--color-border-bright)] bg-[var(--color-card)] text-xs font-mono text-[var(--color-text)] focus:outline-none focus:border-[var(--color-neon)]"
                maxLength={48}
              />
              <span className="text-[10px] font-mono text-[var(--color-text-muted)] whitespace-nowrap">
                {!customResult.error && customResult.steps.length > 0
                  ? `${customResult.steps.length - 1} actions`
                  : ''}
              </span>
            </div>
            {customResult.error && (
              <div className="text-[10px] font-mono text-[var(--color-error)] bg-[var(--color-error-dim)]/20 border border-[var(--color-error-dim)] rounded px-2 py-1">
                {customResult.error}
              </div>
            )}
            <div className="flex flex-wrap gap-1">
              {PDA_TRYIT_PRESETS.map(p => (
                <button
                  key={p}
                  onClick={() => setCustomInput(p)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono border ${customInput === p ? 'bg-[var(--color-neon-dim)] text-[var(--color-neon)] border-[var(--color-neon)]' : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border-bright)] hover:text-[var(--color-text)]'}`}
                >
                  {p}
                </button>
              ))}
            </div>
            {/* Grammar card */}
            <div className="border border-[var(--color-border-bright)] rounded-lg bg-[var(--color-card)] p-3">
              <div className="text-[10px] font-mono font-bold tracking-wide uppercase text-[var(--color-text-muted)] mb-2">
                {t('syntax.step3.tryGrammarTitle', { defaultValue: 'Example grammar — augmented with Goal′ → Goal' })}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px] font-mono">
                <span className="text-[var(--color-text-dim)]">Goal′ → Goal  (′)</span>
                {RIGHT_RECURSIVE_GRAMMAR.rules.map(r => (
                  <span key={r.id} className="text-[var(--color-text-dim)]">
                    {r.lhs} → {r.rhs.length === 0 ? 'ε' : r.rhs.join(' ')}  ({r.id})
                  </span>
                ))}
              </div>
              <div className="mt-2 text-[9px] font-mono text-[var(--color-text-muted)]">
                {t('syntax.step3.tryGrammarHint', { defaultValue: 'Bottom-up: shift tokens until the stack top holds a handle (right side of a rule), then reduce it to the left side. Builds a reverse rightmost derivation — left-to-right scan, one lookahead symbol.' })}
              </div>
            </div>
          </div>

          {/* Order: input → trace → Action/Goto tables */}
          {!customResult.error && customResult.steps.length > 0 && (
            <>
              <LrTraceTable
                steps={customResult.steps}
                isPlaying={false}
                isCompleted={true}
              />
              <LrTablesDisplay
                activeState={lastStep ? lastStep.state : null}
                activeLookahead={null}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ShiftReduceAnimation;
