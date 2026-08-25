import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCompile } from '../context/CompileContext';
import { TreePine, ArrowRight } from 'lucide-react';
import type { PlayState } from '../lib/lexer/types';
import { generateParseSteps } from '../lib/parser/parseSimulator';
import { GRAMMAR_RULES } from '../lib/parser/javaGrammar';
import StepControls from '../components/lexical/StepControls';
import PipelineConnector from '../components/lexical/PipelineConnector';
import GrammarRulesTable from '../components/syntax/GrammarRulesTable';
import PdaGraph from '../components/syntax/PdaGraph';
import ShiftReduceAnimation from '../components/syntax/ShiftReduceAnimation';
import AstTreeAnimation from '../components/syntax/AstTreeAnimation';
import AstTree from '../components/AstTree';
import ErrorBoundary from '../components/ErrorBoundary';

const STEP_DELAYS = [1800, 3200, 5200, 6000];
const PARSE_MS_PER_STEP = 350;
const SYNTAX_STEP_NAMES = ['Grammar', 'PDA', 'Shift-Reduce', 'AST'];

const SyntaxAnalysisPanel: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { result, loading } = useCompile();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('view') === 'static' ? 'browser' : 'pipeline';
  const [currentStep, setCurrentStep] = useState<0 | 1 | 2 | 3>(0);
  const [playState, setPlayState] = useState<PlayState>('idle');
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const autoplayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tokens = result?.tokens ?? [];
  const astError = useMemo(() => {
    if (!result?.astJson) return null;
    try { const p = JSON.parse(result.astJson); return p?.error ?? null; } catch { return null; }
  }, [result?.astJson]);

  const parseSteps = useMemo(() => {
    if (!result?.tokens || !result.astJson || astError) return [];
    return generateParseSteps(result.tokens, result.astJson);
  }, [result, astError]);

  const activeRuleIds = useMemo(() => {
    const set = new Set<string>();
    for (const step of parseSteps) for (const id of step.usedRules) set.add(id);
    return set;
  }, [parseSteps]);

  const usedRules = useMemo(() => GRAMMAR_RULES.filter(r => activeRuleIds.has(r.id)), [activeRuleIds]);
  const currentRuleId = useMemo(() => [...parseSteps].reverse().find(s => s.action.type === 'REDUCE')?.action.rule?.id, [parseSteps]);

  // Try It derived (for AST)

  useEffect(() => { return () => { if (autoplayTimer.current) clearTimeout(autoplayTimer.current); }; }, []);

  const scrollToStep = useCallback((step: number) => { const el = stepRefs.current[step]; if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, []);
  const handlePlay = useCallback(() => {
    setPlayState('playing'); setCurrentStep(0); setCompletedSteps(new Set()); scrollToStep(0);
    const parseDelay = parseSteps.length * PARSE_MS_PER_STEP + 2000;
    const delays: number[] = [STEP_DELAYS[0], STEP_DELAYS[1], parseDelay, STEP_DELAYS[3]];
    let step = 0;
    const advance = () => {
      setCompletedSteps(prev => new Set(prev).add(step));
      if (step < 3) { step++; setCurrentStep(step as 0 | 1 | 2 | 3); scrollToStep(step); autoplayTimer.current = setTimeout(advance, delays[step]); }
      else setPlayState('completed');
    };
    autoplayTimer.current = setTimeout(advance, delays[0]);
  }, [scrollToStep, parseSteps.length]);
  const handlePlayOnePhase = useCallback(() => {
    if (autoplayTimer.current) { clearTimeout(autoplayTimer.current); autoplayTimer.current = null; }
    let step = currentStep; while (step < 3 && completedSteps.has(step)) step++; if (completedSteps.has(step)) return;
    setCurrentStep(step as 0 | 1 | 2 | 3); setPlayState('playing'); scrollToStep(step);
    const parseDelay = parseSteps.length * PARSE_MS_PER_STEP + 2000;
    const delays: number[] = [STEP_DELAYS[0], STEP_DELAYS[1], parseDelay, STEP_DELAYS[3]];
    autoplayTimer.current = setTimeout(() => { setCompletedSteps(prev => new Set(prev).add(step)); setPlayState('idle'); autoplayTimer.current = null; }, delays[step]);
  }, [currentStep, completedSteps, scrollToStep, parseSteps.length]);
  const handlePause = useCallback(() => { setPlayState('paused'); if (autoplayTimer.current) { clearTimeout(autoplayTimer.current); autoplayTimer.current = null; } }, []);
  const handleNext = useCallback(() => { if (currentStep < 3) { setCompletedSteps(prev => new Set(prev).add(currentStep)); setCurrentStep((currentStep + 1) as 0 | 1 | 2 | 3); scrollToStep(currentStep + 1); } }, [currentStep, scrollToStep]);
  const handlePrev = useCallback(() => { if (currentStep > 0) { setCurrentStep((currentStep - 1) as 0 | 1 | 2 | 3); scrollToStep(currentStep - 1); } }, [currentStep, scrollToStep]);
  const handleRestart = useCallback(() => { if (autoplayTimer.current) clearTimeout(autoplayTimer.current); setPlayState('idle'); setCurrentStep(0); setCompletedSteps(new Set()); scrollToStep(0); }, [scrollToStep]);
  const handleScroll = useCallback(() => {
    if (playState === 'playing') return;
    const container = stepRefs.current[0]?.parentElement; if (!container) return;
    for (let i = 0; i < 4; i++) { const el = stepRefs.current[i]; if (el) { const rect = el.getBoundingClientRect(); const containerRect = container.getBoundingClientRect(); const relativeTop = rect.top - containerRect.top; if (relativeTop > -100 && relativeTop < containerRect.height / 2) { setCurrentStep(i as 0 | 1 | 2 | 3); break; } } }
  }, [playState]);

  if (loading) return <div className="flex items-center justify-center h-full"><div className="text-[var(--color-text-muted)] font-mono text-sm animate-pulse">{t('editor.compiling')}...</div></div>;
  if (astError) return <div className="flex flex-col items-center justify-center h-full text-center gap-3 px-6"><div className="text-[var(--color-error)] font-mono text-sm font-bold">Syntax Error</div><div className="text-[var(--color-text-dim)] font-mono text-xs max-w-xl whitespace-pre-wrap">{String(astError)}</div><div className="text-[10px] font-mono text-[var(--color-text-muted)]">The parser rejected the input before building an AST. Fix the error and recompile.</div></div>;
  if (!result?.tokens || result.tokens.length === 0) return <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-muted)] text-center gap-3"><TreePine size={48} className="text-[var(--color-neon)] opacity-30" /><div className="font-mono text-sm">{t('ast.noAst')}</div></div>;

  return (
    <div className="flex flex-col h-full min-h-0">
      {activeTab === 'pipeline' ? (
        <>
          <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 py-3 space-y-2" onScroll={handleScroll}>
            <div ref={(el) => { stepRefs.current[0] = el; }}>
              <ErrorBoundary name="GrammarRulesTable">
                <GrammarRulesTable rules={usedRules} tokens={tokens} activeRuleIds={activeRuleIds} currentRuleId={currentRuleId} isPlaying={playState === 'playing' && currentStep === 0} isCompleted={completedSteps.has(0) || playState === 'completed'} />
              </ErrorBoundary>
            </div>
            <PipelineConnector active={completedSteps.has(0) || currentStep >= 1} />
            <div ref={(el) => { stepRefs.current[1] = el; }}>
              <ErrorBoundary name="PdaGraph"><PdaGraph steps={parseSteps} isPlaying={playState === 'playing' && currentStep === 1} isCompleted={completedSteps.has(1) || playState === 'completed'} /></ErrorBoundary>
            </div>
            <PipelineConnector active={completedSteps.has(1) || currentStep >= 2} />
            <div ref={(el) => { stepRefs.current[2] = el; }}>
              <ErrorBoundary name="ShiftReduceAnimation"><ShiftReduceAnimation steps={parseSteps} isPlaying={playState === 'playing' && currentStep === 2} isCompleted={completedSteps.has(2) || playState === 'completed'} /></ErrorBoundary>
            </div>
            <PipelineConnector active={completedSteps.has(2) || currentStep >= 3} />
            <div ref={(el) => { stepRefs.current[3] = el; }}>
              <ErrorBoundary name="AstTreeAnimation">
                <AstTreeAnimation astJson={result.astJson} isPlaying={playState === 'playing' && currentStep === 3} isCompleted={completedSteps.has(3) || playState === 'completed'} />
              </ErrorBoundary>
            </div>

            <div className="flex justify-end pt-6 pb-4">
              <button
                onClick={() => navigate('/visualize/semantic')}
                className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold tracking-[0.1em] uppercase font-display border bg-[rgba(0,255,136,0.08)] border-[var(--color-neon)] text-[var(--color-neon)] hover:bg-[var(--color-neon)] hover:text-[var(--color-void)] transition-all"
              >
                Next: Semantic Analysis <ArrowRight size={14} />
              </button>
            </div>
          </div>
          <StepControls currentStep={currentStep} playState={playState} stepNames={SYNTAX_STEP_NAMES} onPlay={handlePlay} onPause={handlePause} onPrev={handlePrev} onNext={handleNext} onRestart={handleRestart} onPlayOnePhase={handlePlayOnePhase} playOneDisabled={[0,1,2,3].every(s=>completedSteps.has(s))} />
        </>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto p-4"><ErrorBoundary name="AST Tree" inline><AstTree astJson={result.astJson} /></ErrorBoundary></div>
      )}
    </div>
  );
};

export default SyntaxAnalysisPanel;
