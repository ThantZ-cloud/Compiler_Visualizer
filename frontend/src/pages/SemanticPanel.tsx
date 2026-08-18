import React from 'react';
import { useTranslation } from 'react-i18next';
import { useCompile } from '../context/CompileContext';
import { Database } from 'lucide-react';
import Skeleton from '../components/Skeleton';
import ErrorBoundary from '../components/ErrorBoundary';

interface SymbolRow {
  kind: string;
  name: string;
  modifiers: string;
  type: string;
  parent: string;
  details: string;
}

function parseSymbolTable(jsonStr: string): SymbolRow[] {
  try {
    const data = JSON.parse(jsonStr) as SymbolTableJson;
    if (data.error) return [];
    const rows: SymbolRow[] = [];

    interface SymbolImport {
  name?: string;
  static?: boolean;
  asterisk?: boolean;
}

interface SymbolTypeRef {
  name?: string;
}

interface SymbolVariable {
  name?: string;
  type?: SymbolTypeRef;
  initializerPresent?: boolean;
}

interface SymbolMember {
  kind?: string;
  name?: string;
  modifiers?: string[];
  returnType?: SymbolTypeRef;
  parameters?: { name?: string; type?: SymbolTypeRef }[];
  throws?: string[];
  extends?: string[];
  implements?: string[];
  constants?: { name?: string }[];
  variables?: SymbolVariable[];
  static?: boolean;
}

interface SymbolType {
  kind?: string;
  name?: string;
  modifiers?: string[];
  extends?: string[];
  implements?: string[];
  constants?: { name?: string }[];
  members?: SymbolMember[];
}

interface SymbolTableJson {
  error?: boolean;
  package?: string;
  imports?: SymbolImport[];
  types?: SymbolType[];
}

// package
    if (data.package) {
      rows.push({
        kind: 'package',
        name: data.package,
        modifiers: '',
        type: '',
        parent: '',
        details: '',
      });
    }

    // imports
    if (data.imports) {
      data.imports.forEach((imp) => {
        rows.push({
          kind: 'import',
          name: imp.name || '',
          modifiers: imp.static ? 'static' : '',
          type: '',
          parent: data.package || '',
          details: imp.asterisk ? '(wildcard)' : '',
        });
      });
    }

    // types and their members
    if (data.types) {
      data.types.forEach((type) => {
        rows.push({
          kind: type.kind || '',
          name: type.name || '',
          modifiers: (type.modifiers || []).join(' '),
          type: [
            ...(type.extends || []).map((e) => `extends ${e}`),
            ...(type.implements || []).map((i) => `implements ${i}`),
          ].join(', ') || '',
          parent: data.package || '',
          details: type.constants
            ? type.constants.map((c) => (c.name || '')).join(', ')
            : '',
        });

        if (type.members) {
          type.members.forEach((member) => {
            if (member.kind === 'method' || member.kind === 'constructor') {
              const params = (member.parameters || [])
                .map((p) => `${p.type?.name || 'var'} ${p.name || ''}`.trim())
                .join(', ');
              const retType = member.returnType?.name || '';
              rows.push({
                kind: member.kind,
                name: `${member.name || ''}(${params})`,
                modifiers: (member.modifiers || []).join(' '),
                type: retType,
                parent: type.name || '',
                details: (member.throws || []).join(', ') || '',
              });
            } else if (member.kind === 'field') {
              (member.variables || []).forEach((v) => {
                rows.push({
                  kind: 'field',
                  name: v.name || '',
                  modifiers: (member.modifiers || []).join(' '),
                  type: v.type?.name || 'var',
                  parent: type.name || '',
                  details: v.initializerPresent ? '= ...' : '',
                });
              });
            } else if (member.kind === 'initializer') {
              rows.push({
                kind: 'initializer',
                name: member.static ? 'static { ... }' : '{ ... }',
                modifiers: '',
                type: '',
                parent: type.name || '',
                details: '',
              });
            } else if (member.kind) {
              // inner class/interface/enum
              rows.push({
                kind: member.kind,
                name: member.name || '',
                modifiers: (member.modifiers || []).join(' '),
                type: '',
                parent: type.name || '',
                details: '',
              });
            }
          });
        }
      });
    }

    return rows;
  } catch {
    return [];
  }
}

const KIND_COLORS: Record<string, string> = {
  package: '#569cd6',
  import: '#6a9955',
  class: '#4ec9b0',
  interface: '#4ec9b0',
  enum: '#4ec9b0',
  record: '#4ec9b0',
  method: '#dcdcaa',
  constructor: '#dcdcaa',
  field: '#569cd6',
  initializer: '#c586c0',
};

const SemanticPanel: React.FC = () => {
  const { t } = useTranslation();
  const { result, loading } = useCompile();

  if (loading) {
    return (
      <div className="flex flex-col h-full gap-4">
        <div className="flex justify-between items-center">
          <Skeleton width="150px" height="20px" />
        </div>
        <div className="flex flex-col gap-2 p-4 bg-[var(--color-card)] border border-[var(--color-border)] flex-1">
          <Skeleton count={12} height="16px" />
        </div>
      </div>
    );
  }

  if (!result?.symbolTableJson) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-muted)] text-[13px] font-mono">
        <Database size={48} className="text-[var(--color-neon)] opacity-30 mb-4" />
        {t('semantic.noSymbolTable')}
      </div>
    );
  }

  const rows = parseSymbolTable(result.symbolTableJson);

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex justify-between items-center shrink-0">
        <h2 className="text-sm font-bold text-[var(--color-text)] font-display tracking-[0.12em] uppercase">
          Symbol Table
        </h2>
        <span className="text-[10px] text-[var(--color-text-muted)] font-mono">
          {rows.length} {t('semantic.entries')}
        </span>
      </div>

      <ErrorBoundary name="Symbol Table" inline>
        <div className="flex-1 overflow-auto border border-[var(--color-border)] bg-[var(--color-card)]">
          <table className="w-full border-collapse text-xs font-mono">
            <thead>
              <tr className="sticky top-0 bg-[var(--color-surface-2)] border-b border-[var(--color-border)]">
                <th className="text-left px-4 py-2.5 text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]">{t('semantic.kind')}</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]">{t('semantic.name')}</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]">{t('semantic.modifiers')}</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]">{t('semantic.type')}</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]">{t('semantic.parent')}</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]">{t('semantic.details')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface)] transition-colors"
                >
                  <td className="px-4 py-2 whitespace-nowrap">
                    <span
                      className="inline-block px-1.5 py-0.5 text-[10px] font-bold rounded"
                      style={{
                        color: KIND_COLORS[row.kind] || '#d4d4d4',
                        background: `${KIND_COLORS[row.kind] || '#d4d4d4'}15`,
                      }}
                    >
                      {row.kind}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-[var(--color-neon)] whitespace-nowrap">{row.name}</td>
                  <td className="px-4 py-2 text-[var(--color-text-dim)] whitespace-nowrap">{row.modifiers || '—'}</td>
                  <td className="px-4 py-2 text-[var(--color-cyan)] whitespace-nowrap">{row.type || '—'}</td>
                  <td className="px-4 py-2 text-[var(--color-text-muted)] whitespace-nowrap">{row.parent || '—'}</td>
                  <td className="px-4 py-2 text-[var(--color-text-muted)] whitespace-nowrap">{row.details || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ErrorBoundary>
    </div>
  );
};

export default SemanticPanel;
