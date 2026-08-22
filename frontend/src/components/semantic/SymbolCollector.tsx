import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import type { SemanticSymbol } from '../../types/semantic';

interface SymbolCollectorProps {
  symbolTableJson: string;
  isPlaying: boolean;
  isCompleted: boolean;
}

function parseSymbols(jsonStr: string): SemanticSymbol[] {
  try {
    const parsed = JSON.parse(jsonStr) as { error?: boolean; scopeTree?: ScopeNode };
    if (parsed.error) return [];
    const symbols: SemanticSymbol[] = [];

    interface ScopeNode {
      name?: string;
      kind?: string;
      type?: string;
      returnType?: string;
      modifiers?: string;
      children?: ScopeNode[];
    }

    function collectScope(node: ScopeNode | undefined, parentScope: string) {
      if (!node) return;

      const scopeName = node.name || '(root)';
      const scopePath = parentScope ? `${parentScope}.${scopeName}` : scopeName;

      if (node.kind && ['variable', 'parameter', 'field', 'method', 'constructor'].includes(node.kind)) {
        symbols.push({
          name: node.name || '',
          kind: node.kind,
          type: node.type || node.returnType || '',
          scope: scopePath,
          modifiers: node.modifiers || '',
        });
      }

      if (node.children) {
        for (const child of node.children) {
          collectScope(child, scopePath);
        }
      }
    }

    if (parsed.scopeTree) {
      collectScope(parsed.scopeTree, '');
    }

    return symbols;
  } catch {
    return [];
  }
}

const KIND_COLORS: Record<string, string> = {
  package: '#4ec9b0',
  class: '#4ec9b0',
  interface: '#4ec9b0',
  method: '#dcdcaa',
  constructor: '#dcdcaa',
  field: '#569cd6',
  variable: '#9cdcfe',
  parameter: '#9cdcfe',
  block: '#6a9955',
};

const SymbolCollector: React.FC<SymbolCollectorProps> = ({ symbolTableJson, isPlaying, isCompleted }) => {
  const { t } = useTranslation();
  const [symbols, setSymbols] = useState<SemanticSymbol[]>([]);
  const [revealCount, setRevealCount] = useState(0);

  useEffect(() => {
    setSymbols(parseSymbols(symbolTableJson));
  }, [symbolTableJson]);

  useEffect(() => {
    if (!isPlaying) {
      setRevealCount(isCompleted ? symbols.length : 0);
      return;
    }
    setRevealCount(0);
    const interval = setInterval(() => {
      setRevealCount(prev => prev + 1);
    }, 120);
    return () => clearInterval(interval);
  }, [isPlaying, isCompleted, symbols.length]);

  const visibleSymbols = symbols.slice(0, Math.min(revealCount, symbols.length));
  const total = symbols.length;

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-[var(--color-magenta)] font-display tracking-[0.1em] uppercase mb-2">
          {t('semantic.symbolCollection')}
        </h2>
        <p className="text-xs text-[var(--color-text-dim)] font-mono leading-relaxed">
          {t('semantic.symbolCollectionDescription')}
        </p>
      </div>

      <div className="border border-[var(--color-border-bright)] rounded-lg overflow-hidden bg-[var(--color-card)]">
        <div className="px-4 py-2 border-b border-[var(--color-border)] flex items-center justify-between">
          <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-[var(--color-text-muted)] font-display">
            {t('semantic.symbolsInScopes')}
          </span>
          <span className="text-[9px] font-mono text-[var(--color-amber)]">
            {visibleSymbols.length}/{total} {t('semantic.collected')}
          </span>
        </div>

        <div className="overflow-y-auto max-h-96">
          <table className="w-full border-collapse text-xs font-mono">
            <thead>
              <tr className="sticky top-0 bg-[var(--color-surface-2)] border-b border-[var(--color-border)]">
                <th className="text-left px-4 py-2.5 text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]">
                  {t('semantic.kind')}
                </th>
                <th className="text-left px-4 py-2.5 text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]">
                  {t('semantic.name')}
                </th>
                <th className="text-left px-4 py-2.5 text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]">
                  {t('semantic.type')}
                </th>
                <th className="text-left px-4 py-2.5 text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]">
                  {t('semantic.scope')}
                </th>
                <th className="text-left px-4 py-2.5 text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]">
                  {t('semantic.modifiers')}
                </th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {visibleSymbols.map((sym, i) => (
                  <motion.tr
                    key={`${sym.scope}-${sym.name}-${i}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface)] transition-colors"
                  >
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span
                        className="inline-block px-1.5 py-0.5 text-[10px] font-bold rounded"
                        style={{
                          color: KIND_COLORS[sym.kind] || '#d4d4d4',
                          background: `${KIND_COLORS[sym.kind] || '#d4d4d4'}15`,
                        }}
                      >
                        {sym.kind}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-[var(--color-neon)] whitespace-nowrap">{sym.name}</td>
                    <td className="px-4 py-2 text-[var(--color-cyan)] whitespace-nowrap">{sym.type || '—'}</td>
                    <td className="px-4 py-2 text-[var(--color-text-muted)] whitespace-nowrap">{sym.scope}</td>
                    <td className="px-4 py-2 text-[var(--color-text-dim)] whitespace-nowrap">{sym.modifiers || '—'}</td>
                  </motion.tr>
                ))}
              </AnimatePresence>

              {total === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-[var(--color-text-muted)] text-xs font-mono">
                    {t('semantic.noSymbols')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SymbolCollector;
