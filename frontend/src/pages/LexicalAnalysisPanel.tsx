import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useCompile } from '../context/CompileContext';
import { analyzeTokenGroups } from '../lib/lexer/tokenGroups';
import { buildNFA } from '../lib/lexer/thompson';
import { subsetConstruction } from '../lib/lexer/subsetConstruction';
import { hopcroftMinimization } from '../lib/lexer/hopcroft';
import { simulateScanner } from '../lib/lexer/scanner';
import type { PlayState, PipelineStep } from '../lib/lexer/types';
import StepControls from '../components/lexical/StepControls';
import PipelineConnector from '../components/lexical/PipelineConnector';
import RegexTable from '../components/lexical/RegexTable';
import NfaGraph from '../components/lexical/NfaGraph';
import DfaGraph from '../components/lexical/DfaGraph';
import MinimizedDfaGraph from '../components/lexical/MinimizedDfaGraph';
import ScannerAnimation from '../components/lexical/ScannerAnimation';
import TokensPanel from './TokensPanel';
import ErrorBoundary from '../components/ErrorBoundary';

const STEP_DELAYS = [2000, 4000, 5000, 3200, 8000]; // ms per step — 5 steps: RE→NFA→DFA(subset)→MinDFA(Hopcroft)→Scan
const SCAN_MS_PER_CHAR = 25; // must match ScannerAnimation interval

const LexicalAnalysisPanel: React.FC = () => {
  const { t } = useTranslation();
  const { result, code, loading } = useCompile();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('view') === 'static' ? 'browser' : 'pipeline';
  const [currentStep, setCurrentStep] = useState<PipelineStep>(0);
  const [playState, setPlayState] = useState<PlayState>('idle');
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const autoplayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Compute data from tokens
  const groups = useMemo(() => {
    if (!result?.tokens) return [];
    return analyzeTokenGroups(result.tokens);
  }, [result]);

  const nfa = useMemo(() => buildNFA(), []);

  const foundKeywords = useMemo(() => {
    if (!result?.tokens) return [] as string[];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const tok of result.tokens) {
      if (tok.type === 'KEYWORD' && !seen.has(tok.value)) { seen.add(tok.value); out.push(tok.value); }
    }
    return out;
  }, [result]);

  const { dfa, steps: subsetSteps } = useMemo(() => subsetConstruction(nfa), [nfa]);
  const { minDfa, steps: hopcroftSteps } = useMemo(() => hopcroftMinimization(dfa), [dfa]);

  const scannerResult = useMemo(() => {
    if (!code) return { steps: [], emittedTokens: [] };
    // Use minimized DFA for scanning demo — demonstrates the pipeline's second fixed point is not decorative
    return simulateScanner(code, minDfa);
  }, [code, minDfa]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoplayTimer.current) clearTimeout(autoplayTimer.current);
    };
  }, []);

  // Auto-scroll to current step
  const scrollToStep = useCallback((step: number) => {
    const el = stepRefs.current[step];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  // Handle play — 5 steps: RE(0) → NFA(1) → DFA(2) → MinDFA(3) → Scan(4)
  const handlePlay = useCallback(() => {
    setPlayState('playing');
    setCurrentStep(0);
    setCompletedSteps(new Set());
    scrollToStep(0);

    const scannerDelay = scannerResult.steps.length * SCAN_MS_PER_CHAR + 1500;
    const delays: number[] = [STEP_DELAYS[0], STEP_DELAYS[1], STEP_DELAYS[2], STEP_DELAYS[3], scannerDelay];
    let step = 0;
    const advance = () => {
      setCompletedSteps(prev => new Set(prev).add(step));
      if (step < 4) {
        step++;
        setCurrentStep(step as PipelineStep);
        scrollToStep(step);
        autoplayTimer.current = setTimeout(advance, delays[step]);
      } else {
        setPlayState('completed');
      }
    };
    autoplayTimer.current = setTimeout(advance, delays[0]);
  }, [scrollToStep, scannerResult.steps.length]);

  // Handle pause
  const handlePause = useCallback(() => {
    setPlayState('paused');
    if (autoplayTimer.current) {
      clearTimeout(autoplayTimer.current);
      autoplayTimer.current = null;
    }
  }, []);

  // Handle play-one-phase: animate only the active phase, then stay on it.
  // Each click advances at most one phase; skips any phase already played.
  const handlePlayOnePhase = useCallback(() => {
    if (autoplayTimer.current) {
      clearTimeout(autoplayTimer.current);
      autoplayTimer.current = null;
    }

    // Advance past already-completed phases
    let step = currentStep;
    while (step < 4 && completedSteps.has(step)) step++;
    if (completedSteps.has(step)) return; // everything already played

    setCurrentStep(step as PipelineStep);
    setPlayState('playing');
    scrollToStep(step);

    const scannerDelay = scannerResult.steps.length * SCAN_MS_PER_CHAR + 1500;
    const delays: number[] = [STEP_DELAYS[0], STEP_DELAYS[1], STEP_DELAYS[2], STEP_DELAYS[3], scannerDelay];
    autoplayTimer.current = setTimeout(() => {
      setCompletedSteps(prev => new Set(prev).add(step));
      setPlayState('idle');
      autoplayTimer.current = null;
    }, delays[step]);
  }, [currentStep, completedSteps, scrollToStep, scannerResult.steps.length]);

  // Handle next — gated by completion dependency (can't jump ahead of unfinished construction)
  const handleNext = useCallback(() => {
    if (currentStep < 4) {
      const next = (currentStep + 1) as PipelineStep;
      setCompletedSteps(prev => new Set(prev).add(currentStep));
      setCurrentStep(next);
      scrollToStep(next);
    }
  }, [currentStep, scrollToStep]);

  // Handle prev
  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      const prev = (currentStep - 1) as PipelineStep;
      setCurrentStep(prev);
      scrollToStep(prev);
    }
  }, [currentStep, scrollToStep]);

  // Handle restart
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

  // Detect scroll position to update current step
  const handleScroll = useCallback(() => {
    if (playState === 'playing') return; // don't interfere with autoplay
    const container = stepRefs.current[0]?.parentElement;
    if (!container) return;
    const containerHeight = container.clientHeight;

    for (let i = 0; i < 5; i++) {
      const el = stepRefs.current[i];
      if (el) {
        const rect = el.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const relativeTop = rect.top - containerRect.top;
        if (relativeTop > -100 && relativeTop < containerHeight / 2) {
          setCurrentStep(i as PipelineStep);
          break;
        }
      }
    }
  }, [playState]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-[var(--color-text-muted)] font-mono text-sm animate-pulse">
          Compiling...
        </div>
      </div>
    );
  }

  if (!result?.tokens || result.tokens.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--color-text-muted)] text-center">
        <div className="font-mono text-sm">{t('tokens.noTokens')}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {activeTab === 'pipeline' ? (
        <>
          {/* Scrollable pipeline */}
          <div
            className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 py-3 space-y-2"
            onScroll={handleScroll}
          >
            {/* Step 1: Regular Expressions */}
            <div ref={(el) => { stepRefs.current[0] = el; }}>
              <ErrorBoundary name="RegexTable">
                <RegexTable
                  groups={groups}
                  isPlaying={playState === 'playing' && currentStep === 0}
                  isCompleted={completedSteps.has(0) || playState === 'completed'}
                />
              </ErrorBoundary>
            </div>

            <PipelineConnector active={completedSteps.has(0) || currentStep >= 1} />

            {/* Step 2: NFA */}
            <div ref={(el) => { stepRefs.current[1] = el; }}>
              <ErrorBoundary name="NfaGraph">
                <NfaGraph
                  nfa={nfa}
                  keywords={foundKeywords}
                  isPlaying={playState === 'playing' && currentStep === 1}
                  isCompleted={completedSteps.has(1) || playState === 'completed'}
                />
              </ErrorBoundary>
            </div>

            <PipelineConnector active={completedSteps.has(1) || currentStep >= 2} />

            {/* Step 3: DFA */}
            <div ref={(el) => { stepRefs.current[2] = el; }}>
              <ErrorBoundary name="DfaGraph">
                <DfaGraph
                  dfa={dfa}
                  steps={subsetSteps}
                  isPlaying={playState === 'playing' && currentStep === 2}
                  isCompleted={completedSteps.has(2) || playState === 'completed'}
                />
              </ErrorBoundary>
            </div>

            <PipelineConnector active={completedSteps.has(2) || currentStep >= 3} />

            {/* Step 4: DFA Minimization (Hopcroft) — second fixed point */}
            <div ref={(el) => { stepRefs.current[3] = el; }}>
              <ErrorBoundary name="MinimizedDfaGraph">
                <MinimizedDfaGraph
                  dfa={dfa}
                  minDfa={minDfa}
                  hopcroftSteps={hopcroftSteps}
                  isPlaying={playState === 'playing' && currentStep === 3}
                  isCompleted={completedSteps.has(3) || playState === 'completed'}
                />
              </ErrorBoundary>
            </div>

            <PipelineConnector active={completedSteps.has(3) || currentStep >= 4} />

            {/* Step 5: Scanner (on minimized DFA) */}
            <div ref={(el) => { stepRefs.current[4] = el; }}>
              <ErrorBoundary name="ScannerAnimation">
                <ScannerAnimation
                  sourceCode={code}
                  steps={scannerResult.steps}
                  emittedTokens={scannerResult.emittedTokens}
                  isPlaying={playState === 'playing' && currentStep === 4}
                  isCompleted={completedSteps.has(4) || playState === 'completed'}
                />
              </ErrorBoundary>
            </div>
          </div>

          {/* Sticky controls — 5 steps: RE → NFA → DFA → MinDFA → Scan */}
          <StepControls
            currentStep={currentStep}
            playState={playState}
            stepNames={['Regex', 'NFA', 'DFA', 'Min-DFA', 'Scan']}
            totalSteps={5}
            onPlay={handlePlay}
            onPause={handlePause}
            onPrev={handlePrev}
            onNext={handleNext}
            onRestart={handleRestart}
            onPlayOnePhase={handlePlayOnePhase}
            playOneDisabled={[0, 1, 2, 3, 4].every(s => completedSteps.has(s))}
          />
        </>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto">
          <ErrorBoundary name="TokensPanel">
            <TokensPanel />
          </ErrorBoundary>
        </div>
      )}
    </div>
  );
};

export default LexicalAnalysisPanel;
