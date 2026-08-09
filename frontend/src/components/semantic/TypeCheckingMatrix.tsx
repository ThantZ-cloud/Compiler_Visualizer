import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import type { TypeCheckEntry } from '../../types/semantic';

interface TypeCheckingMatrixProps {
  symbolTableJson: string;
  isPlaying: boolean;
  isCompleted: boolean;
}

function parseTypeChecks(jsonStr: string): TypeCheckEntry[] {
  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed.error) return [];
    return parsed.typeChecks || [];
  } catch {
    return [];
  }
}

const CHECK_COLORS: Record<string, string> = {
  assignment: '#569cd6',
  variable_declaration: '#9cdcfe',
  method_call: '#4ec9b0',
  symbol_resolution: '#dcdcaa',
  return: '#c586c0',
  unary_expression: '#ce9178',
  binary_expression: '#d4d4d4',
};

const TypeCheckingMatrix: React.FC<TypeCheckingMatrixProps> = ({ symbolTableJson, isPlaying }) => {
  const { t } = useTranslation();
  const [checks, setChecks] = useState<TypeCheckEntry[]>([]);
  const [revealCount, setRevealCount] = useState(0);

  useEffect(() => {
    setChecks(parseTypeChecks(symbolTableJson));
  }, [symbolTableJson]);

  useEffect(() => {
    if (!isPlaying) {
      setRevealCount(checks.length);
      return;
    }
    setRevealCount(0);
    const interval = setInterval(() => {
      setRevealCount(prev => prev + 1);
    }, 150);
    return () => clearInterval(interval);
  }, [isPlaying, checks.length]);

  const visibleChecks = checks.slice(0, Math.min(revealCount, checks.length));
  const passed = visibleChecks.filter(c => c.result === 'pass').length;
  const failed = visibleChecks.filter(c => c.result === 'fail').length;
  const unknown = visibleChecks.filter(c => c.result === 'unknown').length;
  const total = checks.length;

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-[var(--color-magenta)] font-display tracking-[0.1em] uppercase mb-2">
          {t('semantic.typeChecking')}
        </h2>
        <p className="text-xs text-[var(--color-text-dim)] font-mono leading-relaxed">
          {t('semantic.typeCheckingDescription')}
        </p>
      </div>

      <div className="border border-[var(--color-border-bright)] rounded-lg overflow-hidden bg-[var(--color-card)]">
        <div className="px-4 py-2 border-b border-[var(--color-border)] flex items-center justify-between">
          <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-[var(--color-text-muted)] font-display">
            {t('semantic.typeCheckMatrix')}
          </span>
          <div className="flex items-center gap-3 text-[9px] font-mono">
            <span className="text-[var(--color-neon)]">{passed} {t('semantic.passed')}</span>
            <span className="text-[var(--color-rose)]">{failed} {t('semantic.failed')}</span>
            <span className="text-[var(--color-text-dim)]">{unknown} {t('semantic.unknown')}</span>
            <span className="text-[var(--color-text-muted)]">
              {Math.min(revealCount, total)}/{total}
            </span>
          </div>
        </div>

        <div className="overflow-y-auto max-h-96">
          <table className="w-full border-collapse text-xs font-mono">
            <thead>
              <tr className="sticky top-0 bg-[var(--color-surface-2)] border-b border-[var(--color-border)]">
                <th className="text-left px-4 py-2.5 text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]">
                  {t('semantic.check')}
                </th>
                <th className="text-left px-4 py-2.5 text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]">
                  {t('semantic.target')}
                </th>
                <th className="text-left px-4 py-2.5 text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]">
                  {t('semantic.expected')}
                </th>
                <th className="text-left px-4 py-2.5 text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]">
                  {t('semantic.actual')}
                </th>
                <th className="text-left px-4 py-2.5 text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]">
                  {t('semantic.location')}
                </th>
                <th className="text-center px-4 py-2.5 text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]">
                  {t('semantic.result')}
                </th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {visibleChecks.map((check, i) => {
                  const checkType = check.check || 'unknown';
                  const color = CHECK_COLORS[checkType] || '#d4d4d4';
                  const isPass = check.result === 'pass';
                  const isFail = check.result === 'fail';

                  return (
                    <motion.tr
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface)] transition-colors"
                    >
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span
                          className="inline-block px-1.5 py-0.5 text-[10px] font-bold rounded"
                          style={{ color, background: `${color}15` }}
                        >
                          {checkType.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-[var(--color-text-dim)] whitespace-nowrap">
                        {check.method || check.variable || check.symbol || '—'}
                      </td>
                      <td className="px-4 py-2 text-[var(--color-cyan)] whitespace-nowrap">
                        {check.declaredType || check.returnType || check.targetType || '—'}
                      </td>
                      <td className="px-4 py-2 text-[var(--color-amber)] whitespace-nowrap">
                        {check.initType || check.argumentTypes ? (Array.isArray(check.argumentTypes) ? check.argumentTypes.join(', ') : check.initType || check.argumentTypes) : '—'}
                      </td>
                      <td className="px-4 py-2 text-[var(--color-text-muted)] whitespace-nowrap">{check.location || '—'}</td>
                      <td className="px-4 py-2 text-center">
                        {isPass && (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--color-neon)]/20 text-[var(--color-neon)]">
                            ✓
                          </span>
                        )}
                        {isFail && (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--color-rose)]/20 text-[var(--color-rose)]">
                            ✗
                          </span>
                        )}
                        {!isPass && !isFail && (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--color-text-muted)]/20 text-[var(--color-text-muted)]">
                            ?
                          </span>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>

              {total === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-[var(--color-text-muted)] text-xs font-mono">
                    {t('semantic.noChecks')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {failed > 0 && (
          <div className="px-4 py-2 border-t border-[var(--color-border)] bg-[rgba(255,51,102,0.05)]">
            <span className="text-[9px] font-bold text-[var(--color-rose)]">
              {failed} {t('semantic.typeErrorsDetected')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TypeCheckingMatrix;
