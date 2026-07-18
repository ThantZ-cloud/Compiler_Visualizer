import React, { Suspense, lazy } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const PipelineScene = lazy(() => import('../components/PipelineScene'));

const PipelinePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Go back to editor if user came from there, otherwise landing
  const backTarget = location.state?.from === '/compiler' ? '/compiler' : '/';

  return (
    <div className="flex flex-col h-full bg-[var(--color-void)]">
      {/* Header bar */}
      <div className="flex items-center gap-4 px-6 py-3 border-b border-[var(--color-border)]">
        <button
          className="text-[var(--color-text-dim)] hover:text-[var(--color-neon)] transition-colors text-xs tracking-[0.1em]"
          style={{ fontFamily: 'var(--font-mono)' }}
          onClick={() => navigate(backTarget)}
        >
          {'<- BACK'}
        </button>
        <span className="text-[10px] font-bold text-[var(--color-neon)] tracking-[0.3em] uppercase"
          style={{ fontFamily: 'var(--font-display)' }}>
          {'< '} PIPELINE {' />'}
        </span>
      </div>

      {/* 3D Scene */}
      <div className="flex-1 w-full min-h-0">
        <Suspense fallback={
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-[var(--color-neon)] text-xs font-bold tracking-[0.2em] animate-pulse"
                style={{ fontFamily: 'var(--font-display)' }}>
                LOADING 3D SCENE...
              </div>
            </div>
          </div>
        }>
          <PipelineScene />
        </Suspense>
      </div>
    </div>
  );
};

export default PipelinePage;
