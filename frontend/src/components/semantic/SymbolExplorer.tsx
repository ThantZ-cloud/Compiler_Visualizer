import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Filter } from 'lucide-react';

interface ScopeNode {
  name: string;
  kind: string;
  scopeId: number;
  type?: string;
  modifiers?: string;
  returnType?: string;
  children?: ScopeNode[];
}

interface SymbolEntry {
  name: string;
  kind: string;
  type: string;
  scope: string;
  modifiers?: string;
  lexicalLevel?: number;
  category?: string;
  returnType?: string;
  parameters?: string;
}

interface SymbolExplorerProps {
  symbolTableJson: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  constant: '#c586c0',
  function: '#dcdcaa',
  parameter: '#9cdcfe',
  variable: '#4ec9b0',
};

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

function parseScopeTree(jsonStr: string): ScopeNode | null {
  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed.error) return null;
    return parsed.scopeTree || null;
  } catch {
    return null;
  }
}

function collectSymbolsFromTree(node: ScopeNode | null, parentScope = '', depth = 0): SymbolEntry[] {
  if (!node) return [];
  const symbols: SymbolEntry[] = [];
  const scopePath = parentScope ? `${parentScope}.${node.name}` : node.name;

  if (['variable', 'parameter', 'field', 'method', 'constructor'].includes(node.kind)) {
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
      name: node.name,
      kind: node.kind,
      type: node.type || node.returnType || '',
      scope: scopePath,
      modifiers: node.modifiers,
      lexicalLevel: depth,
      category: getCategory(node.kind, node.modifiers),
      returnType,
      parameters: paramStr,
    });
  }

  for (const child of node.children ?? []) {
    symbols.push(...collectSymbolsFromTree(child, scopePath, depth + 1));
  }

  return symbols;
}

function filterSymbols(symbols: SymbolEntry[], query: string, category: string): SymbolEntry[] {
  return symbols.filter(sym => {
    const q = query.toLowerCase();
    const matchesSearch =
      !q ||
      sym.name.toLowerCase().includes(q) ||
      sym.type.toLowerCase().includes(q) ||
      sym.scope.toLowerCase().includes(q) ||
      (sym.category || '').toLowerCase().includes(q);
    const matchesCategory = category === 'all' || sym.category === category;
    return matchesSearch && matchesCategory;
  });
}

const SymbolExplorer: React.FC<SymbolExplorerProps> = ({ symbolTableJson }) => {
  const { t } = useTranslation();
  const [symbols, setSymbols] = useState<SymbolEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    const tree = parseScopeTree(symbolTableJson);
    setSymbols(collectSymbolsFromTree(tree, '', 0));
  }, [symbolTableJson]);

  const filteredSymbols = filterSymbols(symbols, searchQuery, categoryFilter);

  if (!symbolTableJson) {
    return (
      <div className="flex items-center justify-center h-64 text-[var(--color-text-muted)] text-sm font-mono">
        {t('semantic.noSymbolTable')}
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            type="text"
            placeholder={t('semantic.searchSymbols', 'Search symbols...')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-7 pr-2 py-1.5 text-xs font-mono bg-[var(--color-surface)] border border-[var(--color-border)] rounded focus:outline-none focus:border-[var(--color-neon)] text-[var(--color-text)]"
          />
        </div>
        <div className="flex items-center gap-1 text-[10px] font-mono">
          <Filter size={10} className="text-[var(--color-text-muted)]" />
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-2 py-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded text-[var(--color-text)] font-mono text-xs"
          >
            <option value="all">All categories</option>
            <option value="variable">variable</option>
            <option value="constant">constant</option>
            <option value="function">function</option>
            <option value="parameter">parameter</option>
          </select>
        </div>
      </div>

      {/* Symbol count */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-[var(--color-text-muted)] font-display">
          Symbol Table
        </span>
        <span className="text-[9px] font-mono text-[var(--color-amber)]">
          {filteredSymbols.length}/{symbols.length} {t('semantic.symbolsMatch', 'symbols match')}
        </span>
      </div>

      {/* Symbol Table — same 7-column order as Symbol Collection: Name, Type, Category, Scope, Lexical Level, Return Type, Parameter */}
      <div className="border border-[var(--color-border-bright)] rounded-lg overflow-hidden bg-[var(--color-card)]">
        <div className="overflow-auto max-h-[560px]">
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
              {filteredSymbols.map((sym, i) => (
                <tr
                  key={`${sym.scope}-${sym.name}-${i}`}
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
                  <td className="px-3 py-2 text-[var(--color-text-muted)] whitespace-nowrap max-w-[160px] truncate" title={sym.parameters || ''}>
                    {sym.parameters || '—'}
                  </td>
                </tr>
              ))}
              {filteredSymbols.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[var(--color-text-muted)] text-xs font-mono">
                    {searchQuery || categoryFilter !== 'all' ? 'No symbols match filter.' : t('semantic.noSymbols')}
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

export default SymbolExplorer;
