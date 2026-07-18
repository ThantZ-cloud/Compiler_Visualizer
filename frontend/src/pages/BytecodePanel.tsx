import React from 'react';
import { useCompile } from '../context/CompileContext';
import { Binary } from 'lucide-react';
import Skeleton from '../components/Skeleton';

const BytecodePanel: React.FC = () => {
  const { result, loading } = useCompile();

  if (loading) {
    return (
      <div className="flex flex-col h-full gap-4">
        <div className="flex justify-between items-center">
          <Skeleton width="150px" height="20px" />
        </div>
        <div className="flex flex-col gap-1.5 p-4 bg-[var(--color-card)] border border-[var(--color-border)] flex-1 font-mono">
          <Skeleton count={20} height="14px" />
        </div>
      </div>
    );
  }

  if (!result?.bytecode) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-muted)] text-[13px] font-mono">
        <Binary size={48} className="text-[var(--color-neon)] opacity-30 mb-4" />
        No bytecode generated
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex justify-between items-center shrink-0">
        <h2 className="text-sm font-bold text-[var(--color-text)] font-display tracking-[0.12em] uppercase">
          JVM Bytecode
        </h2>
      </div>
      <pre className="flex-1 font-mono text-xs leading-[1.7] text-[var(--color-neon)] bg-[var(--color-card)] border border-[var(--color-border)] p-4 overflow-auto whitespace-pre-wrap break-all m-0 hover:border-[var(--color-neon)] hover:shadow-[0_0_10px_var(--color-neon-dim)]">
        {result.bytecode}
      </pre>
    </div>
  );
};

export default BytecodePanel;
