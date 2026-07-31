import React from 'react';
import { useTranslation } from 'react-i18next';
import { useCompile } from '../context/CompileContext';
import { Code2 } from 'lucide-react';
import Skeleton from '../components/Skeleton';

const TacPanel: React.FC = () => {
  const { t } = useTranslation();
  const { result, loading } = useCompile();

  if (loading) {
    return (
      <div className="flex flex-col h-full gap-4">
        <div className="flex justify-between items-center">
          <Skeleton width="200px" height="20px" />
        </div>
        <div className="flex flex-col gap-1.5 p-4 bg-[var(--color-card)] border border-[var(--color-border)] flex-1 font-mono">
          <Skeleton count={20} height="14px" />
        </div>
      </div>
    );
  }

  if (!result?.tacJson) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-muted)] text-[13px] font-mono">
        <Code2 size={48} className="text-[var(--color-neon)] opacity-30 mb-4" />
        {t('tac.noTac')}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex justify-between items-center shrink-0">
        <h2 className="text-sm font-bold text-[var(--color-text)] font-display tracking-[0.12em] uppercase">
          Three-Address Code (IR)
        </h2>
      </div>
      <pre className="flex-1 font-mono text-xs leading-[1.7] text-[var(--color-neon)] bg-[var(--color-card)] border border-[var(--color-border)] p-4 overflow-auto whitespace-pre-wrap break-all m-0 hover:border-[var(--color-neon)] hover:shadow-[0_0_10px_var(--color-neon-dim)]">
        {result.tacJson}
      </pre>
    </div>
  );
};

export default TacPanel;
