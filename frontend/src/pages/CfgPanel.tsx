import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCompile } from '../context/CompileContext';
import { GitFork, ArrowRight } from 'lucide-react';
import type { PlayState } from '../lib/lexer/types';
import type { CfgMethod } from '../types';
import StepControls from '../components/lexical/StepControls';
import PipelineConnector from '../components/lexical/PipelineConnector';
import CfgBasicBlocks from '../components/cfg/CfgBasicBlocks';
import LocalValueNumbering from '../components/cfg/LocalValueNumbering';
import DominatorTree from '../components/cfg/DominatorTree';
import SsaForm from '../components/cfg/SsaForm';
import TryItEditor from '../components/cfg/TryItEditor';
import CfgGraph from '../components/CfgGraph';
import ErrorBoundary from '../components/ErrorBoundary';
import { computeDominators } from '../lib/cfg/dominators';
import { buildSsa } from '../lib/cfg/ssa';
import { runLvn } from '../lib/cfg/lvn';
import { buildCfgTryItData } from '../lib/cfg/cfgTryIt';
import { buildCodegenTryItData } from '../lib/codegen/codegenTryIt';

const STEP_DELAYS = [3000, 4000, 4000, 4000];
const OPTIMIZER_STEP_NAMES = ['Basic Blocks', 'Value Numbering', 'Dominator Tree', 'SSA Form'];

function parseCfg(jsonStr: string): CfgMethod[] | null {
  try {
    const data = JSON.parse(jsonStr);
    if (data.error) return null;
    return data.methods || null;
  } catch { return null; }
}

const CfgPanel: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { result, loading } = useCompile();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('view') === 'static' ? 'static' : 'pipeline';
  const [currentStep, setCurrentStep] = useState<0 | 1 | 2 | 3>(0);
  const [playState, setPlayState] = useState<PlayState>('idle');
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [tryItCode, setTryItCode] = useState('int a = k + 2;\nint c = d - b;\nint d2 = a + b;\nif (b > d2) {\n  int f = b - d2;\n} else {\n  d2 = b * 2;\n}');
  const [stepTryIt, setStepTryIt] = useState<boolean[]>([false, false, false, false]);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const autoplayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toggleStepTryIt = (idx: number, on: boolean) => setStepTryIt(prev => { const n = [...prev]; n[idx] = on; return n; });

  const tryItCfg = useMemo(() => buildCfgTryItData(tryItCode), [tryItCode]);
  const tryItMethod = tryItCfg.methods[0] ?? null;
  const tryItCodegen = useMemo(() => buildCodegenTryItData(tryItCode), [tryItCode]);
  const tryItLvn = useMemo(() => tryItMethod ? runLvn(tryItMethod) : null, [tryItMethod]);
  const tryItDominators = useMemo(() => tryItMethod ? computeDominators(tryItMethod) : null, [tryItMethod]);
  const tryItSsa = useMemo(() => tryItMethod ? buildSsa(tryItMethod, tryItCodegen.instructions, tryItCodegen.basicBlocks) : null, [tryItMethod, tryItCodegen]);

  useEffect(() => {
    return () => { if (autoplayTimer.current) clearTimeout(autoplayTimer.current); };
  }, []);

  const methods = useMemo(() => {
    if (!result?.cfgJson) return null;
    return parseCfg(result.cfgJson);
  }, [result]);

  const currentMethod = methods && methods.length > 0 ? methods[0] : null;

  const lvn = useMemo(() => {
    if (!currentMethod) return null;
    return runLvn(currentMethod);
  }, [currentMethod]);

  const dominators = useMemo(() => {
    if (!currentMethod) return null;
    return computeDominators(currentMethod);
  }, [currentMethod]);

  const ssa = useMemo(() => {
    if (!currentMethod || !result?.codeGenerationData) return null;
    return buildSsa(currentMethod, result.codeGenerationData.instructions, result.codeGenerationData.basicBlocks);
  }, [currentMethod, result]);

  const scrollToStep = useCallback((step: number) => {
    const el = stepRefs.current[step];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const handlePlay = useCallback(() => {
    setPlayState('playing');
    setCurrentStep(0);
    setCompletedSteps(new Set());
    scrollToStep(0);

    let step = 0;
    const advance = () => {
      setCompletedSteps(prev => new Set(prev).add(step));
      if (step < 3) {
        step++;
        setCurrentStep(step as 0 | 1 | 2 | 3);
        scrollToStep(step);
        autoplayTimer.current = setTimeout(advance, STEP_DELAYS[step]);
      } else {
        setPlayState('completed');
      }
    };
    autoplayTimer.current = setTimeout(advance, STEP_DELAYS[0]);
  }, [scrollToStep]);

  const handlePlayOnePhase = useCallback(() => {
    if (autoplayTimer.current) { clearTimeout(autoplayTimer.current); autoplayTimer.current = null; }

    let step = currentStep;
    while (step < 3 && completedSteps.has(step)) step++;
    if (completedSteps.has(step)) return;

    setCurrentStep(step as 0 | 1 | 2 | 3);
    setPlayState('playing');
    scrollToStep(step);

    autoplayTimer.current = setTimeout(() => {
      setCompletedSteps(prev => new Set(prev).add(step));
      setPlayState('idle');
      autoplayTimer.current = null;
    }, STEP_DELAYS[step]);
  }, [currentStep, completedSteps, scrollToStep]);

  const handlePause = useCallback(() => {
    setPlayState('paused');
    if (autoplayTimer.current) { clearTimeout(autoplayTimer.current); autoplayTimer.current = null; }
  }, []);

  const handleNext = useCallback(() => {
    if (currentStep < 3) {
      const next = (currentStep + 1) as 0 | 1 | 2 | 3;
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      setCurrentStep(next);
      scrollToStep(next);
    }
  }, [currentStep, scrollToStep]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((currentStep - 1) as 0 | 1 | 2 | 3);
      scrollToStep(currentStep - 1);
    }
  }, [currentStep, scrollToStep]);

  const handleRestart = useCallback(() => {
    if (autoplayTimer.current) clearTimeout(autoplayTimer.current); autoplayTimer.current = null;
    setPlayState('idle');
    setCurrentStep(0);
    setCompletedSteps(new Set());
    scrollToStep(0);
  }, [scrollToStep]);

  const handleScroll = useCallback(() => {
    if (playState === 'playing') return;
    const container = stepRefs.current[0]?.parentElement;
    if (!container) return;
    for (let i = 0; i < 4; i++) {
      const el = stepRefs.current[i];
      if (el) {
        const rect = el.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const relativeTop = rect.top - containerRect.top;
        if (relativeTop > -100 && relativeTop < containerRect.height / 2) {
          setCurrentStep(i as 0 | 1 | 2 | 3);
          break;
        }
      }
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-[var(--color-text-muted)] font-mono text-sm animate-pulse">
          {t('editor.compiling')}...
        </div>
      </div>
    );
  }

  const hasBackend = !!result?.cfgJson && !!currentMethod && !!lvn && !!dominators && !!ssa;
  if (!hasBackend && !tryItMethod) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-muted)] text-center gap-3">
        <GitFork size={48} className="text-[var(--color-neon)] opacity-30" />
        <div className="font-mono text-sm">{t('cfg.noCfg')}</div>
      </div>
    );
  }

  const displayMethod = (idx: number) => stepTryIt[idx] ? tryItMethod : currentMethod;
  const displayLvn = (idx: number) => stepTryIt[idx] ? tryItLvn : lvn;
  const displayDominators = (idx: number) => stepTryIt[idx] ? tryItDominators : dominators;
  const displaySsa = (idx: number) => stepTryIt[idx] ? tryItSsa : ssa;
  const displayInstructions = (idx: number) => stepTryIt[idx] ? tryItCodegen.instructions : (result?.codeGenerationData?.instructions || []);

  return (
    <div className="flex flex-col h-full min-h-0">
      {activeTab === 'pipeline' ? (
        <>
          <div
            className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 py-3 space-y-2"
            onScroll={handleScroll}
          >

            <div ref={(el) => { stepRefs.current[0] = el; }}>
              <StepTabs idx={0} />
              {stepTryIt[0] && <TryItEditor code={tryItCode} onChange={setTryItCode} />}
              <ErrorBoundary name="CfgBasicBlocks">
                {displayMethod(0) ? <CfgBasicBlocks method={displayMethod(0)!} isPlaying={playState === 'playing' && currentStep === 0} isCompleted={completedSteps.has(0) || playState === 'completed'} /> : <div className="text-[10px] font-mono text-[var(--color-text-muted)] p-3 border border-[var(--color-border)] rounded">No CFG</div>}
              </ErrorBoundary>
            </div>

            <PipelineConnector active={completedSteps.has(0) || currentStep >= 1} />

            <div ref={(el) => { stepRefs.current[1] = el; }}>
              <StepTabs idx={1} />
              {stepTryIt[1] && <TryItEditor code={tryItCode} onChange={setTryItCode} />}
              <ErrorBoundary name="LocalValueNumbering">
                {displayMethod(1) && displayLvn(1) ? <LocalValueNumbering result={displayLvn(1)!} isPlaying={playState === 'playing' && currentStep === 1} isCompleted={completedSteps.has(1) || playState === 'completed'} /> : <div className="text-[10px] font-mono text-[var(--color-text-muted)] p-3 border border-[var(--color-border)] rounded">No LVN data</div>}
              </ErrorBoundary>
            </div>

            <PipelineConnector active={completedSteps.has(1) || currentStep >= 2} />

            <div ref={(el) => { stepRefs.current[2] = el; }}>
              <StepTabs idx={2} />
              {stepTryIt[2] && <TryItEditor code={tryItCode} onChange={setTryItCode} />}
              <ErrorBoundary name="DominatorTree">
                {displayMethod(2) && displayDominators(2) ? <DominatorTree method={displayMethod(2)!} dominators={displayDominators(2)!} isPlaying={playState === 'playing' && currentStep === 2} isCompleted={completedSteps.has(2) || playState === 'completed'} /> : <div className="text-[10px] font-mono text-[var(--color-text-muted)] p-3 border border-[var(--color-border)] rounded">No dominators</div>}
              </ErrorBoundary>
            </div>

            <PipelineConnector active={completedSteps.has(2) || currentStep >= 3} />

            <div ref={(el) => { stepRefs.current[3] = el; }}>
              <StepTabs idx={3} />
              {stepTryIt[3] && <TryItEditor code={tryItCode} onChange={setTryItCode} />}
              <ErrorBoundary name="SsaForm">
                {displayMethod(3) && displaySsa(3) ? <SsaForm method={displayMethod(3)!} ssa={displaySsa(3)!} instructions={displayInstructions(3)} isPlaying={playState === 'playing' && currentStep === 3} isCompleted={completedSteps.has(3) || playState === 'completed'} /> : <div className="text-[10px] font-mono text-[var(--color-text-muted)] p-3 border border-[var(--color-border)] rounded">No SSA</div>}
              </ErrorBoundary>
            </div>

            <div className="flex justify-end pt-6 pb-4">
              <button
                onClick={() => navigate('/visualize/codegen')}
                className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold tracking-[0.1em] uppercase font-display border bg-[rgba(0,255,136,0.08)] border-[var(--color-neon)] text-[var(--color-neon)] hover:bg-[var(--color-neon)] hover:text-[var(--color-void)] transition-all"
              >
                Next: Code Generation <ArrowRight size={14} />
              </button>
            </div>
          </div>

          <StepControls
            currentStep={currentStep}
            playState={playState}
            stepNames={OPTIMIZER_STEP_NAMES}
            totalSteps={4}
            onPlay={handlePlay}
            onPause={handlePause}
            onNext={handleNext}
            onPrev={handlePrev}
            onRestart={handleRestart}
            onPlayOnePhase={handlePlayOnePhase}
            playOneDisabled={[0, 1, 2, 3].every(s => completedSteps.has(s))}
          />
        </>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto p-4">
          <ErrorBoundary name="CfgGraph">
            <CfgGraph cfgJson={stepTryIt[0] ? JSON.stringify({ methods: [tryItMethod] }) : (result?.cfgJson ?? '')} />
          </ErrorBoundary>
        </div>
      )}
    </div>
  );
};

export default CfgPanel;
