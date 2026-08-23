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
import ExampleBlock from '../components/examples/ExampleBlock';
import ErrorBoundary from '../components/ErrorBoundary';
import { computeSchedule } from '../lib/cfg/scheduling';
import { computeRegAllocation } from '../lib/cfg/regalloc';
import { runLivenessAnalysis } from '../lib/cfg/dataflow';

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
  const [showExamples, setShowExamples] = useState(false);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const autoplayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const CODEGEN_EXAMPLE_STEPS = [
    { title: 'Decompose', description: 'Break a = b*2 + c*d into three-address code: each line has at most one operator.', highlight: 't1 = b * 2\nt2 = c * d\nt3 = t1 + t2\na = t3' },
    { title: 'Blocks', description: 'Group TAC into basic blocks — one entry, one exit. A branch or label starts a new block.' },
    { title: 'Flow', description: 'Connect blocks with arrows: fall-through, conditional true/false, loop back. This is your CFG for this method.' },
    { title: 'Schedule', description: 'Reorder instructions to avoid stalls while keeping dependencies. Loads move earlier to hide latency.' },
    { title: 'Registers', description: 'Graph coloring gives each live value a register. Two values live at the same time cannot share a register — one spills to memory.' },
  ];

  if (loading) return <div className="flex items-center justify-center h-full"><div className="text-[var(--color-text-muted)] font-mono text-sm animate-pulse">{t('editor.compiling')}...</div></div>;
  if (!data || data.instructions.length === 0) return <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-muted)] text-center gap-3"><Code2 size={48} className="text-[var(--color-neon)] opacity-30" /><div className="font-mono text-sm">{t('codegen.noData')}</div></div>;

  return (
    <div className="flex flex-col h-full min-h-0">
      {activeTab === 'pipeline' ? (
        <>
          <div className="flex gap-1.5 mb-3 px-1 shrink-0">
            <button onClick={() => setShowExamples(false)} className={`px-3 py-1.5 rounded text-[10px] font-mono font-bold tracking-wide border ${!showExamples ? 'bg-[var(--color-neon-dim)] text-[var(--color-neon)] border-[var(--color-neon)]' : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border-bright)]'}`}>Pipeline</button>
            <button onClick={() => setShowExamples(true)} className={`px-3 py-1.5 rounded text-[10px] font-mono font-bold tracking-wide border ${showExamples ? 'bg-[var(--color-neon-dim)] text-[var(--color-neon)] border-[var(--color-neon)]' : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border-bright)]'}`}>Examples</button>
          </div>
          {showExamples ? (
            <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 py-3"><ExampleBlock phase="Codegen" defaultCode={`int a = b * 2 + c * d;\nif (a > 10) a = a - 1;`} steps={CODEGEN_EXAMPLE_STEPS} /></div>
          ) : (
            <>
              <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 py-3 space-y-2" onScroll={handleScroll}>
                <div ref={(el) => { stepRefs.current[0] = el; }}><ErrorBoundary name="ExpressionDecomposition"><ExpressionDecomposition data={data} isPlaying={playState === 'playing' && currentStep === 0} isCompleted={completedSteps.has(0) || playState === 'completed'} /></ErrorBoundary></div>
                <PipelineConnector active={completedSteps.has(0) || currentStep >= 1} />
                <div ref={(el) => { stepRefs.current[1] = el; }}><ErrorBoundary name="TacDisplay"><TacDisplay data={data} isPlaying={playState === 'playing' && currentStep === 1} isCompleted={completedSteps.has(1) || playState === 'completed'} /></ErrorBoundary></div>
                <PipelineConnector active={completedSteps.has(1) || currentStep >= 2} />
                <div ref={(el) => { stepRefs.current[2] = el; }}><ErrorBoundary name="BasicBlockBuilder"><BasicBlockBuilder data={data} isPlaying={playState === 'playing' && currentStep === 2} isCompleted={completedSteps.has(2) || playState === 'completed'} /></ErrorBoundary></div>
                <PipelineConnector active={completedSteps.has(2) || currentStep >= 3} />
                <div ref={(el) => { stepRefs.current[3] = el; }}><ErrorBoundary name="FlowGraphEdges"><FlowGraphEdges data={data} isPlaying={playState === 'playing' && currentStep === 3} isCompleted={completedSteps.has(3) || playState === 'completed'} /></ErrorBoundary></div>
                <PipelineConnector active={completedSteps.has(3) || currentStep >= 4} />
                <div ref={(el) => { stepRefs.current[4] = el; }}><ErrorBoundary name="InstructionScheduling">{scheduling ? <InstructionScheduling data={data} scheduling={scheduling} isPlaying={playState === 'playing' && currentStep === 4} isCompleted={completedSteps.has(4) || playState === 'completed'} /> : <div className="text-[10px] text-[var(--color-text-muted)] font-mono p-3 bg-[var(--color-card)] border border-[var(--color-border)]">{t('codegen.scheduling.noData', 'Computing instruction schedule...')}</div>}</ErrorBoundary></div>
                <PipelineConnector active={completedSteps.has(4) || currentStep >= 5} />
                <div ref={(el) => { stepRefs.current[5] = el; }}><ErrorBoundary name="RegisterAllocation">{allocation ? <RegisterAllocation allocation={allocation} isPlaying={playState === 'playing' && currentStep === 5} isCompleted={completedSteps.has(5) || playState === 'completed'} /> : <div className="text-[10px] text-[var(--color-text-muted)] font-mono p-3 bg-[var(--color-card)] border border-[var(--color-border)]">{t('codegen.regalloc.noData', 'Register allocation requires CFG data for liveness analysis.')}</div>}</ErrorBoundary></div>
                <PipelineConnector active={completedSteps.has(5) || playState === 'completed'} />
                <div className="bg-[var(--color-card)] border border-[var(--color-border)] p-3">
                  <div className="flex items-center gap-2 mb-2"><Code2 size={12} className="text-[var(--color-neon)]" /><div className="text-[9px] text-[var(--color-neon)] font-bold font-display tracking-[0.15em] uppercase">{t('codegen.interactions.title')}</div></div>
                  <p className="text-[10px] text-[var(--color-text-dim)] font-mono leading-relaxed m-0">{t('codegen.interactions.description')}</p>
                </div>
              </div>
              <StepControls currentStep={currentStep} playState={playState} stepNames={CODEGEN_STEP_NAMES} totalSteps={6} onPlay={handlePlay} onPause={handlePause} onNext={handleNext} onPrev={handlePrev} onRestart={handleRestart} onPlayOnePhase={handlePlayOnePhase} playOneDisabled={[0,1,2,3,4,5].every(s=>completedSteps.has(s))} />
            </>
          )}
        </>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto p-4"><ErrorBoundary name="TacCodeViewer"><TacCodeViewer data={data} /></ErrorBoundary></div>
      )}
    </div>
  );
};

export default CodeGenerationPanel;
