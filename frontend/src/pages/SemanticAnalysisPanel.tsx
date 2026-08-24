import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
import { buildSemanticTryItData, SEMANTIC_TRYIT_PRESETS } from '../lib/semantic/semanticTryIt';

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
  const [tryItCode, setTryItCode] = useState('int x = 1;\n{ int y = x; }');
  const [stepTryIt, setStepTryIt] = useState<boolean[]>([false, false, false, false, false]);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const autoplayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tryItJson = useMemo(() => buildSemanticTryItData(tryItCode), [tryItCode]);
  const toggleStepTryIt = (idx: number, on: boolean) => {
    setStepTryIt(prev => {
      const n = [...prev];
      n[idx] = on;
      return n;
    });
  };

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

  const StepTabs: React.FC<{ idx: number }> = ({ idx }) => {
    const isTry = stepTryIt[idx];
    return (
      <div className="flex gap-1.5 mb-2">
        <button onClick={() => toggleStepTryIt(idx, false)} className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold tracking-wide border ${!isTry ? 'bg-[var(--color-neon-dim)] text-[var(--color-neon)] border-[var(--color-neon)]' : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border-bright)]'}`}>Your Program</button>
        <button onClick={() => toggleStepTryIt(idx, true)} className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold tracking-wide border ${isTry ? 'bg-[var(--color-neon-dim)] text-[var(--color-neon)] border-[var(--color-neon)]' : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border-bright)]'}`}>Try It</button>
      </div>
    );
  };

  if (loading) return <div className="flex items-center justify-center h-full"><div className="text-[var(--color-text-muted)] font-mono text-sm animate-pulse">{t('editor.compiling')}...</div></div>;
  // Don't block Try It when backend has no symbol table
  const hasBackend = !!result?.symbolTableJson && result.symbolTableJson.length > 0;
  if (!hasBackend && !tryItJson) return <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-muted)] text-center gap-3"><Search size={48} className="text-[var(--color-neon)] opacity-30" /><div className="font-mono text-sm">{t('semantic.noSymbolTable')}</div></div>;

  return (
    <div className="flex flex-col h-full min-h-0">
      {activeTab === 'pipeline' ? (
        <>
          <div className="shrink-0 px-1 mb-2">
            <div className="border border-[var(--color-border-bright)] rounded-lg bg-[var(--color-card)] p-2 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-[var(--color-text-muted)] font-display">Try It — editable tiny snippet</span>
                <span className="text-[9px] font-mono text-[var(--color-text-muted)]">instant</span>
              </div>
              <textarea value={tryItCode} onChange={e => setTryItCode(e.target.value)} rows={3} className="w-full p-2 rounded border border-[var(--color-border-bright)] bg-[var(--color-void)] text-xs font-mono text-[var(--color-text)] focus:outline-none focus:border-[var(--color-neon)]" spellCheck={false} />
              <div className="flex flex-wrap gap-1">
                {SEMANTIC_TRYIT_PRESETS.map(p => (
                  <button key={p} onClick={() => setTryItCode(p)} className={`px-2 py-0.5 rounded text-[9px] font-mono border ${tryItCode === p ? 'bg-[var(--color-neon-dim)] text-[var(--color-neon)] border-[var(--color-neon)]' : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border-bright)]'}`}>{p.split('\n')[0].slice(0,24)}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 py-3 space-y-2" onScroll={handleScroll}>
            <div className="rounded border border-[var(--color-amber-dim)] bg-[var(--color-amber-dim)]/30 px-3 py-2 text-[10px] font-mono leading-relaxed text-[var(--color-amber)]">Each step has <span className="font-bold">Your Program</span> vs <span className="font-bold">Try It</span>. Try It uses the snippet above and updates instantly.</div>

            <div ref={(el) => { stepRefs.current[0] = el; }}><StepTabs idx={0} /><ErrorBoundary name="ScopeTree"><ScopeTree symbolTableJson={stepTryIt[0] ? tryItJson : (result?.symbolTableJson ?? '')} isPlaying={playState === 'playing' && currentStep === 0} isCompleted={completedSteps.has(0) || playState === 'completed'} /></ErrorBoundary></div>
            <PipelineConnector active={completedSteps.has(0) || currentStep >= 1} />
            <div ref={(el) => { stepRefs.current[1] = el; }}><StepTabs idx={1} /><ErrorBoundary name="SymbolCollector"><SymbolCollector symbolTableJson={stepTryIt[1] ? tryItJson : (result?.symbolTableJson ?? '')} isPlaying={playState === 'playing' && currentStep === 1} isCompleted={completedSteps.has(1) || playState === 'completed'} /></ErrorBoundary></div>
            <PipelineConnector active={completedSteps.has(1) || currentStep >= 2} />
            <div ref={(el) => { stepRefs.current[2] = el; }}><StepTabs idx={2} /><ErrorBoundary name="TypeResolutionFlow"><TypeResolutionFlow symbolTableJson={stepTryIt[2] ? tryItJson : (result?.symbolTableJson ?? '')} isPlaying={playState === 'playing' && currentStep === 2} isCompleted={completedSteps.has(2) || playState === 'completed'} /></ErrorBoundary></div>
            <PipelineConnector active={completedSteps.has(2) || currentStep >= 3} />
            <div ref={(el) => { stepRefs.current[3] = el; }}><StepTabs idx={3} /><ErrorBoundary name="TypeCheckingMatrix"><TypeCheckingMatrix symbolTableJson={stepTryIt[3] ? tryItJson : (result?.symbolTableJson ?? '')} isPlaying={playState === 'playing' && currentStep === 3} isCompleted={completedSteps.has(3) || playState === 'completed'} /></ErrorBoundary></div>
            <PipelineConnector active={completedSteps.has(3) || currentStep >= 4} />
            <div ref={(el) => { stepRefs.current[4] = el; }}><StepTabs idx={4} /><ErrorBoundary name="ErrorReportPanel"><ErrorReportPanel symbolTableJson={stepTryIt[4] ? tryItJson : (result?.symbolTableJson ?? '')} isPlaying={playState === 'playing' && currentStep === 4} isCompleted={completedSteps.has(4) || playState === 'completed'} /></ErrorBoundary></div>
          </div>
          <StepControls currentStep={currentStep} playState={playState} stepNames={SEMANTIC_STEP_NAMES} totalSteps={5} onPlay={handlePlay} onPause={handlePause} onNext={handleNext} onPrev={handlePrev} onRestart={handleRestart} onPlayOnePhase={handlePlayOnePhase} playOneDisabled={[0,1,2,3,4].every(s=>completedSteps.has(s))} />
        </>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto p-4"><ErrorBoundary name="SymbolExplorer"><SymbolExplorer symbolTableJson={result?.symbolTableJson ?? tryItJson} /></ErrorBoundary></div>
      )}
    </div>
  );
};

export default SemanticAnalysisPanel;
