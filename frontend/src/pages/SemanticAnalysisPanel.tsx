import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCompile } from '../context/CompileContext';
import { Search, ArrowRight } from 'lucide-react';
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
import { buildSemanticTryItData, SEMANTIC_TRYIT_PRESETS, SEMANTIC_TRYIT_PRESET_LABELS, SYMBOL_TRYIT_PRESETS, SYMBOL_TRYIT_LABELS, RESOLUTION_TRYIT_PRESETS, RESOLUTION_TRYIT_LABELS, CHECKING_TRYIT_PRESETS, CHECKING_TRYIT_LABELS, ERRORS_TRYIT_PRESETS, ERRORS_TRYIT_LABELS } from '../lib/semantic/semanticTryIt';

const STEP_DELAYS = [3000, 4000, 5000, 8000, 4000];
const SEMANTIC_STEP_NAMES = ['Scopes', 'Symbols', 'Resolution', 'Checking', 'Errors'];

const DEFAULT_TRYIT_CODES = [
  'int x = 1;\n{ int y = x; }',
  'int x = 10;\ndouble rate = 0.05;',
  'System.out.println("Hello");',
  'int x = 10;\ndouble d = x; // widening',
  'int x = 1;\nString s = 1; // type error',
];

const SemanticAnalysisPanel: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { result, loading } = useCompile();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('view') === 'static' ? 'explorer' : 'pipeline';
  const [currentStep, setCurrentStep] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [playState, setPlayState] = useState<PlayState>('idle');
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [tryItCodes, setTryItCodes] = useState<string[]>(DEFAULT_TRYIT_CODES);
  const [stepTryIt, setStepTryIt] = useState<boolean[]>([false, false, false, false, false]);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const autoplayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tryItJsons = useMemo(() => tryItCodes.map(c => buildSemanticTryItData(c)), [tryItCodes]);
  const tryItErrors = useMemo(() => tryItJsons.map(j => { try { JSON.parse(j); return null; } catch (e: any) { return e?.message || 'Invalid input'; } }), [tryItJsons]);
  const parsedNodeCounts = useMemo(() => tryItJsons.map(j => { try { const parsed = JSON.parse(j); const count = JSON.stringify(parsed.scopeTree).split('scopeId').length - 1; return count; } catch { return 0; } }), [tryItJsons]);
  const setTryItCodeFor = (idx: number, value: string) => setTryItCodes(prev => { const n = [...prev]; n[idx] = value; return n; });
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
        <button onClick={() => toggleStepTryIt(idx, false)} className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold tracking-wide border ${!isTry ? 'bg-[var(--color-neon-dim)] text-[var(--color-neon)] border-[var(--color-neon)]' : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border-bright)]'}`}>Java Program</button>
        <button onClick={() => toggleStepTryIt(idx, true)} className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold tracking-wide border ${isTry ? 'bg-[var(--color-neon-dim)] text-[var(--color-neon)] border-[var(--color-neon)]' : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border-bright)]'}`}>Try Yourself</button>
      </div>
    );
  };

  if (loading) return <div className="flex items-center justify-center h-full"><div className="text-[var(--color-text-muted)] font-mono text-sm animate-pulse">{t('editor.compiling')}...</div></div>;
  // Don't block Try It when backend has no symbol table
  const hasBackend = !!result?.symbolTableJson && result.symbolTableJson.length > 0;
  if (!hasBackend && !tryItJsons[0]) return <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-muted)] text-center gap-3"><Search size={48} className="text-[var(--color-neon)] opacity-30" /><div className="font-mono text-sm">{t('semantic.noSymbolTable')}</div></div>;

  return (
    <div className="flex flex-col h-full min-h-0">
      {activeTab === 'pipeline' ? (
        <>
          <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 py-3 space-y-2" onScroll={handleScroll}>

            <div ref={(el) => { stepRefs.current[0] = el; }}>
              <StepTabs idx={0} />
              {stepTryIt[0] && (
                <div className="flex flex-col gap-2 mb-3">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold tracking-wide text-[var(--color-text-muted)] font-mono whitespace-nowrap">
                        Try your own code:
                      </span>
                      <span className="text-[10px] font-mono text-[var(--color-amber)] whitespace-nowrap">
                        {parsedNodeCounts[0]} nodes
                      </span>
                    </div>
                    <textarea
                      value={tryItCodes[0]}
                      onChange={e => setTryItCodeFor(0, e.target.value)}
                      placeholder={'int x = 1;\n{ int y = x; }'}
                      className="w-full min-h-[84px] px-2.5 py-2 rounded border border-[var(--color-border-bright)] bg-[var(--color-card)] text-xs font-mono text-[var(--color-text)] focus:outline-none focus:border-[var(--color-neon)] whitespace-pre resize-y"
                      rows={4}
                      maxLength={600}
                    />
                    {tryItErrors[0] && (
                      <div className="text-[10px] font-mono text-[var(--color-error)] bg-[var(--color-error-dim)]/20 border border-[var(--color-error-dim)] rounded px-2 py-1">
                        {tryItErrors[0]}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {SEMANTIC_TRYIT_PRESETS.map((p, idx) => (
                      <button
                        key={p}
                        onClick={() => setTryItCodeFor(0, p)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono border ${tryItCodes[0] === p ? 'bg-[var(--color-neon-dim)] text-[var(--color-neon)] border-[var(--color-neon)]' : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border-bright)] hover:text-[var(--color-text)]'}`}
                        title={p}
                      >
                        {SEMANTIC_TRYIT_PRESET_LABELS[idx] ?? p.slice(0, 18)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <ErrorBoundary name="ScopeTree"><ScopeTree symbolTableJson={stepTryIt[0] ? tryItJsons[0] : (result?.symbolTableJson ?? '')} isPlaying={playState === 'playing' && currentStep === 0} isCompleted={completedSteps.has(0) || playState === 'completed'} /></ErrorBoundary>
            </div>
            <PipelineConnector active={completedSteps.has(0) || currentStep >= 1} />
            <div ref={(el) => { stepRefs.current[1] = el; }}>
              <StepTabs idx={1} />
              {stepTryIt[1] && (
                <div className="flex flex-col gap-2 mb-3">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold tracking-wide text-[var(--color-text-muted)] font-mono whitespace-nowrap">
                        Try your own symbols:
                      </span>
                      <span className="text-[10px] font-mono text-[var(--color-amber)] whitespace-nowrap">
                        {parsedNodeCounts[1]} nodes
                      </span>
                    </div>
                    <textarea
                      value={tryItCodes[1]}
                      onChange={e => setTryItCodeFor(1, e.target.value)}
                      placeholder={'int x = 10;\ndouble rate = 0.05;'}
                      className="w-full min-h-[84px] px-2.5 py-2 rounded border border-[var(--color-border-bright)] bg-[var(--color-card)] text-xs font-mono text-[var(--color-text)] focus:outline-none focus:border-[var(--color-neon)] whitespace-pre resize-y"
                      rows={4}
                      maxLength={600}
                    />
                    {tryItErrors[1] && (
                      <div className="text-[10px] font-mono text-[var(--color-error)] bg-[var(--color-error-dim)]/20 border border-[var(--color-error-dim)] rounded px-2 py-1">
                        {tryItErrors[1]}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {SYMBOL_TRYIT_PRESETS.map((p, idx) => (
                      <button
                        key={p}
                        onClick={() => setTryItCodeFor(1, p)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono border ${tryItCodes[1] === p ? 'bg-[var(--color-neon-dim)] text-[var(--color-neon)] border-[var(--color-neon)]' : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border-bright)] hover:text-[var(--color-text)]'}`}
                        title={p}
                      >
                        {SYMBOL_TRYIT_LABELS[idx] ?? p.slice(0, 18)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <ErrorBoundary name="SymbolCollector"><SymbolCollector symbolTableJson={stepTryIt[1] ? tryItJsons[1] : (result?.symbolTableJson ?? '')} isPlaying={playState === 'playing' && currentStep === 1} isCompleted={completedSteps.has(1) || playState === 'completed'} /></ErrorBoundary>
            </div>
            <PipelineConnector active={completedSteps.has(1) || currentStep >= 2} />
            <div ref={(el) => { stepRefs.current[2] = el; }}>
              <StepTabs idx={2} />
              {stepTryIt[2] && (
                <div className="flex flex-col gap-2 mb-3">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold tracking-wide text-[var(--color-text-muted)] font-mono whitespace-nowrap">
                        Try your own resolution:
                      </span>
                      <span className="text-[10px] font-mono text-[var(--color-amber)] whitespace-nowrap">
                        {(() => { try { return JSON.parse(tryItJsons[2]).typeResolution?.length ?? 0; } catch { return 0; } })()} steps
                      </span>
                    </div>
                    <textarea
                      value={tryItCodes[2]}
                      onChange={e => setTryItCodeFor(2, e.target.value)}
                      placeholder={'System.out.println("Hello");'}
                      className="w-full min-h-[84px] px-2.5 py-2 rounded border border-[var(--color-border-bright)] bg-[var(--color-card)] text-xs font-mono text-[var(--color-text)] focus:outline-none focus:border-[var(--color-neon)] whitespace-pre resize-y"
                      rows={4}
                      maxLength={600}
                    />
                    {tryItErrors[2] && (
                      <div className="text-[10px] font-mono text-[var(--color-error)] bg-[var(--color-error-dim)]/20 border border-[var(--color-error-dim)] rounded px-2 py-1">
                        {tryItErrors[2]}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {RESOLUTION_TRYIT_PRESETS.map((p, idx) => (
                      <button
                        key={p}
                        onClick={() => setTryItCodeFor(2, p)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono border ${tryItCodes[2] === p ? 'bg-[var(--color-neon-dim)] text-[var(--color-neon)] border-[var(--color-neon)]' : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border-bright)] hover:text-[var(--color-text)]'}`}
                        title={p}
                      >
                        {RESOLUTION_TRYIT_LABELS[idx] ?? p.slice(0, 18)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <ErrorBoundary name="TypeResolutionFlow"><TypeResolutionFlow symbolTableJson={stepTryIt[2] ? tryItJsons[2] : (result?.symbolTableJson ?? '')} isPlaying={playState === 'playing' && currentStep === 2} isCompleted={completedSteps.has(2) || playState === 'completed'} /></ErrorBoundary>
            </div>
            <PipelineConnector active={completedSteps.has(2) || currentStep >= 3} />
            <div ref={(el) => { stepRefs.current[3] = el; }}>
              <StepTabs idx={3} />
              {stepTryIt[3] && (
                <div className="flex flex-col gap-2 mb-3">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold tracking-wide text-[var(--color-text-muted)] font-mono whitespace-nowrap">
                        Try your own checks:
                      </span>
                      <span className="text-[10px] font-mono text-[var(--color-amber)] whitespace-nowrap">
                        {(() => { try { return JSON.parse(tryItJsons[3]).typeChecks?.length ?? 0; } catch { return 0; } })()} checks
                      </span>
                    </div>
                    <textarea
                      value={tryItCodes[3]}
                      onChange={e => setTryItCodeFor(3, e.target.value)}
                      placeholder={'int x = 10;\ndouble d = x; // widening'}
                      className="w-full min-h-[84px] px-2.5 py-2 rounded border border-[var(--color-border-bright)] bg-[var(--color-card)] text-xs font-mono text-[var(--color-text)] focus:outline-none focus:border-[var(--color-neon)] whitespace-pre resize-y"
                      rows={4}
                      maxLength={600}
                    />
                    {tryItErrors[3] && (
                      <div className="text-[10px] font-mono text-[var(--color-error)] bg-[var(--color-error-dim)]/20 border border-[var(--color-error-dim)] rounded px-2 py-1">
                        {tryItErrors[3]}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {CHECKING_TRYIT_PRESETS.map((p, idx) => (
                      <button
                        key={p}
                        onClick={() => setTryItCodeFor(3, p)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono border ${tryItCodes[3] === p ? 'bg-[var(--color-neon-dim)] text-[var(--color-neon)] border-[var(--color-neon)]' : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border-bright)] hover:text-[var(--color-text)]'}`}
                        title={p}
                      >
                        {CHECKING_TRYIT_LABELS[idx] ?? p.slice(0, 18)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <ErrorBoundary name="TypeCheckingMatrix"><TypeCheckingMatrix symbolTableJson={stepTryIt[3] ? tryItJsons[3] : (result?.symbolTableJson ?? '')} isPlaying={playState === 'playing' && currentStep === 3} isCompleted={completedSteps.has(3) || playState === 'completed'} /></ErrorBoundary>
            </div>
            <PipelineConnector active={completedSteps.has(3) || currentStep >= 4} />
            <div ref={(el) => { stepRefs.current[4] = el; }}>
              <StepTabs idx={4} />
              {stepTryIt[4] && (
                <div className="flex flex-col gap-2 mb-3">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold tracking-wide text-[var(--color-text-muted)] font-mono whitespace-nowrap">
                        Try your own errors:
                      </span>
                      <span className="text-[10px] font-mono text-[var(--color-amber)] whitespace-nowrap">
                        {(() => { try { return JSON.parse(tryItJsons[4]).errors?.length ?? 0; } catch { return 0; } })()} errors
                      </span>
                    </div>
                    <textarea
                      value={tryItCodes[4]}
                      onChange={e => setTryItCodeFor(4, e.target.value)}
                      placeholder={'int x = 1;\nString s = 1; // type error'}
                      className="w-full min-h-[84px] px-2.5 py-2 rounded border border-[var(--color-border-bright)] bg-[var(--color-card)] text-xs font-mono text-[var(--color-text)] focus:outline-none focus:border-[var(--color-neon)] whitespace-pre resize-y"
                      rows={4}
                      maxLength={600}
                    />
                    {tryItErrors[4] && (
                      <div className="text-[10px] font-mono text-[var(--color-error)] bg-[var(--color-error-dim)]/20 border border-[var(--color-error-dim)] rounded px-2 py-1">
                        {tryItErrors[4]}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {ERRORS_TRYIT_PRESETS.map((p, idx) => (
                      <button
                        key={p}
                        onClick={() => setTryItCodeFor(4, p)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono border ${tryItCodes[4] === p ? 'bg-[var(--color-neon-dim)] text-[var(--color-neon)] border-[var(--color-neon)]' : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border-bright)] hover:text-[var(--color-text)]'}`}
                        title={p}
                      >
                        {ERRORS_TRYIT_LABELS[idx] ?? p.slice(0, 18)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <ErrorBoundary name="ErrorReportPanel"><ErrorReportPanel symbolTableJson={stepTryIt[4] ? tryItJsons[4] : (result?.symbolTableJson ?? '')} isPlaying={playState === 'playing' && currentStep === 4} isCompleted={completedSteps.has(4) || playState === 'completed'} /></ErrorBoundary>
            </div>

            <div className="flex justify-end pt-6 pb-4">
              <button
                onClick={() => navigate('/visualize/cfg')}
                className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold tracking-[0.1em] uppercase font-display border bg-[rgba(0,255,136,0.08)] border-[var(--color-neon)] text-[var(--color-neon)] hover:bg-[var(--color-neon)] hover:text-[var(--color-void)] transition-all"
              >
                Next: Optimizer <ArrowRight size={14} />
              </button>
            </div>
          </div>
          <StepControls currentStep={currentStep} playState={playState} stepNames={SEMANTIC_STEP_NAMES} totalSteps={5} onPlay={handlePlay} onPause={handlePause} onNext={handleNext} onPrev={handlePrev} onRestart={handleRestart} onPlayOnePhase={handlePlayOnePhase} playOneDisabled={[0,1,2,3,4].every(s=>completedSteps.has(s))} />
        </>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto p-4"><ErrorBoundary name="SymbolExplorer"><SymbolExplorer symbolTableJson={result?.symbolTableJson ?? tryItJsons[0]} /></ErrorBoundary></div>
      )}
    </div>
  );
};

export default SemanticAnalysisPanel;
