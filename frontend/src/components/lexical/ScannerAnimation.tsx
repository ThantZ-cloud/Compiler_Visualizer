import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import type { ScannerStep, Token } from '../../lib/lexer/types';

interface ScannerAnimationProps {
  sourceCode: string;
  steps: ScannerStep[];
  emittedTokens: Token[];
  isPlaying: boolean;
  isCompleted: boolean;
}

const ScannerAnimation: React.FC<ScannerAnimationProps> = ({
  sourceCode,
  steps,
  emittedTokens,
  isPlaying,
  isCompleted,
}) => {
  const { t } = useTranslation();
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [visibleTokens, setVisibleTokens] = useState<Token[]>([]);
  const tokenListRef = useRef<HTMLDivElement>(null);

  // Auto-advance through steps when playing
  useEffect(() => {
    if (!isPlaying) {
      if (isCompleted) {
        setCurrentStepIdx(steps.length - 1);
        setVisibleTokens(emittedTokens);
      } else {
        setCurrentStepIdx(0);
        setVisibleTokens([]);
      }
      return;
    }

    let i = 0;
    setCurrentStepIdx(0);
    setVisibleTokens([]);

    const interval = setInterval(() => {
      i++;
      if (i >= steps.length) {
        clearInterval(interval);
        return;
      }
      setCurrentStepIdx(i);
      const step = steps[i];
      if (step.emittedToken) {
        setVisibleTokens(prev => [...prev, step.emittedToken!]);
      }
    }, 25); // 25ms per char for smooth scanning

    return () => clearInterval(interval);
  }, [isPlaying, isCompleted, steps, emittedTokens]);

  // Auto-scroll token list
  useEffect(() => {
    if (tokenListRef.current) {
      tokenListRef.current.scrollTop = tokenListRef.current.scrollHeight;
    }
  }, [visibleTokens]);

  const currentStep = steps[currentStepIdx];
  const displayCode = sourceCode.slice(0, 2000); // limit for display
  const currentPosition = currentStep?.position ?? 0;

  // Token type colors
  const getTokenColor = (type: string): string => {
    const colors: Record<string, string> = {
      KEYWORD: '#FF00FF',
      IDENTIFIER: '#00FF88',
      STRING: '#FFB000',
      NUMBER: '#00D4FF',
      OPERATOR: '#FF3366',
      SEPARATOR: '#8888AA',
      WHITESPACE: '#555570',
      COMMENT: '#262638',
    };
    return colors[type] || '#E0E0F0';
  };

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Description */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-[var(--color-amber)] font-display tracking-[0.1em] uppercase mb-2">
          {t('lexical.step4.title')}
        </h2>
        <p className="text-xs text-[var(--color-text-dim)] font-mono leading-relaxed">
          {t('lexical.step4.description')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        {/* Source code with scanning indicator */}
        <div className="border border-[var(--color-border-bright)] rounded-lg overflow-hidden bg-[var(--color-card)]">
          {/* DFA State indicator */}
          <div className="px-4 py-2 border-b border-[var(--color-border)] flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-[var(--color-text-muted)] font-display">
              {t('lexical.step4.dfaState')}
            </span>
            <span
              className={`text-xs font-mono font-bold px-3 py-1 rounded ${
                currentStep?.isAccept
                  ? 'text-[var(--color-neon)] bg-[var(--color-neon-dim)]'
                  : currentStep?.dfaStateLabel === 'DONE'
                  ? 'text-[var(--color-text-muted)]'
                  : 'text-[var(--color-text)] bg-[var(--color-surface-3)]'
              }`}
            >
              {currentStep?.dfaStateLabel || '—'}
              {currentStep?.isAccept && currentStep?.emittedToken && (
                <span className="ml-2 text-[10px]">
                  → {currentStep.emittedToken.type}
                </span>
              )}
            </span>
          </div>

          {/* Source code display */}
          <div className="p-4">
            <div className="text-[10px] font-bold tracking-[0.1em] uppercase text-[var(--color-text-muted)] font-display mb-2">
              {t('lexical.step4.sourceCode')}
            </div>
            <pre className="text-xs font-mono leading-relaxed whitespace-pre-wrap break-all min-h-[120px]">
              {displayCode.split('').map((char, i) => (
                <span
                  key={i}
                  className={`transition-all ${
                    i === currentPosition && (isPlaying || isCompleted)
                      ? 'bg-[var(--color-neon)] text-[var(--color-void)] px-0.5'
                      : i < currentPosition && (isPlaying || isCompleted)
                      ? 'text-[var(--color-text-dim)]'
                      : 'text-[var(--color-text)]'
                  }`}
                >
                  {char === '\n' ? '↵\n' : char}
                </span>
              ))}
            </pre>
          </div>

          {/* Status */}
          <div className="px-4 py-2 border-t border-[var(--color-border)]">
            <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
              {currentStep?.description || '...'}
            </span>
          </div>
        </div>

        {/* Emitted tokens */}
        <div className="border border-[var(--color-border-bright)] rounded-lg bg-[var(--color-card)] flex flex-col max-h-[400px]">
          <div className="px-4 py-2 border-b border-[var(--color-border-bright)] shrink-0">
            <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-[var(--color-text-muted)] font-display">
              {t('lexical.step4.tokensEmitted')} ({visibleTokens.length})
            </span>
          </div>
          <div ref={tokenListRef} className="flex-1 overflow-y-auto p-3 space-y-1">
            <AnimatePresence>
              {visibleTokens.map((token, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 20, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  className="flex items-center gap-2 px-2 py-1.5 rounded bg-[var(--color-surface-2)] border-l-2"
                  style={{ borderColor: getTokenColor(token.type) }}
                >
                  <span
                    className="text-[9px] font-mono font-bold uppercase tracking-wider shrink-0"
                    style={{ color: getTokenColor(token.type) }}
                  >
                    {token.type}
                  </span>
                  <span className="text-xs font-mono text-[var(--color-text)] truncate">
                    {token.value}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
            {visibleTokens.length === 0 && (
              <div className="text-[10px] font-mono text-[var(--color-text-muted)] text-center py-4">
                {isPlaying ? t('lexical.step4.scanning') : '...'}
              </div>
            )}
          </div>
          {currentStep?.dfaStateLabel === 'DONE' && (
            <div className="px-4 py-2 border-t border-[var(--color-border-bright)] shrink-0">
              <span className="text-[10px] font-bold text-[var(--color-neon)] font-mono">
                {t('lexical.step4.complete')} ({visibleTokens.length} tokens)
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScannerAnimation;
