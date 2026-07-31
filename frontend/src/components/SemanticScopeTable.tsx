import React, { useState, useMemo } from 'react';
import { Search, Filter, Database } from 'lucide-react';

interface SemanticScopeTableProps {
  symbolTableJson: string;
}

export interface SymbolEntry {
  id: string;
  name: string;
  kind: 'package' | 'import' | 'class' | 'interface' | 'enum' | 'record' | 'annotation' | 'method' | 'constructor' | 'field' | 'parameter' | 'local' | 'unknown';
  type: string;
  scope: string;
  modifiers: string[];
  details?: string;
  initializerPresent?: boolean;
}

function parseSymbols(jsonStr: string): SymbolEntry[] {
  try {
    const data = JSON.parse(jsonStr);
    if (!data || data.error) return [];

    const symbols: SymbolEntry[] = [];
    let counter = 0;

    const pkg = data.package || 'Default Package';
    symbols.push({
      id: `sym-${++counter}`,
      name: pkg,
      kind: 'package',
      type: 'package',
      scope: 'Global',
      modifiers: [],
    });

    if (data.imports) {
      data.imports.forEach((imp: any) => {
        symbols.push({
          id: `sym-${++counter}`,
          name: imp.name,
          kind: 'import',
          type: 'import',
          scope: pkg,
          modifiers: imp.static ? ['static'] : [],
          details: imp.asterisk ? 'wildcard import' : undefined,
        });
      });
    }

    if (data.types) {
      data.types.forEach((typeObj: any) => {
        const typeScope = `${pkg}.${typeObj.name}`;
        symbols.push({
          id: `sym-${++counter}`,
          name: typeObj.name,
          kind: typeObj.kind || 'class',
          type: typeObj.kind || 'class',
          scope: pkg,
          modifiers: typeObj.modifiers || [],
          details: [
            typeObj.extends ? `extends ${typeObj.extends.join(', ')}` : '',
            typeObj.implements ? `implements ${typeObj.implements.join(', ')}` : '',
          ].filter(Boolean).join(' • '),
        });

        if (typeObj.members) {
          typeObj.members.forEach((member: any) => {
            if (member.kind === 'method' || member.kind === 'constructor') {
              const methodScope = `${typeScope}.${member.name}()`;
              const returnType = member.returnType?.name || (member.kind === 'constructor' ? typeObj.name : 'void');

              symbols.push({
                id: `sym-${++counter}`,
                name: member.name,
                kind: member.kind,
                type: returnType,
                scope: typeScope,
                modifiers: member.modifiers || [],
                details: member.throws ? `throws ${member.throws.join(', ')}` : undefined,
              });

              if (member.parameters) {
                member.parameters.forEach((param: any) => {
                  symbols.push({
                    id: `sym-${++counter}`,
                    name: param.name,
                    kind: 'parameter',
                    type: param.type?.name || 'var',
                    scope: methodScope,
                    modifiers: param.modifiers || [],
                  });
                });
              }

              if (member.localVariables) {
                member.localVariables.forEach((localVar: any) => {
                  symbols.push({
                    id: `sym-${++counter}`,
                    name: localVar.name,
                    kind: 'local',
                    type: localVar.type?.name || 'var',
                    scope: methodScope,
                    modifiers: [],
                    initializerPresent: localVar.initializerPresent,
                  });
                });
              }
            } else if (member.kind === 'field') {
              const vars = member.variables || [];
              vars.forEach((v: any) => {
                symbols.push({
                  id: `sym-${++counter}`,
                  name: v.name,
                  kind: 'field',
                  type: v.type?.name || 'var',
                  scope: typeScope,
                  modifiers: member.modifiers || [],
                  initializerPresent: v.initializerPresent,
                });
              });
            }
          });
        }
      });
    }

    return symbols;
  } catch {
    return [];
  }
}

const KIND_BADGES: Record<string, { bg: string; text: string; border: string }> = {
  package: { bg: 'rgba(86, 156, 214, 0.15)', text: '#569CD6', border: 'rgba(86, 156, 214, 0.4)' },
  import: { bg: 'rgba(106, 153, 85, 0.15)', text: '#6A9955', border: 'rgba(106, 153, 85, 0.4)' },
  class: { bg: 'rgba(78, 201, 176, 0.15)', text: '#4EC9B0', border: 'rgba(78, 201, 176, 0.4)' },
  interface: { bg: 'rgba(78, 201, 176, 0.15)', text: '#4EC9B0', border: 'rgba(78, 201, 176, 0.4)' },
  enum: { bg: 'rgba(78, 201, 176, 0.15)', text: '#4EC9B0', border: 'rgba(78, 201, 176, 0.4)' },
  record: { bg: 'rgba(78, 201, 176, 0.15)', text: '#4EC9B0', border: 'rgba(78, 201, 176, 0.4)' },
  method: { bg: 'rgba(220, 220, 170, 0.15)', text: '#DCDCAA', border: 'rgba(220, 220, 170, 0.4)' },
  constructor: { bg: 'rgba(220, 220, 170, 0.15)', text: '#DCDCAA', border: 'rgba(220, 220, 170, 0.4)' },
  field: { bg: 'rgba(0, 212, 255, 0.15)', text: '#00D4FF', border: 'rgba(0, 212, 255, 0.4)' },
  parameter: { bg: 'rgba(156, 220, 254, 0.15)', text: '#9CDCFE', border: 'rgba(156, 220, 254, 0.4)' },
  local: { bg: 'rgba(0, 255, 136, 0.15)', text: '#00FF88', border: 'rgba(0, 255, 136, 0.4)' },
  unknown: { bg: 'rgba(128, 128, 128, 0.15)', text: '#A0A0A0', border: 'rgba(128, 128, 128, 0.4)' },
};

function getBadgeStyle(kind: string) {
  return KIND_BADGES[kind] || KIND_BADGES.unknown;
}

const SemanticScopeTable: React.FC<SemanticScopeTableProps> = ({ symbolTableJson }) => {
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<string>('all');
  const [selectedSymbolId, setSelectedSymbolId] = useState<string | null>(null);

  const symbols = useMemo(() => parseSymbols(symbolTableJson), [symbolTableJson]);

  const filteredSymbols = useMemo(() => {
    return symbols.filter(sym => {
      const matchesSearch =
        search === '' ||
        sym.name.toLowerCase().includes(search.toLowerCase()) ||
        sym.type.toLowerCase().includes(search.toLowerCase()) ||
        sym.scope.toLowerCase().includes(search.toLowerCase());

      if (!matchesSearch) return false;

      if (kindFilter === 'all') return true;
      if (kindFilter === 'types') return ['class', 'interface', 'enum', 'record', 'annotation'].includes(sym.kind);
      if (kindFilter === 'methods') return ['method', 'constructor'].includes(sym.kind);
      if (kindFilter === 'variables') return ['field', 'parameter', 'local'].includes(sym.kind);
      if (kindFilter === 'imports') return ['package', 'import'].includes(sym.kind);
      return true;
    });
  }, [symbols, search, kindFilter]);

  const selectedSymbol = useMemo(
    () => symbols.find(s => s.id === selectedSymbolId) || null,
    [symbols, selectedSymbolId]
  );

  const stats = useMemo(() => {
    return {
      total: symbols.length,
      types: symbols.filter(s => ['class', 'interface', 'enum', 'record'].includes(s.kind)).length,
      methods: symbols.filter(s => ['method', 'constructor'].includes(s.kind)).length,
      fields: symbols.filter(s => s.kind === 'field').length,
      vars: symbols.filter(s => ['parameter', 'local'].includes(s.kind)).length,
    };
  }, [symbols]);

  if (symbols.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-muted)] text-xs font-mono">
        <Database size={40} className="text-[var(--color-neon)] opacity-30 mb-3" />
        No semantic symbols found in symbol table.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-3 bg-[var(--color-void)]">
      {/* Control Header */}
      <div className="flex flex-wrap justify-between items-center gap-3 px-4 py-2 bg-[var(--color-card)] border border-[var(--color-border)] rounded-md shrink-0">
        {/* Kind Filters */}
        <div className="flex items-center gap-1.5 text-xs font-mono">
          <span className="text-[var(--color-text-muted)] flex items-center gap-1 text-[11px]">
            <Filter size={12} /> Filter:
          </span>
          {[
            { id: 'all', label: `All (${stats.total})` },
            { id: 'types', label: `Types (${stats.types})` },
            { id: 'methods', label: `Methods (${stats.methods})` },
            { id: 'variables', label: `Vars (${stats.fields + stats.vars})` },
            { id: 'imports', label: 'Imports' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setKindFilter(tab.id)}
              className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-all ${
                kindFilter === tab.id
                  ? 'bg-[rgba(0,255,136,0.1)] text-[var(--color-neon)] border-[var(--color-neon)]'
                  : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border)] hover:text-[var(--color-text)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-2.5 text-[var(--color-text-muted)]" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="$ search symbols or types..."
              className="pl-8 pr-3 py-1 text-xs font-mono bg-[var(--color-void)] text-[var(--color-neon)] border border-[var(--color-border)] rounded outline-none focus:border-[var(--color-neon)] w-[220px]"
            />
          </div>
        </div>
      </div>

      {/* Scope Table */}
      <div className="flex-1 min-h-0 bg-[var(--color-card)] border border-[var(--color-border)] rounded-md overflow-auto relative">
        <table className="w-full text-left border-collapse text-xs font-mono">
          <thead>
            <tr className="bg-[var(--color-surface)] border-b border-[var(--color-border)] text-[10px] font-display uppercase tracking-wider text-[var(--color-text-muted)] sticky top-0 z-10">
              <th className="py-2.5 px-4 font-bold">SYMBOL</th>
              <th className="py-2.5 px-3 font-bold">KIND</th>
              <th className="py-2.5 px-3 font-bold">TYPE / RETURN</th>
              <th className="py-2.5 px-4 font-bold">SCOPE</th>
              <th className="py-2.5 px-3 font-bold">MODIFIERS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]/50">
            {filteredSymbols.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[var(--color-text-muted)]">
                  No symbols matching "{search}"
                </td>
              </tr>
            ) : (
              filteredSymbols.map(sym => {
                const badge = getBadgeStyle(sym.kind);
                const isSelected = selectedSymbolId === sym.id;

                return (
                  <tr
                    key={sym.id}
                    onClick={() => setSelectedSymbolId(sym.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[rgba(0,255,136,0.08)]'
                        : 'hover:bg-[var(--color-surface-2)]'
                    }`}
                  >
                    {/* Symbol Name */}
                    <td className="py-2 px-4 font-bold text-[var(--color-text)]">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: badge.text }} />
                        <span className={isSelected ? 'text-[var(--color-neon)]' : ''}>{sym.name}</span>
                        {sym.initializerPresent && (
                          <span className="text-[9px] text-[var(--color-amber)] bg-[rgba(255,176,0,0.1)] px-1 rounded" title="Has Initializer">
                            =
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Kind Badge */}
                    <td className="py-2 px-3">
                      <span
                        className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
                        style={{
                          backgroundColor: badge.bg,
                          color: badge.text,
                          border: `1px solid ${badge.border}`,
                        }}
                      >
                        {sym.kind}
                      </span>
                    </td>

                    {/* Type */}
                    <td className="py-2 px-3 text-[var(--color-cyan)]">
                      {sym.type}
                    </td>

                    {/* Scope */}
                    <td className="py-2 px-4 text-[var(--color-text-muted)] text-[11px]">
                      {sym.scope}
                    </td>

                    {/* Modifiers */}
                    <td className="py-2 px-3">
                      <div className="flex gap-1 flex-wrap">
                        {sym.modifiers.length === 0 ? (
                          <span className="text-[var(--color-text-muted)] text-[10px] italic">package-private</span>
                        ) : (
                          sym.modifiers.map(m => (
                            <span
                              key={m}
                              className="px-1.5 py-0.2 text-[9px] font-mono bg-[var(--color-surface-2)] text-[var(--color-magenta)] border border-[var(--color-magenta)]/30 rounded"
                            >
                              {m}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Selected Symbol Inspector Drawer */}
      {selectedSymbol && (
        <div className="p-4 bg-[var(--color-card)] border border-[var(--color-neon)]/40 rounded-md shadow-lg flex flex-col gap-2 shrink-0 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex justify-between items-center border-b border-[var(--color-border)] pb-2">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold font-display tracking-wider text-[var(--color-neon)] uppercase">
                RESOLVED SYMBOL DETAIL:
              </span>
              <span className="px-2.5 py-0.5 text-xs font-bold font-mono text-[var(--color-text)] bg-[var(--color-void)] border border-[var(--color-border)] rounded">
                {selectedSymbol.name}
              </span>
              <span
                className="px-2 py-0.5 text-[10px] font-mono rounded font-bold uppercase"
                style={{
                  backgroundColor: getBadgeStyle(selectedSymbol.kind).bg,
                  color: getBadgeStyle(selectedSymbol.kind).text,
                }}
              >
                [{selectedSymbol.kind}]
              </span>
            </div>

            <div className="text-xs font-mono text-[var(--color-text-muted)]">
              Scope: <span className="text-[var(--color-neon)]">{selectedSymbol.scope}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono pt-1">
            <div className="md:col-span-2 flex flex-col gap-1">
              <span className="text-[10px] font-bold text-[var(--color-text-muted)] tracking-wider uppercase font-display">
                TYPE & SIGNATURE
              </span>
              <div className="p-2.5 bg-[var(--color-void)] border border-[var(--color-border)] rounded text-[var(--color-cyan)] font-bold">
                {selectedSymbol.modifiers.join(' ')} {selectedSymbol.type} {selectedSymbol.name}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-[var(--color-text-muted)] tracking-wider uppercase font-display">
                PROPERTIES
              </span>
              <div className="p-2.5 bg-[var(--color-void)] border border-[var(--color-border)] rounded text-[var(--color-text-muted)] flex flex-col gap-1 text-[11px]">
                <div>
                  <span className="text-[var(--color-text)] font-bold">Scope Path: </span>
                  {selectedSymbol.scope}
                </div>
                {selectedSymbol.details && (
                  <div>
                    <span className="text-[var(--color-amber)] font-bold">Details: </span>
                    {selectedSymbol.details}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SemanticScopeTable;
