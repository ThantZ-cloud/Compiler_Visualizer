import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { SemanticError } from '../../types/semantic';

interface ErrorReportPanelProps {
  symbolTableJson: string;
  isPlaying: boolean;
  isCompleted: boolean;
}

function parseErrors(jsonStr: string): SemanticError[] {
  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed.error) return [];
    return parsed.errors || [];
  } catch {
    return [];
  }
}

const ErrorReportPanel: React.FC<ErrorReportPanelProps> = ({ symbolTableJson, isPlaying, isCompleted }) => {
  const { t } = useTranslation();
  const [errors, setErrors] = useState<SemanticError[]>([]);
  const [revealCount, setRevealCount] = useState(0);
  const [severityFilter, setSeverityFilter] = useState<'all' | 'ERROR' | 'WARNING'>('all');

  useEffect(() => {
    setErrors(parseErrors(symbolTableJson));
  }, [symbolTableJson]);

  useEffect(() => {
    if (!isPlaying) {
      setRevealCount(errors.length);
      return;
    }
    setRevealCount(0);
    const interval = setInterval(() => {
      setRevealCount(prev => prev + 1);
    }, 200);
    return () => clearInterval(interval);
  }, [isPlaying, isCompleted, errors.length]);

  const filteredBySeverity = severityFilter === 'all' ? errors : errors.filter(e => e.severity === severityFilter);
  const visibleErrors = filteredBySeverity.slice(0, Math.min(revealCount, filteredBySeverity.length));
  const errorCount = errors.filter(e => e.severity === 'ERROR').length;
  const warningCount = errors.filter(e => e.severity === 'WARNING').length;

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-[var(--color-magenta)] font-display tracking-[0.1em] uppercase mb-2">
          {t('semantic.errorReporting')}
        </h2>
        <p className="text-xs text-[var(--color-text-dim)] font-mono leading-relaxed">
          {t('semantic.errorReportingDescription')}
        </p>
      </div>

      <div className="flex flex-wrap gap-1 mb-2">
        {(['all','ERROR','WARNING'] as const).map(f => (
          <button
            key={f}
            onClick={() => setSeverityFilter(f)}
            className={`px-2 py-0.5 rounded text-[10px] font-mono border capitalize ${severityFilter === f ? 'bg-[var(--color-neon-dim)] text-[var(--color-neon)] border-[var(--color-neon)]' : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border-bright)] hover:text-[var(--color-text)]'}`}
          >
            {f === 'all' ? 'All' : f}
          </button>
        ))}
      </div>

      <div className="border border-[var(--color-border-bright)] rounded-lg overflow-hidden bg-[var(--color-card)]">
        <div className="px-4 py-2 border-b border-[var(--color-border)] flex items-center justify-between">
          <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-[var(--color-text-muted)] font-display">
            {t('semantic.semanticErrors')}
          </span>
          <div className="flex items-center gap-3">
            {errorCount > 0 && (
              <span className="flex items-center gap-1 text-[9px] font-mono text-[var(--color-rose)]">
                <AlertCircle size={10} />
                {errorCount} {t('semantic.errors')}
              </span>
            )}
            {warningCount > 0 && (
              <span className="flex items-center gap-1 text-[9px] font-mono text-[var(--color-amber)]">
                <AlertTriangle size={10} />
                {warningCount} {t('semantic.warnings')}
              </span>
            )}
            <span className="text-[9px] font-mono text-[var(--color-text-muted)]">
              {Math.min(revealCount, filteredBySeverity.length)}/{filteredBySeverity.length} {severityFilter !== 'all' ? `(${errors.length} total)` : ''} {t('semantic.reported')}
            </span>
          </div>
        </div>

        {errorCount === 0 && warningCount === 0 && (
          <div className="px-4 py-6 text-center">
            <div className="flex items-center justify-center gap-2 text-[var(--color-neon)]">
              <CheckCircle2 size={16} />
              <span className="text-xs font-mono">{t('semantic.noErrors')}</span>
            </div>
          </div>
        )}

        {errorCount > 0 && (
          <div className="overflow-y-auto max-h-80">
            <table className="w-full border-collapse text-xs font-mono">
              <thead>
                <tr className="bg-[var(--color-surface-2)] border-b border-[var(--color-border)]">
                  <th className="text-left px-4 py-2.5 text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]">
                    {t('semantic.severity')}
                  </th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]">
                    {t('semantic.message')}
                  </th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]">
                    {t('semantic.location')}
                  </th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {visibleErrors.map((err, i) => (
                    <motion.tr
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface)] transition-colors"
                    >
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold rounded ${
                            err.severity === 'ERROR'
                              ? 'text-[var(--color-rose)] bg-[var(--color-rose)]/15'
                              : 'text-[var(--color-amber)] bg-[var(--color-amber)]/15'
                          }`}
                        >
                          {err.severity === 'ERROR' ? <AlertCircle size={10} /> : <AlertTriangle size={10} />}
                          {err.severity}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-[var(--color-text-dim)]">{err.message}</td>
                      <td className="px-4 py-2 text-[var(--color-text-muted)] whitespace-nowrap">
                        Line {err.line}:{err.column}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}

        {errorCount === 0 && warningCount > 0 && (
          <div className="overflow-y-auto max-h-80">
            <table className="w-full border-collapse text-xs font-mono">
              <thead>
                <tr className="bg-[var(--color-surface-2)] border-b border-[var(--color-border)]">
                  <th className="text-left px-4 py-2.5 text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]">
                    Severity
                  </th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]">
                    Message
                  </th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]">
                    Location
                  </th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {visibleErrors.map((err, i) => (
                    <motion.tr
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="border-b border-[var(--color-border)]"
                    >
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold rounded text-[var(--color-amber)] bg-[var(--color-amber)]/15">
                          <AlertTriangle size={10} />
                          WARNING
                        </span>
                      </td>
                      <td className="px-4 py-2 text-[var(--color-text-dim)]">{err.message}</td>
                      <td className="px-4 py-2 text-[var(--color-text-muted)] whitespace-nowrap">
                        Line {err.line}:{err.column}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ErrorReportPanel;
