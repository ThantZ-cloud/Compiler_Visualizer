/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useCompile } from '../context/CompileContext';
import { Code2 } from 'lucide-react';
import type { PlayState } from '../lib/lexer/types';
import StepControls from '../components/lexical/StepControls';
import PipelineConnector from '../components/lexical/PipelineConnector';
import ExpressionDecomposition from '../components/codegen/ExpressionDecomposition';
import TacDisplay from '../components/codegen/TacDisplay';
import BasicBlockBuilder from '../components/codegen/BasicBlockBuilder';
import FlowGraphEdges from '../components/codegen/FlowGraphEdges';
import InstructionScheduling from '../components/codegen/InstructionScheduling';
import RegisterAllocation from '../components/codegen/RegisterAllocation';
import TacCodeViewer from '../components/codegen/TacCodeViewer';
import ErrorBoundary from '../components/ErrorBoundary';
import { computeSchedule } from '../lib/cfg/scheduling';
import { computeRegAllocation } from '../lib/cfg/regalloc';
import { runLivenessAnalysis } from '../lib/cfg/dataflow';
import { buildCodegenTryItData } from '../lib/codegen/codegenTryIt';

const STEP_DELAYS = [3000, 4000, 4000, 5000, 4000, 4000];
const CODEGEN_STEP_NAMES = ['Decomposition', 'TAC', 'Basic Blocks', 'Flow Graph', 'Scheduling', 'Reg Alloc'];

const CodeGenerationPanel: React.FC = () => {
  const { t } = useTranslation();
  const { result, loading } = useCompile();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('view') === 'static' ? 'explorer' : 'pipeline';
  const [currentStep, setCurrentStep] = useState<0 | 1 | 2 | 3 | 4 | 5>(0);
  const [playState, setPlayState] = useState<PlayState>('idle');
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [tryItCode] = useState('int a = b * 2 + c * d;');
  const [stepTryIt, setStepTryIt] = useState<boolean[]>([false,false,false,false,false,false]);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const autoplayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toggleStepTryIt = (idx: number, on: boolean) => setStepTryIt(prev => { const n=[...prev]; n[idx]=on; return n; });

  const tryItData = useMemo(() => buildCodegenTryItData(tryItCode), [tryItCode]);
  const tryItScheduling = useMemo(() => computeSchedule(tryItData.instructions), [tryItData]);
  // fake cfg for tryIt to compute regalloc - build minimal cfg method from tryIt blocks
  const tryItCfgMethod = useMemo(() => ({
    name: 'main',
    declaringType: 'TryIt',
    returnType: 'void',
    kind: 'method',
    parameters: [] as string[],
    blocks: tryItData.basicBlocks.map(b => ({ id: b.id, label: b.label || `B${b.id}`, type: b.type, statements: b.instructions.map(i => tryItData.instructions[i]?.result || '') })),
    edges: tryItData.basicBlocks.flatMap(b => b.edges.map(e => ({ from: b.id, to: e.targetBlockId, label: e.label || '' }))),
  }), [tryItData]);
  const tryItDataflow = useMemo(() => runLivenessAnalysis(tryItCfgMethod as any), [tryItCfgMethod]);
  const tryItAllocation = useMemo(() => computeRegAllocation(tryItCfgMethod as any, tryItData.instructions, tryItDataflow), [tryItCfgMethod, tryItData, tryItDataflow]);

  useEffect(() => { return () => { if (autoplayTimer.current) clearTimeout(autoplayTimer.current); }; }, []);
  const scrollToStep = useCallback((step: number) => { const el = stepRefs.current[step]; if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, []);
  const handlePlay = useCallback(() => {
    setPlayState('playing'); setCurrentStep(0); setCompletedSteps(new Set()); scrollToStep(0);
    let step = 0;
    const advance = () => {
      setCompletedSteps(prev => new Set(prev).add(step));
      if (step < 5) { step++; setCurrentStep(step as 0 | 1 | 2 | 3 | 4 | 5); scrollToStep(step); autoplayTimer.current = setTimeout(advance, STEP_DELAYS[step]); } else setPlayState('completed');
    };
    autoplayTimer.current = setTimeout(advance, STEP_DELAYS[0]);
  }, [scrollToStep]);
  const handlePlayOnePhase = useCallback(() => {
    if (autoplayTimer.current) { clearTimeout(autoplayTimer.current); autoplayTimer.current = null; }
    let step = currentStep; while (step < 5 && completedSteps.has(step)) step++; if (completedSteps.has(step)) return;
    setCurrentStep(step as 0 | 1 | 2 | 3 | 4 | 5); setPlayState('playing'); scrollToStep(step);
    autoplayTimer.current = setTimeout(() => { setCompletedSteps(prev => new Set(prev).add(step)); setPlayState('idle'); autoplayTimer.current = null; }, STEP_DELAYS[step]);
  }, [currentStep, completedSteps, scrollToStep]);
  const handlePause = useCallback(() => { setPlayState('paused'); if (autoplayTimer.current) { clearTimeout(autoplayTimer.current); autoplayTimer.current = null; } }, []);
  const handleNext = useCallback(() => { if (currentStep < 5) { const next = (currentStep + 1) as 0 | 1 | 2 | 3 | 4 | 5; setCompletedSteps(prev => new Set(prev).add(currentStep)); setCurrentStep(next); scrollToStep(next); } }, [currentStep, scrollToStep]);
  const handlePrev = useCallback(() => { if (currentStep > 0) { setCurrentStep((currentStep - 1) as 0 | 1 | 2 | 3 | 4 | 5); scrollToStep(currentStep - 1); } }, [currentStep, scrollToStep]);
  const handleRestart = useCallback(() => { if (autoplayTimer.current) clearTimeout(autoplayTimer.current); setPlayState('idle'); setCurrentStep(0); setCompletedSteps(new Set()); scrollToStep(0); }, [scrollToStep]);
  const handleScroll = useCallback(() => {
    if (playState === 'playing') return;
    const container = stepRefs.current[0]?.parentElement; if (!container) return;
    for (let i = 0; i < 6; i++) { const el = stepRefs.current[i]; if (el) { const rect = el.getBoundingClientRect(); const containerRect = container.getBoundingClientRect(); const relativeTop = rect.top - containerRect.top; if (relativeTop > -100 && relativeTop < containerRect.height / 2) { setCurrentStep(i as 0 | 1 | 2 | 3 | 4 | 5); break; } } }
  }, [playState]);

  const data = result?.codeGenerationData;
  const scheduling = useMemo(() => data ? computeSchedule(data.instructions) : null, [data]);
  const dataflow = useMemo(() => {
    if (result?.cfgJson) { try { const cfg = typeof result.cfgJson === 'string' ? JSON.parse(result.cfgJson) : result.cfgJson; if (cfg?.methods?.[0]) return runLivenessAnalysis(cfg.methods[0]); } catch { /* ignore */ } }
    return null;
  }, [result?.cfgJson]);
  const allocation = useMemo(() => dataflow && result?.cfgJson && data ? (() => { const cfg = typeof result.cfgJson === 'string' ? JSON.parse(result.cfgJson) : result.cfgJson; return cfg?.methods?.[0] ? computeRegAllocation(cfg.methods[0], data.instructions, dataflow) : null; })() : null, [dataflow, data, result?.cfgJson]);

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

  if (loading) return <div className="flex items-center justify-center h-full"><div className="text-[var(--color-text-muted)] font-mono text-sm animate-pulse">{t('editor.compiling')}...</div></div>;
  if (!hasBackend && !tryItData) return <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-muted)] text-center gap-3"><Code2 size={48} className="text-[var(--color-neon)] opacity-30" /><div className="font-mono text-sm">{t('codegen.noData')}</div></div>;

  const displayData = (idx: number) => stepTryIt[idx] ? tryItData : data;
  const displayScheduling = (idx: number) => stepTryIt[idx] ? tryItScheduling : scheduling;
  const displayAllocation = (idx: number) => stepTryIt[idx] ? tryItAllocation : allocation;

  return (
    <div className="flex flex-col h-full min-h-0">
      {activeTab === 'pipeline' ? (
        <>
          <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 py-3 space-y-2" onScroll={handleScroll}>

            <div ref={(el) => { stepRefs.current[0] = el; }}><StepTabs idx={0} /><ErrorBoundary name="ExpressionDecomposition"><ExpressionDecomposition data={displayData(0) as any} isPlaying={playState === 'playing' && currentStep === 0} isCompleted={completedSteps.has(0) || playState === 'completed'} /></ErrorBoundary></div>
            <PipelineConnector active={completedSteps.has(0) || currentStep >= 1} />
            <div ref={(el) => { stepRefs.current[1] = el; }}><StepTabs idx={1} /><ErrorBoundary name="TacDisplay"><TacDisplay data={displayData(1) as any} isPlaying={playState === 'playing' && currentStep === 1} isCompleted={completedSteps.has(1) || playState === 'completed'} /></ErrorBoundary></div>
            <PipelineConnector active={completedSteps.has(1) || currentStep >= 2} />
            <div ref={(el) => { stepRefs.current[2] = el; }}><StepTabs idx={2} /><ErrorBoundary name="BasicBlockBuilder"><BasicBlockBuilder data={displayData(2) as any} isPlaying={playState === 'playing' && currentStep === 2} isCompleted={completedSteps.has(2) || playState === 'completed'} /></ErrorBoundary></div>
            <PipelineConnector active={completedSteps.has(2) || currentStep >= 3} />
            <div ref={(el) => { stepRefs.current[3] = el; }}><StepTabs idx={3} /><ErrorBoundary name="FlowGraphEdges"><FlowGraphEdges data={displayData(3) as any} isPlaying={playState === 'playing' && currentStep === 3} isCompleted={completedSteps.has(3) || playState === 'completed'} /></ErrorBoundary></div>
            <PipelineConnector active={completedSteps.has(3) || currentStep >= 4} />
            <div ref={(el) => { stepRefs.current[4] = el; }}><StepTabs idx={4} /><ErrorBoundary name="InstructionScheduling">{displayScheduling(4) ? <InstructionScheduling data={displayData(4) as any} scheduling={displayScheduling(4) as any} isPlaying={playState === 'playing' && currentStep === 4} isCompleted={completedSteps.has(4) || playState === 'completed'} /> : <div className="text-[10px] text-[var(--color-text-muted)] font-mono p-3 bg-[var(--color-card)] border border-[var(--color-border)]">{t('codegen.scheduling.noData', 'Computing instruction schedule...')}</div>}</ErrorBoundary></div>
            <PipelineConnector active={completedSteps.has(4) || currentStep >= 5} />
            <div ref={(el) => { stepRefs.current[5] = el; }}><StepTabs idx={5} /><ErrorBoundary name="RegisterAllocation">{displayAllocation(5) ? <RegisterAllocation allocation={displayAllocation(5) as any} isPlaying={playState === 'playing' && currentStep === 5} isCompleted={completedSteps.has(5) || playState === 'completed'} /> : <div className="text-[10px] text-[var(--color-text-muted)] font-mono p-3 bg-[var(--color-card)] border border-[var(--color-border)]">{t('codegen.regalloc.noData', 'Register allocation requires CFG data for liveness analysis.')}</div>}</ErrorBoundary></div>
            <PipelineConnector active={completedSteps.has(5) || playState === 'completed'} />
            <div className="bg-[var(--color-card)] border border-[var(--color-border)] p-3">
              <div className="flex items-center gap-2 mb-2"><Code2 size={12} className="text-[var(--color-neon)]" /><div className="text-[9px] text-[var(--color-neon)] font-bold font-display tracking-[0.15em] uppercase">{t('codegen.interactions.title')}</div></div>
              <p className="text-[10px] text-[var(--color-text-dim)] font-mono leading-relaxed m-0">{t('codegen.interactions.description')}</p>
            </div>
          </div>
          <StepControls currentStep={currentStep} playState={playState} stepNames={CODEGEN_STEP_NAMES} totalSteps={6} onPlay={handlePlay} onPause={handlePause} onNext={handleNext} onPrev={handlePrev} onRestart={handleRestart} onPlayOnePhase={handlePlayOnePhase} playOneDisabled={[0,1,2,3,4,5].every(s=>completedSteps.has(s))} />
        </>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto p-4"><ErrorBoundary name="TacCodeViewer"><TacCodeViewer data={(stepTryIt[0] ? tryItData : data) as any} /></ErrorBoundary></div>
      )}
    </div>
  );
};

export default CodeGenerationPanel;
