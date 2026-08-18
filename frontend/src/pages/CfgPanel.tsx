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
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const autoplayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (autoplayTimer.current) clearTimeout(autoplayTimer.current); };
  }, []);

  // Parse CFG data
  const methods = useMemo(() => {
    if (!result?.cfgJson) return null;
    return parseCfg(result.cfgJson);
  }, [result]);

  const currentMethod = methods && methods.length > 0 ? methods[0] : null;

  // Compute dominators, SSA, and data-flow
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
    if (autoplayTimer.current) { clearTimeout(autoplayTimer.current); autoplayTimer.current = null; }
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

  if (!result?.cfgJson || !currentMethod) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-muted)] text-center gap-3">
        <GitFork size={48} className="text-[var(--color-neon)] opacity-30" />
        <div className="font-mono text-sm">{t('cfg.noCfg')}</div>
      </div>
    );
  }

  if (!dominators || !ssa || !dataFlow || !scheduling) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-muted)] text-center gap-3">
        <GitFork size={48} className="text-[var(--color-neon)] opacity-30" />
        <div className="font-mono text-sm">Computing...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {activeTab === 'pipeline' ? (
        <>
          <div
            className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-2"
            onScroll={handleScroll}
          >
            {/* Step 1: Basic Blocks */}
            <div ref={(el) => { stepRefs.current[0] = el; }}>
              <ErrorBoundary name="CfgBasicBlocks">
                <CfgBasicBlocks
                  method={currentMethod}
                  isPlaying={playState === 'playing' && currentStep === 0}
                  isCompleted={completedSteps.has(0) || playState === 'completed'}
                />
              </ErrorBoundary>
            </div>

            <PipelineConnector active={completedSteps.has(0) || currentStep >= 1} />

            {/* Step 2: Dominator Tree */}
            <div ref={(el) => { stepRefs.current[1] = el; }}>
              <ErrorBoundary name="DominatorTree">
                <DominatorTree
                  method={currentMethod}
                  dominators={dominators}
                  isPlaying={playState === 'playing' && currentStep === 1}
                  isCompleted={completedSteps.has(1) || playState === 'completed'}
                />
              </ErrorBoundary>
            </div>

            <PipelineConnector active={completedSteps.has(1) || currentStep >= 2} />

            {/* Step 3: SSA Form */}
            <div ref={(el) => { stepRefs.current[2] = el; }}>
              <ErrorBoundary name="SsaForm">
                <SsaForm
                  method={currentMethod}
                  ssa={ssa}
                  instructions={result.codeGenerationData?.instructions || []}
                  isPlaying={playState === 'playing' && currentStep === 2}
                  isCompleted={completedSteps.has(2) || playState === 'completed'}
                />
              </ErrorBoundary>
            </div>

            <PipelineConnector active={completedSteps.has(2) || currentStep >= 3} />

            {/* Step 4: Data-Flow Analysis */}
            <div ref={(el) => { stepRefs.current[3] = el; }}>
              <ErrorBoundary name="DataFlowAnalysis">
                <DataFlowAnalysis
                  method={currentMethod}
                  result={dataFlow}
                  isPlaying={playState === 'playing' && currentStep === 3}
                  isCompleted={completedSteps.has(3) || playState === 'completed'}
                />
              </ErrorBoundary>
            </div>

            <PipelineConnector active={completedSteps.has(3) || currentStep >= 4} />

            {/* Step 5: Instruction Scheduling */}
            <div ref={(el) => { stepRefs.current[4] = el; }}>
              <ErrorBoundary name="InstructionScheduling">
                <InstructionScheduling
                  method={currentMethod}
                  instructions={result.codeGenerationData?.instructions || []}
                  scheduling={scheduling}
                  isPlaying={playState === 'playing' && currentStep === 4}
                  isCompleted={completedSteps.has(4) || playState === 'completed'}
                />
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
          />
        </>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto p-4">
          <ErrorBoundary name="CfgGraph">
            <CfgGraph cfgJson={result.cfgJson} />
          </ErrorBoundary>
        </div>
      )}
    </div>
  );
};

export default CfgPanel;
