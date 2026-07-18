import React, { useState } from 'react';
import { useCompile } from '../context/CompileContext';
import { Database, TreePine, Braces } from 'lucide-react';
import SemanticTree from '../components/SemanticTree';
import Skeleton from '../components/Skeleton';

const SemanticPanel: React.FC = () => {
  const { result, loading } = useCompile();
  const [view, setView] = useState<'tree' | 'json'>('tree');

  if (loading) {
    return (
      <div className="flex flex-col h-full gap-4">
        <div className="flex justify-between items-center">
          <Skeleton width="150px" height="20px" />
          <Skeleton width="120px" height="32px" />
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

  let formatted = result.symbolTableJson;
  try {
    formatted = JSON.stringify(JSON.parse(result.symbolTableJson), null, 2);
  } catch {
    // Keep original
  }

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex justify-between items-center shrink-0">
        <h2 className="text-sm font-bold text-[var(--color-text)] font-display tracking-[0.12em] uppercase">
          Symbol Table
        </h2>
        <div className="flex gap-0.5">
          <button
            className={`px-3 py-[5px] text-[10px] font-bold tracking-[0.1em] bg-transparent border-none cursor-pointer transition-all font-display uppercase flex items-center gap-1 ${
              view === 'tree' ? 'text-[var(--color-neon)] bg-[rgba(0,255,136,0.1)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
            onClick={() => setView('tree')}
          >
            <TreePine size={10} />
            Tree
          </button>
          <button
            className={`px-3 py-[5px] text-[10px] font-bold tracking-[0.1em] bg-transparent border-none cursor-pointer transition-all font-display uppercase flex items-center gap-1 ${
              view === 'json' ? 'text-[var(--color-neon)] bg-[rgba(0,255,136,0.1)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
            onClick={() => setView('json')}
          >
            <Braces size={10} />
            JSON
          </button>
        </div>
      </div>
      {view === 'tree' ? (
        <SemanticTree symbolTableJson={result.symbolTableJson} />
      ) : (
        <pre className="flex-1 font-mono text-xs leading-[1.7] text-[var(--color-neon)] bg-[var(--color-card)] border border-[var(--color-border)] p-4 overflow-auto whitespace-pre-wrap break-all m-0 hover:border-[var(--color-neon)] hover:shadow-[0_0_10px_var(--color-neon-dim)]">
          {formatted}
        </pre>
      )}
    </div>
  );
};

export default SemanticPanel;
