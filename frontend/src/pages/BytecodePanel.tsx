import React from 'react';
import { useTranslation } from 'react-i18next';
import { useCompile } from '../context/CompileContext';
import { Binary } from 'lucide-react';
import Skeleton from '../components/Skeleton';
import ErrorBoundary from '../components/ErrorBoundary';

const BytecodePanel: React.FC = () => {
  const { t } = useTranslation();
  const { result, loading, selectedClass, setSelectedClass } = useCompile();

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
        {t('bytecode.noBytecode')}
      </div>
    );
  }

  const classes = result.classes || [];
  const bytecodeMap = result.allBytecode || {};
  const hasMultipleClasses = classes.length > 1;

  // Determine which bytecode to display
  const activeClass = selectedClass || classes[0]?.name || '';
  const displayedBytecode = hasMultipleClasses
    ? (bytecodeMap[activeClass] || result.bytecode)
    : result.bytecode;

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex justify-between items-center shrink-0">
        <h2 className="text-sm font-bold text-[var(--color-text)] font-display tracking-[0.12em] uppercase">
          JVM Bytecode
        </h2>
        {hasMultipleClasses && (
          <span className="text-[11px] text-[var(--color-text-muted)] font-mono">
            {classes.length} classes detected
          </span>
        )}
      </div>

      {/* Class selector tabs */}
      {hasMultipleClasses && (
        <div className="flex gap-1 shrink-0 overflow-x-auto">
          {classes.map((cls) => (
            <button
              key={cls.name}
              onClick={() => setSelectedClass(cls.name)}
              className={`px-3 py-1.5 text-xs font-mono rounded transition-all whitespace-nowrap ${
                activeClass === cls.name
                  ? 'bg-[var(--color-neon)] text-[var(--color-void)] font-bold'
                  : 'bg-[var(--color-card)] text-[var(--color-text-muted)] border border-[var(--color-border)] hover:border-[var(--color-neon)] hover:text-[var(--color-neon)]'
              }`}
            >
              {cls.name}
              {cls.hasMain && (
                <span className="ml-1 opacity-60">main</span>
              )}
            </button>
          ))}
        </div>
      )}

      <ErrorBoundary name="Bytecode Viewer" inline>
        <pre className="flex-1 font-mono text-xs leading-[1.7] text-[var(--color-neon)] bg-[var(--color-card)] border border-[var(--color-border)] p-4 overflow-auto whitespace-pre-wrap break-all m-0 hover:border-[var(--color-neon)] hover:shadow-[0_0_10px_var(--color-neon-dim)]">
          {displayedBytecode}
        </pre>
      </ErrorBoundary>
    </div>
  );
};

export default BytecodePanel;
