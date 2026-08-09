import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useCompile } from '../context/CompileContext';
import { Search } from 'lucide-react';
import type { PlayState } from '../lib/lexer/types';
import StepControls from '../components/lexical/StepControls';
import PipelineConnector from '../components/lexical/PipelineConnector';
import ScopeTree from '../components/semantic/ScopeTree';
import SymbolCollector from '../components/semantic/SymbolCollector';
import TypeResolutionFlow from '../components/semantic/TypeResolutionFlow';
import TypeCheckingMatrix from '../components/semantic/TypeCheckingMatrix';
import ErrorReportPanel from '../components/semantic/ErrorReportPanel';
import SymbolExplorer from '../components/semantic/SymbolExplorer';
import ErrorBoundary from '../components/ErrorBoundary';

const STEP_DELAYS = [3000, 4000, 5000, 8000, 4000]; // ms per step during autoplay
const SEMANTIC_STEP_NAMES = ['Scopes', 'Symbols', 'Resolution', 'Checking', 'Errors'];

const SemanticAnalysisPanel: React.FC = () => {
  const { t } = useTranslation();
  const { result, loading } = useCompile();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('view') === 'static' ? 'explorer' : 'pipeline';
  const [currentStep, setCurrentStep] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [playState, setPlayState] = useState<PlayState>('idle');
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const autoplayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoplayTimer.current) clearTimeout(autoplayTimer.current);
    };
  }, []);

  const scrollToStep = useCallback((step: number) => {
    const el = stepRefs.current[step];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  const handlePlay = useCallback(() => {
    setPlayState('playing');
    setCurrentStep(0);
    setCompletedSteps(new Set());
    scrollToStep(0);

    let step = 0;
    const advance = () => {
      setCompletedSteps(prev => new Set(prev).add(step));
      if (step < 4) {
        step++;
        setCurrentStep(step as 0 | 1 | 2 | 3 | 4);
        scrollToStep(step);
        autoplayTimer.current = setTimeout(advance, STEP_DELAYS[step]);
      } else {
        setPlayState('completed');
      }
    };
    autoplayTimer.current = setTimeout(advance, STEP_DELAYS[0]);
  }, [scrollToStep]);

  const handlePause = useCallback(() => {
    setPlayState('paused');
    if (autoplayTimer.current) {
      clearTimeout(autoplayTimer.current);
      autoplayTimer.current = null;
    }
  }, []);

  const handleNext = useCallback(() => {
    if (currentStep < 4) {
      const next = (currentStep + 1) as 0 | 1 | 2 | 3 | 4;
      setCompletedSteps(prev => new Set(prev).add(currentStep));
      setCurrentStep(next);
      scrollToStep(next);
    }
  }, [currentStep, scrollToStep]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      const prev = (currentStep - 1) as 0 | 1 | 2 | 3 | 4;
      setCurrentStep(prev);
      scrollToStep(prev);
    }
  }, [currentStep, scrollToStep]);

  const handleRestart = useCallback(() => {
    if (autoplayTimer.current) {
      clearTimeout(autoplayTimer.current);
      autoplayTimer.current = null;
    }
    setPlayState('idle');
    setCurrentStep(0);
    setCompletedSteps(new Set());
    scrollToStep(0);
  }, [scrollToStep]);

  const handleScroll = useCallback(() => {
    if (playState === 'playing') return;
    const container = stepRefs.current[0]?.parentElement;
    if (!container) return;
    for (let i = 0; i < 5; i++) {
      const el = stepRefs.current[i];
      if (el) {
        const rect = el.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const relativeTop = rect.top - containerRect.top;
        if (relativeTop > -100 && relativeTop < containerRect.height / 2) {
          setCurrentStep(i as 0 | 1 | 2 | 3 | 4);
          break;
        }
      }
    }
  }, [playState]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-[var(--color-text-muted)] font-mono text-sm animate-pulse">
          {t('editor.compiling')}...
        </div>
      </div>
    );
  }

  if (!result?.symbolTableJson || result.symbolTableJson.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-muted)] text-center gap-3">
        <Search size={48} className="text-[var(--color-neon)] opacity-30" />
        <div className="font-mono text-sm">{t('semantic.noSymbolTable')}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {activeTab === 'pipeline' ? (
        <>
          {/* Scrollable pipeline */}
          <div
            className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-2"
            onScroll={handleScroll}
          >
            {/* Step 1: Scope Tree Construction */}
            <div ref={(el) => { stepRefs.current[0] = el; }}>
              <ErrorBoundary name="ScopeTree">
                <ScopeTree
                  symbolTableJson={result.symbolTableJson}
                  isPlaying={playState === 'playing' && currentStep === 0}
                  isCompleted={completedSteps.has(0) || playState === 'completed'}
                />
              </ErrorBoundary>
            </div>

            <PipelineConnector active={completedSteps.has(0) || currentStep >= 1} />

            {/* Step 2: Symbol Collection */}
            <div ref={(el) => { stepRefs.current[1] = el; }}>
              <ErrorBoundary name="SymbolCollector">
                <SymbolCollector
                  symbolTableJson={result.symbolTableJson}
                  isPlaying={playState === 'playing' && currentStep === 1}
                  isCompleted={completedSteps.has(1) || playState === 'completed'}
                />
              </ErrorBoundary>
            </div>

            <PipelineConnector active={completedSteps.has(1) || currentStep >= 2} />

            {/* Step 3: Type Resolution */}
            <div ref={(el) => { stepRefs.current[2] = el; }}>
              <ErrorBoundary name="TypeResolutionFlow">
                <TypeResolutionFlow
                  symbolTableJson={result.symbolTableJson}
                  isPlaying={playState === 'playing' && currentStep === 2}
                  isCompleted={completedSteps.has(2) || playState === 'completed'}
                />
              </ErrorBoundary>
            </div>

            <PipelineConnector active={completedSteps.has(2) || currentStep >= 3} />

            {/* Step 4: Type Checking */}
            <div ref={(el) => { stepRefs.current[3] = el; }}>
              <ErrorBoundary name="TypeCheckingMatrix">
                <TypeCheckingMatrix
                  symbolTableJson={result.symbolTableJson}
                  isPlaying={playState === 'playing' && currentStep === 3}
                  isCompleted={completedSteps.has(3) || playState === 'completed'}
                />
              </ErrorBoundary>
            </div>

            <PipelineConnector active={completedSteps.has(3) || currentStep >= 4} />

            {/* Step 5: Error Reporting */}
            <div ref={(el) => { stepRefs.current[4] = el; }}>
              <ErrorBoundary name="ErrorReportPanel">
                <ErrorReportPanel
                  symbolTableJson={result.symbolTableJson}
                  isPlaying={playState === 'playing' && currentStep === 4}
                  isCompleted={completedSteps.has(4) || playState === 'completed'}
                />
              </ErrorBoundary>
            </div>
          </div>

          {/* Sticky controls */}
          <StepControls
            currentStep={currentStep}
            playState={playState}
            stepNames={SEMANTIC_STEP_NAMES}
            totalSteps={5}
            onPlay={handlePlay}
            onPause={handlePause}
            onNext={handleNext}
            onPrev={handlePrev}
            onRestart={handleRestart}
          />
        </>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto p-4">
          <ErrorBoundary name="SymbolExplorer">
            <SymbolExplorer symbolTableJson={result.symbolTableJson} />
          </ErrorBoundary>
        </div>
      )}
    </div>
  );
};

export default SemanticAnalysisPanel;
