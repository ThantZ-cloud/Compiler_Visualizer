import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useCompile } from '../context/CompileContext';
import { Binary } from 'lucide-react';
import type { PlayState } from '../lib/lexer/types';
import StepControls from '../components/lexical/StepControls';
import PipelineConnector from '../components/lexical/PipelineConnector';
import BytecodeListing from '../components/bytecode/BytecodeListing';
import StackMachineVisualizer from '../components/bytecode/StackMachineVisualizer';
import ExecutionFlow from '../components/bytecode/ExecutionFlow';
import ExampleBlock from '../components/examples/ExampleBlock';
import ErrorBoundary from '../components/ErrorBoundary';
import { parseBytecode } from '../lib/cfg/bytecodeParser';
import { simulateExecution } from '../lib/cfg/stackMachine';

const BASE_STEP_DELAYS = [3000, 4000, 5000];
const BYTECODE_STEP_NAMES = ['Bytecode Listing', 'Stack Machine', 'Execution Flow'];

const BytecodePanel: React.FC = () => {
  const { t } = useTranslation();
  const { result, loading, selectedClass, setSelectedClass } = useCompile();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('view') === 'static' ? 'explorer' : 'pipeline';
  const [currentStep, setCurrentStep] = useState<0 | 1 | 2>(0);
  const [playState, setPlayState] = useState<PlayState>('idle');
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [showExamples, setShowExamples] = useState(false);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const autoplayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { return () => { if (autoplayTimer.current) clearTimeout(autoplayTimer.current); }; }, []);
  const scrollToStep = useCallback((step: number) => { const el = stepRefs.current[step]; if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, []);

  const classes = result?.classes || [];
  const bytecodeMap = result?.allBytecode || {};
  const hasMultipleClasses = classes.length > 1;
  const activeClass = selectedClass || classes[0]?.name || '';
  const displayedBytecode = hasMultipleClasses ? (bytecodeMap[activeClass] || result?.bytecode) : result?.bytecode;
  const parsed = useMemo(() => displayedBytecode ? parseBytecode(displayedBytecode) : null, [displayedBytecode]);
  const firstMethod = parsed?.methods[0] || null;

  const handlePlay = useCallback(() => {
    setPlayState('playing'); setCurrentStep(0); setCompletedSteps(new Set()); scrollToStep(0);
    const stepDelays = [...BASE_STEP_DELAYS];
    if (firstMethod) { const traceSteps = simulateExecution(firstMethod.instructions, firstMethod.maxLocals).steps.length; if (traceSteps > 0) { const msPerStep = Math.max(120, Math.min(600, Math.floor(10000 / traceSteps))); stepDelays[1] = traceSteps * msPerStep + 1500; } }
    let step = 0;
    const advance = () => {
      setCompletedSteps(prev => new Set(prev).add(step));
      if (step < 2) { step++; setCurrentStep(step as 0 | 1 | 2); scrollToStep(step); autoplayTimer.current = setTimeout(advance, stepDelays[step]); } else setPlayState('completed');
    };
    autoplayTimer.current = setTimeout(advance, stepDelays[0]);
  }, [scrollToStep, firstMethod]);
  const handlePlayOnePhase = useCallback(() => {
    if (autoplayTimer.current) { clearTimeout(autoplayTimer.current); autoplayTimer.current = null; }
    let step = currentStep; while (step < 2 && completedSteps.has(step)) step++; if (completedSteps.has(step)) return;
    setCurrentStep(step as 0 | 1 | 2); setPlayState('playing'); scrollToStep(step);
    const stepDelays = [...BASE_STEP_DELAYS];
    if (firstMethod) { const traceSteps = simulateExecution(firstMethod.instructions, firstMethod.maxLocals).steps.length; if (traceSteps > 0) { const msPerStep = Math.max(120, Math.min(600, Math.floor(10000 / traceSteps))); stepDelays[1] = traceSteps * msPerStep + 1500; } }
    autoplayTimer.current = setTimeout(() => { setCompletedSteps(prev => new Set(prev).add(step)); setPlayState('idle'); autoplayTimer.current = null; }, stepDelays[step]);
  }, [currentStep, completedSteps, scrollToStep, firstMethod]);
  const handlePause = useCallback(() => { setPlayState('paused'); if (autoplayTimer.current) { clearTimeout(autoplayTimer.current); autoplayTimer.current = null; } }, []);
  const handleNext = useCallback(() => { if (currentStep < 2) { const next = (currentStep + 1) as 0 | 1 | 2; setCompletedSteps(prev => new Set(prev).add(currentStep)); setCurrentStep(next); scrollToStep(next); } }, [currentStep, scrollToStep]);
  const handlePrev = useCallback(() => { if (currentStep > 0) { setCurrentStep((currentStep - 1) as 0 | 1 | 2); scrollToStep(currentStep - 1); } }, [currentStep, scrollToStep]);
  const handleRestart = useCallback(() => { if (autoplayTimer.current) clearTimeout(autoplayTimer.current); setPlayState('idle'); setCurrentStep(0); setCompletedSteps(new Set()); scrollToStep(0); }, [scrollToStep]);
  const handleScroll = useCallback(() => {
    if (playState === 'playing') return;
    const container = stepRefs.current[0]?.parentElement; if (!container) return;
    for (let i = 0; i < 3; i++) { const el = stepRefs.current[i]; if (el) { const rect = el.getBoundingClientRect(); const containerRect = container.getBoundingClientRect(); const relativeTop = rect.top - containerRect.top; if (relativeTop > -100 && relativeTop < containerRect.height / 2) { setCurrentStep(i as 0 | 1 | 2); break; } } }
  }, [playState]);

  const BYTECODE_EXAMPLE_STEPS = [
    { title: 'Listing', description: 'javap output: each line is one JVM instruction with its offset and opcode.', highlight: '0: iload_1\n1: iload_2\n2: iadd\n3: ireturn' },
    { title: 'Stack', description: 'JVM is a stack machine: iload pushes, iadd pops two and pushes result. Watch the stack height.', highlight: 'stack: [] → [a] → [a,b] → [a+b]' },
    { title: 'Flow', description: 'Executed step by step; locals and stack update per instruction. Your edit changes the trace.' },
  ];

  if (loading) return <div className="flex items-center justify-center h-full"><div className="text-[var(--color-text-muted)] font-mono text-sm animate-pulse">{t('editor.compiling')}...</div></div>;
  if (!result?.bytecode) return <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-muted)] text-center gap-3"><Binary size={48} className="text-[var(--color-neon)] opacity-30" /><div className="font-mono text-sm">{t('bytecode.noBytecode')}</div></div>;

  return (
    <div className="flex flex-col h-full min-h-0">
      {hasMultipleClasses && (
        <div className="flex gap-1 shrink-0 overflow-x-auto px-4 pt-2">
          {classes.map((cls) => (
            <button key={cls.name} onClick={() => setSelectedClass(cls.name)} className={`px-3 py-1.5 text-xs font-mono rounded transition-all whitespace-nowrap ${activeClass === cls.name ? 'bg-[var(--color-neon)] text-[var(--color-void)] font-bold' : 'bg-[var(--color-card)] text-[var(--color-text-muted)] border border-[var(--color-border)] hover:border-[var(--color-neon)] hover:text-[var(--color-neon)]'}`}>{cls.name}</button>
          ))}
        </div>
      )}
      {activeTab === 'pipeline' ? (
        <>
          <div className="flex gap-1.5 mb-3 px-1 shrink-0">
            <button onClick={() => setShowExamples(false)} className={`px-3 py-1.5 rounded text-[10px] font-mono font-bold tracking-wide border ${!showExamples ? 'bg-[var(--color-neon-dim)] text-[var(--color-neon)] border-[var(--color-neon)]' : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border-bright)]'}`}>Pipeline</button>
            <button onClick={() => setShowExamples(true)} className={`px-3 py-1.5 rounded text-[10px] font-mono font-bold tracking-wide border ${showExamples ? 'bg-[var(--color-neon-dim)] text-[var(--color-neon)] border-[var(--color-neon)]' : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border-bright)]'}`}>Examples</button>
          </div>
          {showExamples ? (
            <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 py-3"><ExampleBlock phase="Bytecode" defaultCode={`int add(int a, int b) {\n  return a + b;\n}`} steps={BYTECODE_EXAMPLE_STEPS} /></div>
          ) : (
            <>
              <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 py-3 space-y-2" onScroll={handleScroll}>
                <div ref={(el) => { stepRefs.current[0] = el; }}><ErrorBoundary name="BytecodeListing"><BytecodeListing bytecode={parsed!} isPlaying={playState === 'playing' && currentStep === 0} isCompleted={completedSteps.has(0) || playState === 'completed'} /></ErrorBoundary></div>
                <PipelineConnector active={completedSteps.has(0) || currentStep >= 1} />
                <div ref={(el) => { stepRefs.current[1] = el; }}><ErrorBoundary name="StackMachineVisualizer">{firstMethod ? <StackMachineVisualizer method={firstMethod} isPlaying={playState === 'playing' && currentStep === 1} isCompleted={completedSteps.has(1) || playState === 'completed'} /> : <div className="text-[10px] text-[var(--color-text-muted)] font-mono p-3 bg-[var(--color-card)] border border-[var(--color-border)]">{t('bytecode.pipeline.noMethods', 'No methods found in bytecode.')}</div>}</ErrorBoundary></div>
                <PipelineConnector active={completedSteps.has(1) || currentStep >= 2} />
                <div ref={(el) => { stepRefs.current[2] = el; }}><ErrorBoundary name="ExecutionFlow">{firstMethod ? <ExecutionFlow method={firstMethod} isPlaying={playState === 'playing' && currentStep === 2} isCompleted={completedSteps.has(2) || playState === 'completed'} /> : <div className="text-[10px] text-[var(--color-text-muted)] font-mono p-3 bg-[var(--color-card)] border border-[var(--color-border)]">{t('bytecode.pipeline.noMethods', 'No methods found in bytecode.')}</div>}</ErrorBoundary></div>
              </div>
              <StepControls currentStep={currentStep} playState={playState} stepNames={BYTECODE_STEP_NAMES} totalSteps={3} onPlay={handlePlay} onPause={handlePause} onNext={handleNext} onPrev={handlePrev} onRestart={handleRestart} onPlayOnePhase={handlePlayOnePhase} playOneDisabled={[0,1,2].every(s=>completedSteps.has(s))} />
            </>
          )}
        </>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto p-4"><pre className="font-mono text-xs leading-[1.7] text-[var(--color-neon)] bg-[var(--color-card)] border border-[var(--color-border)] p-4 overflow-auto whitespace-pre-wrap break-all m-0">{displayedBytecode}</pre></div>
      )}
    </div>
  );
};

export default BytecodePanel;
