import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import type { SemanticSymbol } from '../../types/semantic';

interface SymbolCollectorProps {
  symbolTableJson: string;
  isPlaying: boolean;
  isCompleted: boolean;
}

function getCategory(kind: string, modifiers?: string): string {
  const mod = (modifiers || '').toLowerCase();
  if (mod.includes('final')) return 'constant';
  if (kind === 'method' || kind === 'constructor') return 'function';
  if (kind === 'parameter') return 'parameter';
  if (kind === 'variable' || kind === 'field') return 'variable';
  return kind;
}

function getScopeLocality(depth: number): string {
  return depth <= 2 ? 'Global' : 'Local';
}

const CATEGORY_COLORS: Record<string, string> = {
  constant: '#c586c0',
  function: '#dcdcaa',
  parameter: '#9cdcfe',
  variable: '#4ec9b0',
};

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

    function collectScope(node: ScopeNode | undefined, parentScope: string, depth: number) {
      if (!node) return;

      const scopeName = node.name || '(root)';
      const scopePath = parentScope ? `${parentScope}.${scopeName}` : scopeName;

      if (node.kind && ['variable', 'parameter', 'field', 'method', 'constructor'].includes(node.kind)) {
        const isMethod = node.kind === 'method' || node.kind === 'constructor';
        const paramChildren = (node.children || []).filter(c => c.kind === 'parameter');
        const paramStr = paramChildren.length
          ? paramChildren.map(p => `${p.type || ''} ${p.name || ''}`.trim()).join(', ')
          : isMethod && node.name && node.name.includes('(')
            ? (() => {
                const m = node.name.match(/\(([^)]*)\)/);
                return m ? m[1].trim() : '';
              })()
            : '';
        const returnType = isMethod ? (node.returnType || node.type || '') : '';
        symbols.push({
          name: node.name || '',
          kind: node.kind,
          type: node.type || node.returnType || '',
          scope: scopePath,
          modifiers: node.modifiers || '',
          lexicalLevel: depth,
          category: getCategory(node.kind, node.modifiers),
          returnType,
          parameters: paramStr,
        });
      }

      if (node.children) {
        for (const child of node.children) {
          collectScope(child, scopePath, depth + 1);
        }
      }
    }

    if (parsed.scopeTree) {
      collectScope(parsed.scopeTree, '', 0);
    }

    return symbols;
  } catch {
    return [];
  }
}

const FILTER_CATS = ['all', 'variable', 'constant', 'function', 'parameter'] as const;

const SymbolCollector: React.FC<SymbolCollectorProps> = ({ symbolTableJson, isPlaying, isCompleted }) => {
  const { t } = useTranslation();
  const [symbols, setSymbols] = useState<SemanticSymbol[]>([]);
  const [revealCount, setRevealCount] = useState(0);
  const [filterKind, setFilterKind] = useState<string>('all');

  useEffect(() => {
    setSymbols(parseSymbols(symbolTableJson));
  }, [symbolTableJson]);

  useEffect(() => {
    if (!isPlaying) {
      setRevealCount(symbols.length);
      return;
    }
    setRevealCount(0);
    const interval = setInterval(() => {
      setRevealCount(prev => prev + 1);
    }, 120);
    return () => clearInterval(interval);
  }, [isPlaying, isCompleted, symbols.length]);

  const filteredByKind = filterKind === 'all' ? symbols : symbols.filter(s => s.category === filterKind);
  // For reveal animation, slice from filtered list to keep animation consistent with filter
  const visibleSymbols = filteredByKind.slice(0, Math.min(revealCount, filteredByKind.length));
  const total = symbols.length;
  const filteredTotal = filteredByKind.length;

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

      <div className="flex flex-wrap gap-1 mb-2">
        {FILTER_CATS.map(k => (
          <button
            key={k}
            onClick={() => setFilterKind(k)}
            className={`px-2 py-0.5 rounded text-[10px] font-mono border capitalize ${filterKind === k ? 'bg-[var(--color-neon-dim)] text-[var(--color-neon)] border-[var(--color-neon)]' : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border-bright)] hover:text-[var(--color-text)]'}`}
          >
            {k}
          </button>
        ))}
      </div>

      <div className="border border-[var(--color-border-bright)] rounded-lg overflow-hidden bg-[var(--color-card)]">
        <div className="px-4 py-2 border-b border-[var(--color-border)] flex items-center justify-between">
          <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-[var(--color-text-muted)] font-display">
            {t('semantic.symbolsInScopes')}
          </span>
          <span className="text-[9px] font-mono text-[var(--color-amber)]">
            {visibleSymbols.length}/{filteredTotal} {filterKind !== 'all' ? `(${total} total)` : ''} {t('semantic.collected')}
          </span>
        </div>

        <div className="overflow-auto max-h-96">
          <table className="w-full border-collapse text-xs font-mono">
            <thead>
              <tr className="sticky top-0 bg-[var(--color-surface-2)] border-b border-[var(--color-border)]">
                <th className="text-left px-3 py-2.5 text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]">
                  {t('semantic.name')}
                </th>
                <th className="text-left px-3 py-2.5 text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]">
                  {t('semantic.type')}
                </th>
                <th className="text-left px-3 py-2.5 text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]">
                  Category
                </th>
                <th className="text-left px-3 py-2.5 text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]" title="Local = inside method/block (L≥3), Global = package/class level (L≤2)">
                  Scope
                </th>
                <th className="text-left px-3 py-2.5 text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]" title="Lexical nesting depth — static coordinate l">
                  Lexical Level
                </th>
                <th className="text-left px-3 py-2.5 text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]">
                  Return Type
                </th>
                <th className="text-left px-3 py-2.5 text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]">
                  Parameter
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
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="text-[var(--color-neon)]">{sym.name}</div>
                      <div className="text-[9px] text-[var(--color-text-dim)] font-mono leading-none mt-0.5">
                        Insert(&quot;{sym.name}&quot;, &#123;type: {sym.type || '—'}&#125;)
                      </div>
                    </td>
                    <td className="px-3 py-2 text-[var(--color-cyan)] whitespace-nowrap">{sym.type || '—'}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span
                        className="inline-block px-1.5 py-0.5 text-[10px] font-bold rounded"
                        style={{
                          color: CATEGORY_COLORS[sym.category || ''] || '#d4d4d4',
                          background: `${CATEGORY_COLORS[sym.category || ''] || '#d4d4d4'}15`,
                        }}
                      >
                        {sym.category || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap" title={sym.scope}>
                      <span
                        className={`inline-block px-1.5 py-0.5 text-[10px] font-bold rounded ${getScopeLocality(sym.lexicalLevel ?? 99) === 'Global' ? 'bg-[var(--color-cyan)]/15 text-[var(--color-cyan)]' : 'bg-[var(--color-neon)]/15 text-[var(--color-neon)]'}`}
                      >
                        {getScopeLocality(sym.lexicalLevel ?? 99)}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-center">
                      <span className="inline-block min-w-[28px] px-1.5 py-0.5 text-[10px] font-bold rounded bg-[var(--color-amber)]/15 text-[var(--color-amber)]">
                        L{sym.lexicalLevel ?? '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[var(--color-amber)] whitespace-nowrap">{sym.returnType || '—'}</td>
                    <td className="px-3 py-2 text-[var(--color-text-muted)] whitespace-nowrap max-w-[160px] truncate" title={sym.parameters || ''}>{sym.parameters || '—'}</td>
                  </motion.tr>
                ))}
              </AnimatePresence>

              {total === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-[var(--color-text-muted)] text-xs font-mono">
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
