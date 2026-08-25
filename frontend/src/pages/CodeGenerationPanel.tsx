/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCompile } from '../context/CompileContext';
import { Code2, ArrowRight } from 'lucide-react';
import type { PlayState } from '../lib/lexer/types';
import StepControls from '../components/lexical/StepControls';
import PipelineConnector from '../components/lexical/PipelineConnector';
import ExpressionDecomposition from '../components/codegen/ExpressionDecomposition';
import DependenceGraphStep from '../components/codegen/DependenceGraphStep';
import InstructionScheduling from '../components/codegen/InstructionScheduling';
import InterferenceGraphStep from '../components/codegen/InterferenceGraphStep';
import RegisterAllocation from '../components/codegen/RegisterAllocation';
import TacCodeViewer from '../components/codegen/TacCodeViewer';
import TryItInput from '../components/codegen/TryItInput';
import ErrorBoundary from '../components/ErrorBoundary';
import { computeSchedule } from '../lib/cfg/scheduling';
import { computeRegAllocation } from '../lib/cfg/regalloc';
import { runLivenessAnalysis } from '../lib/cfg/dataflow';
import {
  buildCodegenTryItData,
  TRYIT_STEP0_PRESETS,
  TRYIT_STEP1_PRESETS,
  TRYIT_STEP2_PRESETS,
  TRYIT_STEP3_PRESETS,
  TRYIT_STEP4_PRESETS,
} from '../lib/codegen/codegenTryIt';
import { buildCfgFromTac } from '../lib/codegen/tacParser';

const STEP_DELAYS = [3000, 4000, 4000, 4000, 4000];
const CODEGEN_STEP_NAMES = ['TAC Generation', 'Dependence Graph', 'List Scheduling', 'Interference Graph', 'Graph Coloring'];

const PER_STEP_PRESETS: readonly (readonly string[])[] = [
  TRYIT_STEP0_PRESETS,
  TRYIT_STEP1_PRESETS,
  TRYIT_STEP2_PRESETS,
  TRYIT_STEP3_PRESETS,
  TRYIT_STEP4_PRESETS,
];

const DEFAULT_TRYIT_CODES = [
  TRYIT_STEP0_PRESETS[0],
  TRYIT_STEP1_PRESETS[0],
  TRYIT_STEP2_PRESETS[0],
  TRYIT_STEP3_PRESETS[0],
  TRYIT_STEP4_PRESETS[0],
];

type StepIdx = 0 | 1 | 2 | 3 | 4;

const PhaseDivider: React.FC<{ phaseKey: string }> = ({ phaseKey }) => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-[var(--color-neon)] opacity-20" />
      <span className="text-[9px] font-bold text-[var(--color-neon)] font-display tracking-[0.2em] uppercase whitespace-nowrap">
        {t(`codegen.${phaseKey}.title`)} &middot; {t(`codegen.${phaseKey}.chapter`)}
      </span>
      <div className="h-px flex-1 bg-[var(--color-neon)] opacity-20" />
    </div>
  );
};

const CodeGenerationPanel: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { result, loading } = useCompile();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('view') === 'static' ? 'explorer' : 'pipeline';
  const [currentStep, setCurrentStep] = useState<StepIdx>(0);
  const [playState, setPlayState] = useState<PlayState>('idle');
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [stepTryIt, setStepTryIt] = useState<boolean[]>([false, false, false, false, false]);
  const [tryItCodes, setTryItCodes] = useState<string[]>([...DEFAULT_TRYIT_CODES]);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const autoplayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toggleStepTryIt = (idx: number, on: boolean) => setStepTryIt(prev => { const n = [...prev]; n[idx] = on; return n; });
  const setTryItCode = (idx: number, code: string) => setTryItCodes(prev => { const n = [...prev]; n[idx] = code; return n; });

  // Per-step Try It data — each step parses its own editable code independently
  const tryItData0 = useMemo(() => buildCodegenTryItData(tryItCodes[0]), [tryItCodes[0]]);
  const tryItData1 = useMemo(() => buildCodegenTryItData(tryItCodes[1]), [tryItCodes[1]]);
  const tryItData2 = useMemo(() => buildCodegenTryItData(tryItCodes[2]), [tryItCodes[2]]);
  const tryItData3 = useMemo(() => buildCodegenTryItData(tryItCodes[3]), [tryItCodes[3]]);
  const tryItData4 = useMemo(() => buildCodegenTryItData(tryItCodes[4]), [tryItCodes[4]]);
  const tryItDatas = [tryItData0, tryItData1, tryItData2, tryItData3, tryItData4] as const;

  const tryItScheduling1 = useMemo(() => computeSchedule(tryItData1.instructions), [tryItData1]);
  const tryItScheduling2 = useMemo(() => computeSchedule(tryItData2.instructions), [tryItData2]);
  const tryItSchedulings = [null as any, tryItScheduling1, tryItScheduling2, null as any, null as any] as const;

  const tryItCfgMethod3 = useMemo(() => buildCfgFromTac(tryItData3), [tryItData3]);
  const tryItCfgMethod4 = useMemo(() => buildCfgFromTac(tryItData4), [tryItData4]);
  const tryItDataflow3 = useMemo(() => runLivenessAnalysis(tryItCfgMethod3 as any), [tryItCfgMethod3]);
  const tryItDataflow4 = useMemo(() => runLivenessAnalysis(tryItCfgMethod4 as any), [tryItCfgMethod4]);
  const tryItAllocation3 = useMemo(() => computeRegAllocation(tryItCfgMethod3 as any, tryItData3.instructions, tryItDataflow3, tryItData3.basicBlocks), [tryItCfgMethod3, tryItData3, tryItDataflow3]);
  const tryItAllocation4 = useMemo(() => computeRegAllocation(tryItCfgMethod4 as any, tryItData4.instructions, tryItDataflow4, tryItData4.basicBlocks), [tryItCfgMethod4, tryItData4, tryItDataflow4]);
  const tryItAllocations = [null as any, null as any, null as any, tryItAllocation3, tryItAllocation4] as const;

  useEffect(() => { return () => { if (autoplayTimer.current) clearTimeout(autoplayTimer.current); }; }, []);
  const scrollToStep = useCallback((step: number) => {
    const el = stepRefs.current[step];
    if (!el) return;
    const container = el.parentElement;
    if (!container) return;
    const elRect = el.getBoundingClientRect();
    const contRect = container.getBoundingClientRect();
    const target = container.scrollTop + (elRect.top - contRect.top) - 12;
    container.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
  }, []);
  const handlePlay = useCallback(() => {
    setPlayState('playing'); setCurrentStep(0); setCompletedSteps(new Set()); scrollToStep(0);
    let step = 0;
    const advance = () => {
      setCompletedSteps(prev => new Set(prev).add(step));
      if (step < 4) { step++; setCurrentStep(step as StepIdx); scrollToStep(step); autoplayTimer.current = setTimeout(advance, STEP_DELAYS[step]); } else setPlayState('completed');
    };
    autoplayTimer.current = setTimeout(advance, STEP_DELAYS[0]);
  }, [scrollToStep]);
  const handlePlayOnePhase = useCallback(() => {
    if (autoplayTimer.current) { clearTimeout(autoplayTimer.current); autoplayTimer.current = null; }
    let step = currentStep; while (step < 4 && completedSteps.has(step)) step++; if (completedSteps.has(step)) return;
    setCurrentStep(step as StepIdx); setPlayState('playing'); scrollToStep(step);
    autoplayTimer.current = setTimeout(() => { setCompletedSteps(prev => new Set(prev).add(step)); setPlayState('idle'); autoplayTimer.current = null; }, STEP_DELAYS[step]);
  }, [currentStep, completedSteps, scrollToStep]);
  const handlePause = useCallback(() => { setPlayState('paused'); if (autoplayTimer.current) { clearTimeout(autoplayTimer.current); autoplayTimer.current = null; } }, []);
  const handleNext = useCallback(() => { if (currentStep < 4) { const next = (currentStep + 1) as StepIdx; setCompletedSteps(prev => new Set(prev).add(currentStep)); setCurrentStep(next); scrollToStep(next); } }, [currentStep, scrollToStep]);
  const handlePrev = useCallback(() => { if (currentStep > 0) { setCurrentStep((currentStep - 1) as StepIdx); scrollToStep(currentStep - 1); } }, [currentStep, scrollToStep]);
  const handleRestart = useCallback(() => { if (autoplayTimer.current) clearTimeout(autoplayTimer.current); setPlayState('idle'); setCurrentStep(0); setCompletedSteps(new Set()); scrollToStep(0); }, [scrollToStep]);
  const handleScroll = useCallback(() => {
    if (playState === 'playing') return;
    const container = stepRefs.current[0]?.parentElement; if (!container) return;
    for (let i = 0; i < 5; i++) { const el = stepRefs.current[i]; if (el) { const rect = el.getBoundingClientRect(); const containerRect = container.getBoundingClientRect(); const relativeTop = rect.top - containerRect.top; if (relativeTop > -100 && relativeTop < containerRect.height / 2) { setCurrentStep(i as StepIdx); break; } } }
  }, [playState]);

  const data = result?.codeGenerationData;
  const scheduling = useMemo(() => data ? computeSchedule(data.instructions) : null, [data]);
  const dataflow = useMemo(() => {
    if (result?.cfgJson) { try { const cfg = typeof result.cfgJson === 'string' ? JSON.parse(result.cfgJson) : result.cfgJson; if (cfg?.methods?.[0]) return runLivenessAnalysis(cfg.methods[0]); } catch { /* ignore */ } }
    return null;
  }, [result?.cfgJson]);
  const allocation = useMemo(() => dataflow && result?.cfgJson && data ? (() => { const cfg = typeof result.cfgJson === 'string' ? JSON.parse(result.cfgJson) : result.cfgJson; return cfg?.methods?.[0] ? computeRegAllocation(cfg.methods[0], data.instructions, dataflow, data.basicBlocks) : null; })() : null, [dataflow, data, result?.cfgJson]);

  const hasBackend = !!data && data.instructions.length > 0;

  const StepTabs: React.FC<{ idx: number }> = ({ idx }) => {
    const isTry = stepTryIt[idx];
    return (
      <div className="flex gap-1.5 mb-2">
        <button onClick={() => toggleStepTryIt(idx, false)} className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold tracking-wide border ${!isTry ? 'bg-[var(--color-neon-dim)] text-[var(--color-neon)] border-[var(--color-neon)]' : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border-bright)]'}`}>Your Program</button>
        <button onClick={() => toggleStepTryIt(idx, true)} className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold tracking-wide border ${isTry ? 'bg-[var(--color-neon-dim)] text-[var(--color-neon)] border-[var(--color-neon)]' : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border-bright)]'}`}>Try It</button>
      </div>
    );
  };

  const TryItEditor: React.FC<{ idx: number }> = ({ idx }) => {
    if (!stepTryIt[idx]) return null;
    return (
      <div className="mb-3 p-3 bg-[var(--color-void)] border border-[var(--color-border)]">
        <div className="text-[9px] font-bold text-[var(--color-neon)] font-display tracking-[0.15em] uppercase mb-2">
          Try It — edit the code and watch the visualization update
        </div>
        <TryItInput
          value={tryItCodes[idx]}
          onChange={(v) => setTryItCode(idx, v)}
          presets={PER_STEP_PRESETS[idx]}
          placeholder="Type Java code…"
        />
      </div>
    );
  };

  if (loading) return <div className="flex items-center justify-center h-full"><div className="text-[var(--color-text-muted)] font-mono text-sm animate-pulse">{t('editor.compiling')}...</div></div>;
  if (!hasBackend && !tryItDatas[0]) return <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-muted)] text-center gap-3"><Code2 size={48} className="text-[var(--color-neon)] opacity-30" /><div className="font-mono text-sm">{t('codegen.noData')}</div></div>;

  return (
    <div className="flex flex-col h-full min-h-0">
      {activeTab === 'pipeline' ? (
        <>
          <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 py-3 space-y-2" onScroll={handleScroll}>

            <PhaseDivider phaseKey="phase1" />
            <div ref={(el) => { stepRefs.current[0] = el; }}>
              <StepTabs idx={0} />
              <TryItEditor idx={0} />
              <ErrorBoundary name="ExpressionDecomposition">
                <ExpressionDecomposition
                  data={stepTryIt[0] ? tryItDatas[0] as any : data as any}
                  isPlaying={playState === 'playing' && currentStep === 0}
                  isCompleted={completedSteps.has(0) || playState === 'completed'}
                />
              </ErrorBoundary>
            </div>
            <PipelineConnector active={completedSteps.has(0) || currentStep >= 1} />

            <PhaseDivider phaseKey="phase2" />
            <div ref={(el) => { stepRefs.current[1] = el; }}>
              <StepTabs idx={1} />
              <TryItEditor idx={1} />
              <ErrorBoundary name="DependenceGraphStep">
                {(stepTryIt[1] ? tryItSchedulings[1] : scheduling) ? (
                  <DependenceGraphStep
                    data={stepTryIt[1] ? tryItDatas[1] as any : data as any}
                    scheduling={(stepTryIt[1] ? tryItSchedulings[1] : scheduling) as any}
                    isPlaying={playState === 'playing' && currentStep === 1}
                    isCompleted={completedSteps.has(1) || playState === 'completed'}
                  />
                ) : (
                  <div className="text-[10px] text-[var(--color-text-muted)] font-mono p-3 bg-[var(--color-card)] border border-[var(--color-border)]">{t('codegen.step2.noData', 'Computing instruction schedule...')}</div>
                )}
              </ErrorBoundary>
            </div>
            <PipelineConnector active={completedSteps.has(1) || currentStep >= 2} />
            <div ref={(el) => { stepRefs.current[2] = el; }}>
              <StepTabs idx={2} />
              <TryItEditor idx={2} />
              <ErrorBoundary name="InstructionScheduling">
                {(stepTryIt[2] ? tryItSchedulings[2] : scheduling) ? (
                  <InstructionScheduling
                    data={stepTryIt[2] ? tryItDatas[2] as any : data as any}
                    scheduling={(stepTryIt[2] ? tryItSchedulings[2] : scheduling) as any}
                    isPlaying={playState === 'playing' && currentStep === 2}
                    isCompleted={completedSteps.has(2) || playState === 'completed'}
                    showDependencyGraph={false}
                  />
                ) : (
                  <div className="text-[10px] text-[var(--color-text-muted)] font-mono p-3 bg-[var(--color-card)] border border-[var(--color-border)]">{t('codegen.step2.noData', 'Computing instruction schedule...')}</div>
                )}
              </ErrorBoundary>
            </div>
            <PipelineConnector active={completedSteps.has(2) || currentStep >= 3} />

            <PhaseDivider phaseKey="phase3" />
            <div ref={(el) => { stepRefs.current[3] = el; }}>
              <StepTabs idx={3} />
              <TryItEditor idx={3} />
              <ErrorBoundary name="InterferenceGraphStep">
                {(stepTryIt[3] ? tryItAllocations[3] : allocation) ? (
                  <InterferenceGraphStep
                    allocation={(stepTryIt[3] ? tryItAllocations[3] : allocation) as any}
                    isPlaying={playState === 'playing' && currentStep === 3}
                    isCompleted={completedSteps.has(3) || playState === 'completed'}
                  />
                ) : (
                  <div className="text-[10px] text-[var(--color-text-muted)] font-mono p-3 bg-[var(--color-card)] border border-[var(--color-border)]">{t('codegen.step4.noData', 'Register allocation requires CFG data for liveness analysis.')}</div>
                )}
              </ErrorBoundary>
            </div>
            <PipelineConnector active={completedSteps.has(3) || currentStep >= 4} />
            <div ref={(el) => { stepRefs.current[4] = el; }}>
              <StepTabs idx={4} />
              <TryItEditor idx={4} />
              <ErrorBoundary name="RegisterAllocation">
                {(stepTryIt[4] ? tryItAllocations[4] : allocation) ? (
                  <RegisterAllocation
                    allocation={(stepTryIt[4] ? tryItAllocations[4] : allocation) as any}
                    isPlaying={playState === 'playing' && currentStep === 4}
                    isCompleted={completedSteps.has(4) || playState === 'completed'}
                    showInterferenceGraph={false}
                  />
                ) : (
                  <div className="text-[10px] text-[var(--color-text-muted)] font-mono p-3 bg-[var(--color-card)] border border-[var(--color-border)]">{t('codegen.step4.noData', 'Register allocation requires CFG data for liveness analysis.')}</div>
                )}
              </ErrorBoundary>
            </div>
            <PipelineConnector active={completedSteps.has(4) || playState === 'completed'} />
            <div className="bg-[var(--color-card)] border border-[var(--color-border)] p-3">
              <div className="flex items-center gap-2 mb-2"><Code2 size={12} className="text-[var(--color-neon)]" /><div className="text-[9px] text-[var(--color-neon)] font-bold font-display tracking-[0.15em] uppercase">{t('codegen.interactions.title')}</div></div>
              <p className="text-[10px] text-[var(--color-text-dim)] font-mono leading-relaxed m-0">{t('codegen.interactions.description')}</p>
            </div>
            <div className="flex justify-end pt-6 pb-4">
              <button
                onClick={() => navigate('/visualize/bytecode')}
                className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold tracking-[0.1em] uppercase font-display border bg-[rgba(0,255,136,0.08)] border-[var(--color-neon)] text-[var(--color-neon)] hover:bg-[var(--color-neon)] hover:text-[var(--color-void)] transition-all"
              >
                Next: Bytecode <ArrowRight size={14} />
              </button>
            </div>
          </div>
          <StepControls currentStep={currentStep} playState={playState} stepNames={CODEGEN_STEP_NAMES} totalSteps={5} onPlay={handlePlay} onPause={handlePause} onNext={handleNext} onPrev={handlePrev} onRestart={handleRestart} onPlayOnePhase={handlePlayOnePhase} playOneDisabled={[0, 1, 2, 3, 4].every(s => completedSteps.has(s))} />
        </>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto p-4"><ErrorBoundary name="TacCodeViewer"><TacCodeViewer data={(stepTryIt[0] ? tryItDatas[0] : data) as any} /></ErrorBoundary></div>
      )}
    </div>
  );
};

export default CodeGenerationPanel;
