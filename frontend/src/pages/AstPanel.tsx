import React from 'react';
import { useTranslation } from 'react-i18next';
import { useCompile } from '../context/CompileContext';
import { TreePine } from 'lucide-react';
import AstTree from '../components/AstTree';
import Skeleton from '../components/Skeleton';
import ErrorBoundary from '../components/ErrorBoundary';

const AstPanel: React.FC = () => {
  const { t } = useTranslation();
  const { result, loading } = useCompile();

  if (loading) {
    return (
      <div className="flex flex-col h-full gap-4">
        <div className="flex flex-col gap-2 p-4 bg-[var(--color-card)] border border-[var(--color-border)] flex-1">
          <Skeleton count={15} height="16px" />
        </div>
      </div>
    );
  }

  if (!result?.astJson) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-muted)] text-[13px] font-mono">
        <TreePine size={48} className="text-[var(--color-neon)] opacity-30 mb-4" />
        {t('ast.noAst')}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4">
      <ErrorBoundary name="AST Tree" inline>
        <AstTree astJson={result.astJson} />
      </ErrorBoundary>
    </div>
  );
};

export default AstPanel;
