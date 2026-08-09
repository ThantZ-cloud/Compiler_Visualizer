import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import type { ParseStep } from '../../lib/parser/types';

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
  }, [idx]);

  const current = steps[Math.min(idx, steps.length - 1)];
  const log = steps.slice(Math.max(0, idx - MAX_LOG + 1), idx + 1);
  const input = current?.inputRemaining ?? [];
  const stack = current?.stack ?? [];
  const done = current?.action.type === 'ACCEPT';

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Description */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-[var(--color-cyan)] font-display tracking-[0.1em] uppercase mb-2">
          {t('syntax.step3.title')}
        </h2>
        <p className="text-xs text-[var(--color-text-dim)] font-mono leading-relaxed">
          {t('syntax.step3.description')}
        </p>
      </div>

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
    </div>
  );
};

export default ShiftReduceAnimation;