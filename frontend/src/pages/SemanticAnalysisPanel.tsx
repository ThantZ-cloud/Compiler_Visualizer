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
import ExampleBlock from '../components/examples/ExampleBlock';
import ErrorBoundary from '../components/ErrorBoundary';

const STEP_DELAYS = [3000, 4000, 5000, 8000, 4000];
const SEMANTIC_STEP_NAMES = ['Scopes', 'Symbols', 'Resolution', 'Checking', 'Errors'];

const SemanticAnalysisPanel: React.FC = () => {
  const { t } = useTranslation();
  const { result, loading } = useCompile();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('view') === 'static' ? 'explorer' : 'pipeline';
  const [currentStep, setCurrentStep] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [playState, setPlayState] = useState<PlayState>('idle');
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [showExamples, setShowExamples] = useState(false);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const autoplayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { return () => { if (autoplayTimer.current) clearTimeout(autoplayTimer.current); }; }, []);
  const scrollToStep = useCallback((step: number) => { const el = stepRefs.current[step]; if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, []);
  const handlePlay = useCallback(() => {
    setPlayState('playing'); setCurrentStep(0); setCompletedSteps(new Set()); scrollToStep(0);
    let step = 0;
    const advance = () => {
      setCompletedSteps(prev => new Set(prev).add(step));
      if (step < 4) { step++; setCurrentStep(step as 0 | 1 | 2 | 3 | 4); scrollToStep(step); autoplayTimer.current = setTimeout(advance, STEP_DELAYS[step]); } else setPlayState('completed');
    };
    autoplayTimer.current = setTimeout(advance, STEP_DELAYS[0]);
  }, [scrollToStep]);
  const handlePlayOnePhase = useCallback(() => {
    if (autoplayTimer.current) { clearTimeout(autoplayTimer.current); autoplayTimer.current = null; }
    let step = currentStep; while (step < 4 && completedSteps.has(step)) step++; if (completedSteps.has(step)) return;
    setCurrentStep(step as 0 | 1 | 2 | 3 | 4); setPlayState('playing'); scrollToStep(step);
    autoplayTimer.current = setTimeout(() => { setCompletedSteps(prev => new Set(prev).add(step)); setPlayState('idle'); autoplayTimer.current = null; }, STEP_DELAYS[step]);
  }, [currentStep, completedSteps, scrollToStep]);
  const handlePause = useCallback(() => { setPlayState('paused'); if (autoplayTimer.current) { clearTimeout(autoplayTimer.current); autoplayTimer.current = null; } }, []);
  const handleNext = useCallback(() => { if (currentStep < 4) { const next = (currentStep + 1) as 0 | 1 | 2 | 3 | 4; setCompletedSteps(prev => new Set(prev).add(currentStep)); setCurrentStep(next); scrollToStep(next); } }, [currentStep, scrollToStep]);
  const handlePrev = useCallback(() => { if (currentStep > 0) { setCurrentStep((currentStep - 1) as 0 | 1 | 2 | 3 | 4); scrollToStep(currentStep - 1); } }, [currentStep, scrollToStep]);
  const handleRestart = useCallback(() => { if (autoplayTimer.current) clearTimeout(autoplayTimer.current); setPlayState('idle'); setCurrentStep(0); setCompletedSteps(new Set()); scrollToStep(0); }, [scrollToStep]);
  const handleScroll = useCallback(() => {
    if (playState === 'playing') return;
    const container = stepRefs.current[0]?.parentElement; if (!container) return;
    for (let i = 0; i < 5; i++) { const el = stepRefs.current[i]; if (el) { const rect = el.getBoundingClientRect(); const containerRect = container.getBoundingClientRect(); const relativeTop = rect.top - containerRect.top; if (relativeTop > -100 && relativeTop < containerRect.height / 2) { setCurrentStep(i as 0 | 1 | 2 | 3 | 4); break; } } }
  }, [playState]);

  const SEMANTIC_EXAMPLE_STEPS = [
    { title: 'Scopes', description: 'Scopes nest like boxes inside boxes. Each { opens a new scope that can shadow outer names.', highlight: 'class A {\n  void m(){\n    int x=1;\n    { int y=x; }\n  }\n}' },
    { title: 'Symbols', description: 'Collect every name: x, y, m, A. Note shadowing — inner x hides outer x.' },
    { title: 'Resolution', description: 'Resolve System.out.println → System is a class, out is a field, println is a method. Each dot is a lookup.' },
    { title: 'Checking', description: 'Type check: String s = 1; fails — expected String, got int. Matrix turns red.' },
    { title: 'Errors', description: 'Only if error list is empty does the compiler continue. Your edit can introduce or fix an error.' },
  ];

  if (loading) return <div className="flex items-center justify-center h-full"><div className="text-[var(--color-text-muted)] font-mono text-sm animate-pulse">{t('editor.compiling')}...</div></div>;
  if (!result?.symbolTableJson || result.symbolTableJson.length === 0) return <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-muted)] text-center gap-3"><Search size={48} className="text-[var(--color-neon)] opacity-30" /><div className="font-mono text-sm">{t('semantic.noSymbolTable')}</div></div>;

  return (
    <div className="flex flex-col h-full min-h-0">
      {activeTab === 'pipeline' ? (
        <>
          <div className="flex gap-1.5 mb-3 px-1 shrink-0">
            <button onClick={() => setShowExamples(false)} className={`px-3 py-1.5 rounded text-[10px] font-mono font-bold tracking-wide border ${!showExamples ? 'bg-[var(--color-neon-dim)] text-[var(--color-neon)] border-[var(--color-neon)]' : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border-bright)]'}`}>Pipeline</button>
            <button onClick={() => setShowExamples(true)} className={`px-3 py-1.5 rounded text-[10px] font-mono font-bold tracking-wide border ${showExamples ? 'bg-[var(--color-neon-dim)] text-[var(--color-neon)] border-[var(--color-neon)]' : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border-bright)]'}`}>Examples</button>
          </div>
          {showExamples ? (
            <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 py-3"><ExampleBlock phase="Semantic" defaultCode={`class A {\n  void m() {\n    int x = 1;\n    {\n      int y = x;\n      String s = 1; // type error — try fixing to "hi"\n    }\n  }\n}`} steps={SEMANTIC_EXAMPLE_STEPS} /></div>
          ) : (
            <>
              <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 py-3 space-y-2" onScroll={handleScroll}>
                <div ref={(el) => { stepRefs.current[0] = el; }}><ErrorBoundary name="ScopeTree"><ScopeTree symbolTableJson={result.symbolTableJson} isPlaying={playState === 'playing' && currentStep === 0} isCompleted={completedSteps.has(0) || playState === 'completed'} /></ErrorBoundary></div>
                <PipelineConnector active={completedSteps.has(0) || currentStep >= 1} />
                <div ref={(el) => { stepRefs.current[1] = el; }}><ErrorBoundary name="SymbolCollector"><SymbolCollector symbolTableJson={result.symbolTableJson} isPlaying={playState === 'playing' && currentStep === 1} isCompleted={completedSteps.has(1) || playState === 'completed'} /></ErrorBoundary></div>
                <PipelineConnector active={completedSteps.has(1) || currentStep >= 2} />
                <div ref={(el) => { stepRefs.current[2] = el; }}><ErrorBoundary name="TypeResolutionFlow"><TypeResolutionFlow symbolTableJson={result.symbolTableJson} isPlaying={playState === 'playing' && currentStep === 2} isCompleted={completedSteps.has(2) || playState === 'completed'} /></ErrorBoundary></div>
                <PipelineConnector active={completedSteps.has(2) || currentStep >= 3} />
                <div ref={(el) => { stepRefs.current[3] = el; }}><ErrorBoundary name="TypeCheckingMatrix"><TypeCheckingMatrix symbolTableJson={result.symbolTableJson} isPlaying={playState === 'playing' && currentStep === 3} isCompleted={completedSteps.has(3) || playState === 'completed'} /></ErrorBoundary></div>
                <PipelineConnector active={completedSteps.has(3) || currentStep >= 4} />
                <div ref={(el) => { stepRefs.current[4] = el; }}><ErrorBoundary name="ErrorReportPanel"><ErrorReportPanel symbolTableJson={result.symbolTableJson} isPlaying={playState === 'playing' && currentStep === 4} isCompleted={completedSteps.has(4) || playState === 'completed'} /></ErrorBoundary></div>
              </div>
              <StepControls currentStep={currentStep} playState={playState} stepNames={SEMANTIC_STEP_NAMES} totalSteps={5} onPlay={handlePlay} onPause={handlePause} onNext={handleNext} onPrev={handlePrev} onRestart={handleRestart} onPlayOnePhase={handlePlayOnePhase} playOneDisabled={[0,1,2,3,4].every(s=>completedSteps.has(s))} />
            </>
          )}
        </>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto p-4"><ErrorBoundary name="SymbolExplorer"><SymbolExplorer symbolTableJson={result.symbolTableJson} /></ErrorBoundary></div>
      )}
    </div>
  );
};

export default SemanticAnalysisPanel;
