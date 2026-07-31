import React from 'react';
import { useCompile } from '../context/CompileContext';
import { Spline } from 'lucide-react';
import TokenFlow from '../components/TokenFlow';
import Skeleton from '../components/Skeleton';

const LexicalPanel: React.FC = () => {
  const { result, loading } = useCompile();

  if (loading) {
    return (
      <div className="flex flex-col h-full gap-4">
        <div className="flex justify-between items-center">
          <Skeleton width="220px" height="20px" />
          <Skeleton width="160px" height="32px" />
        </div>
        <div className="flex flex-col gap-2 p-4 bg-[var(--color-card)] border border-[var(--color-border)] flex-1">
          <Skeleton count={10} height="16px" />
        </div>
      </div>
    );
  }

  if (!result?.tokens || result.tokens.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-muted)] text-[13px] font-mono">
        <Spline size={48} className="text-[var(--color-neon)] opacity-30 mb-4" />
        No lexical tokens available
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4">
      <TokenFlow tokens={result.tokens} />
    </div>
  );
};

export default LexicalPanel;
