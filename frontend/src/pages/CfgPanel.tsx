import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useCompile } from '../context/CompileContext';
import { GitFork } from 'lucide-react';
import type { PlayState } from '../lib/lexer/types';
import type { CfgMethod } from '../types';
import StepControls from '../components/lexical/StepControls';
import PipelineConnector from '../components/lexical/PipelineConnector';
import CfgBasicBlocks from '../components/cfg/CfgBasicBlocks';
import DominatorTree from '../components/cfg/DominatorTree';
import SsaForm from '../components/cfg/SsaForm';
import DataFlowAnalysis from '../components/cfg/DataFlowAnalysis';
import InstructionScheduling from '../components/cfg/InstructionScheduling';
import CfgGraph from '../components/CfgGraph';
import ErrorBoundary from '../components/ErrorBoundary';
import { computeDominators } from '../lib/cfg/dominators';
import { buildSsa } from '../lib/cfg/ssa';
import { runLivenessAnalysis } from '../lib/cfg/dataflow';
import { computeSchedule } from '../lib/cfg/scheduling';
import { buildCfgTryItData } from '../lib/cfg/cfgTryIt';
import { buildCodegenTryItData } from '../lib/codegen/codegenTryIt';

const STEP_DELAYS = [3000, 4000, 4000, 4000, 4000];
const OPTIMIZER_STEP_NAMES = ['CFG', 'Dominators', 'SSA', 'Data Flow', 'Scheduling'];

function parseCfg(jsonStr: string): CfgMethod[] | null {
  try {
    const data = JSON.parse(jsonStr);
    if (data.error) return null;
    return data.methods || null;
  } catch { return null; }
}

const CfgPanel: React.FC = () => {
  const { t } = useTranslation();
  const { result, loading } = useCompile();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('view') === 'static' ? 'static' : 'pipeline';
  const [currentStep, setCurrentStep] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [playState, setPlayState] = useState<PlayState>('idle');
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [tryItCode] = useState('int s=0; for(int i=0;i<n;i++) s+=a[i];');
  const [stepTryIt, setStepTryIt] = useState<boolean[]>([false,false,false,false,false]);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const autoplayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toggleStepTryIt = (idx: number, on: boolean) => setStepTryIt(prev => { const n=[...prev]; n[idx]=on; return n; });

  const tryItCfg = useMemo(() => buildCfgTryItData(tryItCode), [tryItCode]);
  const tryItMethod = tryItCfg.methods[0] ?? null;
  const tryItCodegen = useMemo(() => buildCodegenTryItData(tryItCode), [tryItCode]);
  const tryItDominators = useMemo(() => tryItMethod ? computeDominators(tryItMethod) : null, [tryItMethod]);
  const tryItSsa = useMemo(() => tryItMethod ? buildSsa(tryItMethod, tryItCodegen.instructions, tryItCodegen.basicBlocks) : null, [tryItMethod, tryItCodegen]);
  const tryItDataFlow = useMemo(() => tryItMethod ? runLivenessAnalysis(tryItMethod) : null, [tryItMethod]);
  const tryItScheduling = useMemo(() => computeSchedule(tryItCodegen.instructions), [tryItCodegen]);

  useEffect(() => {
    return () => { if (autoplayTimer.current) clearTimeout(autoplayTimer.current); };
  }, []);

  const methods = useMemo(() => {
    if (!result?.cfgJson) return null;
    return parseCfg(result.cfgJson);
  }, [result]);

  const currentMethod = methods && methods.length > 0 ? methods[0] : null;

  const dominators = useMemo(() => {
    if (!currentMethod) return null;
    return computeDominators(currentMethod);
  }, [currentMethod]);

  const ssa = useMemo(() => {
    if (!currentMethod || !result?.codeGenerationData) return null;
    return buildSsa(currentMethod, result.codeGenerationData.instructions, result.codeGenerationData.basicBlocks);
  }, [currentMethod, result]);

  const dataFlow = useMemo(() => {
    if (!currentMethod) return null;
    return runLivenessAnalysis(currentMethod);
  }, [currentMethod]);

  const scheduling = useMemo(() => {
    if (!currentMethod || !result?.codeGenerationData?.instructions?.length) return null;
    return computeSchedule(result.codeGenerationData.instructions);
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

  const handlePlayOnePhase = useCallback(() => {
    if (autoplayTimer.current) { clearTimeout(autoplayTimer.current); autoplayTimer.current = null; }

    let step = currentStep;
    while (step < 4 && completedSteps.has(step)) step++;
    if (completedSteps.has(step)) return;

    setCurrentStep(step as 0 | 1 | 2 | 3 | 4);
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
    if (currentStep < 4) {
      const next = (currentStep + 1) as 0 | 1 | 2 | 3 | 4;
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      setCurrentStep(next);
      scrollToStep(next);
    }
  }, [currentStep, scrollToStep]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((currentStep - 1) as 0 | 1 | 2 | 3 | 4);
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

  const StepTabs: React.FC<{ idx: number }> = ({ idx }) => {
    const isTry = stepTryIt[idx];
    return (
      <div className="flex gap-1.5 mb-2">
        <button onClick={() => toggleStepTryIt(idx, false)} className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold tracking-wide border ${!isTry ? 'bg-[var(--color-neon-dim)] text-[var(--color-neon)] border-[var(--color-neon)]' : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border-bright)]'}`}>Your Program</button>
        <button onClick={() => toggleStepTryIt(idx, true)} className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold tracking-wide border ${isTry ? 'bg-[var(--color-neon-dim)] text-[var(--color-neon)] border-[var(--color-neon)]' : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border-bright)]'}`}>Try It</button>
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

  const hasBackend = !!result?.cfgJson && !!currentMethod && !!dominators && !!ssa && !!dataFlow && !!scheduling;
  if (!hasBackend && !tryItMethod) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-muted)] text-center gap-3">
        <GitFork size={48} className="text-[var(--color-neon)] opacity-30" />
        <div className="font-mono text-sm">{t('cfg.noCfg')}</div>
      </div>
    );
  }

  const displayMethod = (idx: number) => stepTryIt[idx] ? tryItMethod : currentMethod;
  const displayDominators = (idx: number) => stepTryIt[idx] ? tryItDominators : dominators;
  const displaySsa = (idx: number) => stepTryIt[idx] ? tryItSsa : ssa;
  const displayDataFlow = (idx: number) => stepTryIt[idx] ? tryItDataFlow : dataFlow;
  const displayScheduling = (idx: number) => stepTryIt[idx] ? tryItScheduling : scheduling;
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
              <ErrorBoundary name="CfgBasicBlocks">
                {displayMethod(0) ? <CfgBasicBlocks method={displayMethod(0)!} isPlaying={playState === 'playing' && currentStep === 0} isCompleted={completedSteps.has(0) || playState === 'completed'} /> : <div className="text-[10px] font-mono text-[var(--color-text-muted)] p-3 border border-[var(--color-border)] rounded">No CFG</div>}
              </ErrorBoundary>
            </div>

            <PipelineConnector active={completedSteps.has(0) || currentStep >= 1} />

            <div ref={(el) => { stepRefs.current[1] = el; }}>
              <StepTabs idx={1} />
              <ErrorBoundary name="DominatorTree">
                {displayMethod(1) && displayDominators(1) ? <DominatorTree method={displayMethod(1)!} dominators={displayDominators(1)!} isPlaying={playState === 'playing' && currentStep === 1} isCompleted={completedSteps.has(1) || playState === 'completed'} /> : <div className="text-[10px] font-mono text-[var(--color-text-muted)] p-3 border border-[var(--color-border)] rounded">No dominators</div>}
              </ErrorBoundary>
            </div>

            <PipelineConnector active={completedSteps.has(1) || currentStep >= 2} />

            <div ref={(el) => { stepRefs.current[2] = el; }}>
              <StepTabs idx={2} />
              <ErrorBoundary name="SsaForm">
                {displayMethod(2) && displaySsa(2) ? <SsaForm method={displayMethod(2)!} ssa={displaySsa(2)!} instructions={displayInstructions(2)} isPlaying={playState === 'playing' && currentStep === 2} isCompleted={completedSteps.has(2) || playState === 'completed'} /> : <div className="text-[10px] font-mono text-[var(--color-text-muted)] p-3 border border-[var(--color-border)] rounded">No SSA</div>}
              </ErrorBoundary>
            </div>

            <PipelineConnector active={completedSteps.has(2) || currentStep >= 3} />

            <div ref={(el) => { stepRefs.current[3] = el; }}>
              <StepTabs idx={3} />
              <ErrorBoundary name="DataFlowAnalysis">
                {displayMethod(3) && displayDataFlow(3) ? <DataFlowAnalysis method={displayMethod(3)!} result={displayDataFlow(3)!} isPlaying={playState === 'playing' && currentStep === 3} isCompleted={completedSteps.has(3) || playState === 'completed'} /> : <div className="text-[10px] font-mono text-[var(--color-text-muted)] p-3 border border-[var(--color-border)] rounded">No data-flow</div>}
              </ErrorBoundary>
            </div>

            <PipelineConnector active={completedSteps.has(3) || currentStep >= 4} />

            <div ref={(el) => { stepRefs.current[4] = el; }}>
              <StepTabs idx={4} />
              <ErrorBoundary name="InstructionScheduling">
                {displayMethod(4) && displayScheduling(4) ? <InstructionScheduling method={displayMethod(4)!} instructions={displayInstructions(4)} scheduling={displayScheduling(4)!} isPlaying={playState === 'playing' && currentStep === 4} isCompleted={completedSteps.has(4) || playState === 'completed'} /> : <div className="text-[10px] font-mono text-[var(--color-text-muted)] p-3 border border-[var(--color-border)] rounded">No schedule</div>}
              </ErrorBoundary>
            </div>
          </div>

          <StepControls
            currentStep={currentStep}
            playState={playState}
            stepNames={OPTIMIZER_STEP_NAMES}
            totalSteps={5}
            onPlay={handlePlay}
            onPause={handlePause}
            onNext={handleNext}
            onPrev={handlePrev}
            onRestart={handleRestart}
            onPlayOnePhase={handlePlayOnePhase}
            playOneDisabled={[0, 1, 2, 3, 4].every(s => completedSteps.has(s))}
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
