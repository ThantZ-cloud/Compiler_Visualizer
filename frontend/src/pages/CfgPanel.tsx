import React from 'react';
import { useCompile } from '../context/CompileContext';
import { GitFork } from 'lucide-react';
import CfgGraph from '../components/CfgGraph';
import Skeleton from '../components/Skeleton';

const CfgPanel: React.FC = () => {
  const { result, loading } = useCompile();

  if (loading) {
    return (
      <div className="flex flex-col h-full gap-4">
        <div className="flex justify-between items-center">
          <Skeleton width="200px" height="20px" />
          <Skeleton width="150px" height="32px" />
        </div>
        <div className="flex flex-col gap-2 p-4 bg-[var(--color-card)] border border-[var(--color-border)] flex-1">
          <Skeleton count={12} height="16px" />
        </div>
      </div>
    );
  }

  if (!result?.cfgJson) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-muted)] text-[13px] font-mono">
        <GitFork size={48} className="text-[var(--color-neon)] opacity-30 mb-4" />
        No control flow graph generated
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4">
      <CfgGraph cfgJson={result.cfgJson} />
    </div>
  );
};

export default CfgPanel;
