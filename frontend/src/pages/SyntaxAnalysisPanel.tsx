import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useCompile } from '../context/CompileContext';
import { TreePine } from 'lucide-react';
import type { PlayState } from '../lib/lexer/types';
import { generateParseSteps } from '../lib/parser/parseSimulator';
import { GRAMMAR_RULES } from '../lib/parser/javaGrammar';
import { buildSyntaxTryItData, SYNTAX_TRYIT_PRESETS } from '../lib/parser/syntaxTryIt';
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
  const { result, loading } = useCompile();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('view') === 'static' ? 'browser' : 'pipeline';
  const [currentStep, setCurrentStep] = useState<0 | 1 | 2 | 3>(0);
  const [playState, setPlayState] = useState<PlayState>('idle');
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const autoplayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Try It (per-step, shared code) ──
  const [tryItCode, setTryItCode] = useState('int x = a + b * c;');
  const [stepTryIt, setStepTryIt] = useState<boolean[]>([false, false, false, false]);
  const tryItData = useMemo(() => buildSyntaxTryItData(tryItCode), [tryItCode]);
  const toggleStepTryIt = (idx: number, on: boolean) => {
    setStepTryIt(prev => {
      const next = [...prev];
      next[idx] = on;
      return next;
    });
  };

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

  // Try It derived
  const tryItTokens = tryItData?.tokens ?? [];
  const tryItSteps = tryItData?.parseSteps ?? [];
  const tryItUsedRules = useMemo(() => {
    if (!tryItData) return [];
    return GRAMMAR_RULES.filter(r => tryItData.usedRuleIds.has(r.id));
  }, [tryItData]);
  const tryItActiveIds = tryItData?.usedRuleIds ?? new Set<string>();
  const tryItCurrentId = tryItData?.currentRuleId;

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
  if (astError) return <div className="flex flex-col items-center justify-center h-full text-center gap-3 px-6"><div className="text-[var(--color-error)] font-mono text-sm font-bold">Syntax Error</div><div className="text-[var(--color-text-dim)] font-mono text-xs max-w-xl whitespace-pre-wrap">{String(astError)}</div><div className="text-[10px] font-mono text-[var(--color-text-muted)]">The parser rejected the input before building an AST. Fix the error and recompile.</div></div>;
  if (!result?.tokens || result.tokens.length === 0) return <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-muted)] text-center gap-3"><TreePine size={48} className="text-[var(--color-neon)] opacity-30" /><div className="font-mono text-sm">{t('ast.noAst')}</div></div>;

  return (
    <div className="flex flex-col h-full min-h-0">
      {activeTab === 'pipeline' ? (
        <>
          {/* Shared Try It editor — instant, no backend */}
          <div className="shrink-0 px-1 mb-2">
            <div className="border border-[var(--color-border-bright)] rounded-lg bg-[var(--color-card)] p-2 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-[var(--color-text-muted)] font-display">Try It — editable tiny statement</span>
                <span className="text-[9px] font-mono text-[var(--color-text-muted)]">{tryItTokens.length} tokens</span>
              </div>
              <textarea value={tryItCode} onChange={e => setTryItCode(e.target.value)} rows={2} className="w-full p-2 rounded border border-[var(--color-border-bright)] bg-[var(--color-void)] text-xs font-mono text-[var(--color-text)] focus:outline-none focus:border-[var(--color-neon)]" spellCheck={false} />
              <div className="flex flex-wrap gap-1">
                {SYNTAX_TRYIT_PRESETS.map(p => (
                  <button key={p} onClick={() => setTryItCode(p)} className={`px-2 py-0.5 rounded text-[9px] font-mono border ${tryItCode === p ? 'bg-[var(--color-neon-dim)] text-[var(--color-neon)] border-[var(--color-neon)]' : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border-bright)]'}`}>{p}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 py-3 space-y-2" onScroll={handleScroll}>
            <div className="rounded border border-[var(--color-amber-dim)] bg-[var(--color-amber-dim)]/30 px-3 py-2 text-[10px] font-mono leading-relaxed text-[var(--color-amber)]">Each step has <span className="font-bold">Your Program</span> vs <span className="font-bold">Try It</span> tabs. Try It uses your tiny statement above and updates instantly without recompiling.</div>

            <div ref={(el) => { stepRefs.current[0] = el; }}>
              <StepTabs idx={0} />
              <ErrorBoundary name="GrammarRulesTable">
                {stepTryIt[0] ? (
                  tryItTokens.length ? <GrammarRulesTable rules={tryItUsedRules} tokens={tryItTokens} activeRuleIds={tryItActiveIds} currentRuleId={tryItCurrentId} isPlaying={playState === 'playing' && currentStep === 0} isCompleted={completedSteps.has(0) || playState === 'completed'} /> : <div className="text-[10px] font-mono text-[var(--color-text-muted)] p-3 border border-[var(--color-border)] rounded">Type a statement above.</div>
                ) : (
                  <GrammarRulesTable rules={usedRules} tokens={tokens} activeRuleIds={activeRuleIds} currentRuleId={currentRuleId} isPlaying={playState === 'playing' && currentStep === 0} isCompleted={completedSteps.has(0) || playState === 'completed'} />
                )}
              </ErrorBoundary>
            </div>
            <PipelineConnector active={completedSteps.has(0) || currentStep >= 1} />
            <div ref={(el) => { stepRefs.current[1] = el; }}>
              <StepTabs idx={1} />
              <ErrorBoundary name="PdaGraph"><PdaGraph steps={stepTryIt[1] ? tryItSteps : parseSteps} isPlaying={playState === 'playing' && currentStep === 1} isCompleted={completedSteps.has(1) || playState === 'completed'} /></ErrorBoundary>
            </div>
            <PipelineConnector active={completedSteps.has(1) || currentStep >= 2} />
            <div ref={(el) => { stepRefs.current[2] = el; }}>
              <StepTabs idx={2} />
              <ErrorBoundary name="ShiftReduceAnimation"><ShiftReduceAnimation steps={stepTryIt[2] ? tryItSteps : parseSteps} isPlaying={playState === 'playing' && currentStep === 2} isCompleted={completedSteps.has(2) || playState === 'completed'} /></ErrorBoundary>
            </div>
            <PipelineConnector active={completedSteps.has(2) || currentStep >= 3} />
            <div ref={(el) => { stepRefs.current[3] = el; }}>
              <StepTabs idx={3} />
              <ErrorBoundary name="AstTreeAnimation">
                {stepTryIt[3] ? (
                  tryItData?.astJson ? <AstTreeAnimation astJson={tryItData.astJson} isPlaying={playState === 'playing' && currentStep === 3} isCompleted={completedSteps.has(3) || playState === 'completed'} /> : <div className="text-[10px] font-mono text-[var(--color-text-muted)] p-3 border border-[var(--color-border)] rounded">Type a statement above.</div>
                ) : (
                  <AstTreeAnimation astJson={result.astJson} isPlaying={playState === 'playing' && currentStep === 3} isCompleted={completedSteps.has(3) || playState === 'completed'} />
                )}
              </ErrorBoundary>
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
