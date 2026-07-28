import React from 'react';
import { useCompile } from '../context/CompileContext';
import { Database } from 'lucide-react';
import Skeleton from '../components/Skeleton';

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
    const data = JSON.parse(jsonStr);
    if (data.error) return [];
    const rows: SymbolRow[] = [];

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
      data.imports.forEach((imp: any) => {
        rows.push({
          kind: 'import',
          name: imp.name,
          modifiers: imp.static ? 'static' : '',
          type: '',
          parent: data.package || '',
          details: imp.asterisk ? '(wildcard)' : '',
        });
      });
    }

    // types and their members
    if (data.types) {
      data.types.forEach((type: any) => {
        rows.push({
          kind: type.kind,
          name: type.name,
          modifiers: (type.modifiers || []).join(' '),
          type: [
            ...(type.extends || []).map((e: string) => `extends ${e}`),
            ...(type.implements || []).map((i: string) => `implements ${i}`),
          ].join(', ') || '',
          parent: data.package || '',
          details: type.constants
            ? type.constants.map((c: any) => c.name).join(', ')
            : '',
        });

        if (type.members) {
          type.members.forEach((member: any) => {
            if (member.kind === 'method' || member.kind === 'constructor') {
              const params = (member.parameters || [])
                .map((p: any) => `${p.type?.name || 'var'} ${p.name}`)
                .join(', ');
              const retType = member.returnType?.name || '';
              rows.push({
                kind: member.kind,
                name: `${member.name}(${params})`,
                modifiers: (member.modifiers || []).join(' '),
                type: retType,
                parent: type.name,
                details: (member.throws || []).join(', ') || '',
              });
            } else if (member.kind === 'field') {
              (member.variables || []).forEach((v: any) => {
                rows.push({
                  kind: 'field',
                  name: v.name,
                  modifiers: (member.modifiers || []).join(' '),
                  type: v.type?.name || 'var',
                  parent: type.name,
                  details: v.initializerPresent ? '= ...' : '',
                });
              });
            } else if (member.kind === 'initializer') {
              rows.push({
                kind: 'initializer',
                name: member.static ? 'static { ... }' : '{ ... }',
                modifiers: '',
                type: '',
                parent: type.name,
                details: '',
              });
            } else if (member.kind) {
              // inner class/interface/enum
              rows.push({
                kind: member.kind,
                name: member.name,
                modifiers: (member.modifiers || []).join(' '),
                type: '',
                parent: type.name,
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
        No symbol table generated
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
          {rows.length} entries
        </span>
      </div>

      <div className="flex-1 overflow-auto border border-[var(--color-border)] bg-[var(--color-card)]">
        <table className="w-full border-collapse text-xs font-mono">
          <thead>
            <tr className="sticky top-0 bg-[var(--color-surface-2)] border-b border-[var(--color-border)]">
              <th className="text-left px-4 py-2.5 text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]">Kind</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]">Name</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]">Modifiers</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]">Type</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]">Parent</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]">Details</th>
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
    </div>
  );
};

export default SemanticPanel;
