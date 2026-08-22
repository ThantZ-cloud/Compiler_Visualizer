import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Layers, ArrowRight } from 'lucide-react';
import type { BytecodeMethod } from '../../lib/cfg/bytecodeParser';
import type { ExecutionTrace } from '../../lib/cfg/stackMachine';
import { simulateExecution } from '../../lib/cfg/stackMachine';

interface StackMachineVisualizerProps {
  method: BytecodeMethod;
  isPlaying: boolean;
  isCompleted: boolean;
  isIdle?: boolean;
}

const StackMachineVisualizer: React.FC<StackMachineVisualizerProps> = ({ method, isPlaying, isCompleted }) => {
  const { t } = useTranslation();
  const [visibleSteps, setVisibleSteps] = useState<Set<number>>(new Set());
  const [activeStep, setActiveStep] = useState<number>(-1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cursorRef = useRef<HTMLDivElement | null>(null);

  const trace: ExecutionTrace = useMemo(() => simulateExecution(method.instructions, method.maxLocals), [method]);

  // Offset → instruction index map
  const offsetMap = useMemo(() => {
    const m = new Map<number, number>();
    method.instructions.forEach((instr, i) => m.set(instr.offset, i));
    return m;
  }, [method]);

  useEffect(() => {
    if (!isPlaying) {
      if (isCompleted) {
        setVisibleSteps(new Set(trace.steps.map((_, i) => i)));
        setActiveStep(trace.steps.length - 1);
      } else {
        setVisibleSteps(new Set());
        setActiveStep(-1);
      }
      return;
    }
    setVisibleSteps(new Set());
    setActiveStep(-1);
    let i = 0;
    const show = () => {
      if (i >= trace.steps.length) return;
      setVisibleSteps(prev => new Set([...prev, i]));
      setActiveStep(i);
      i++;
      timerRef.current = setTimeout(show, 250);
    };
    timerRef.current = setTimeout(show, 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isPlaying, isCompleted, trace]);

  // Auto-scroll cursor into view
  useEffect(() => {
    if (cursorRef.current) {
      cursorRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeStep]);

  const getOpcodeColor = (opcode: string): string => {
    if (opcode.startsWith('if') || opcode === 'goto') return '#FF3366';
    if (opcode.startsWith('invoke')) return '#FFB000';
    if (opcode.includes('load')) return '#00D4FF';
    if (opcode.includes('store')) return '#00FF88';
    if (opcode.startsWith('const') || opcode === 'bipush' || opcode === 'sipush' || opcode === 'ldc') return '#8A2BE2';
    if (opcode.includes('return')) return '#FF00FF';
    if (opcode === 'iadd' || opcode === 'isub' || opcode === 'imul' || opcode === 'idiv') return '#00FF88';
    return '#E0E0F0';
  };

  const currentStep = activeStep >= 0 ? trace.steps[activeStep] : null;
  const currentInstrIdx = currentStep ? offsetMap.get(currentStep.pc) ?? -1 : -1;
  const liveSet = new Set(currentStep?.liveLocals ?? []);
  const maxPressure = trace.maxPressure ?? 0;
  const isBranchTaken = currentStep?.description.includes('→ goto') ?? false;

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-2 px-1">
        <Layers size={14} className="text-[#00D4FF]" />
        <h4 className="text-[11px] font-bold text-[var(--color-text)] font-display tracking-[0.1em] uppercase m-0">
          {t('bytecode.pipeline.stackMachine.title', 'Stack Machine Simulation')}
        </h4>
        <span className="text-[9px] text-[var(--color-text-muted)] font-mono">
          ({trace.totalSteps} steps)
        </span>
      </div>
      <p className="text-[10px] text-[var(--color-text-dim)] font-mono px-1 -mt-1">
        {t('bytecode.pipeline.stackMachine.description', 'JVM executes bytecode using an operand stack. Each instruction pushes/pops values from the stack, transforming the program state.')}
      </p>

      {/* Main grid: instruction list + stack/locals */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-3">
        {/* Left: instruction list with PC cursor */}
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] overflow-hidden flex flex-col">
          {/* Status bar */}
          <div className="px-3 py-2 border-b border-[var(--color-border)] flex items-center justify-between gap-2">
            <span className="text-[9px] font-bold text-[#00D4FF] font-display tracking-[0.1em] uppercase">
              Program Counter
            </span>
            <div className="flex items-center gap-2">
              {currentStep && isBranchTaken && (
                <span className="flex items-center gap-1 text-[8px] font-mono text-[#FF3366] bg-[rgba(255,51,102,0.1)] px-1.5 py-0.5 rounded">
                  <ArrowRight size={9} />
                  BRANCH TAKEN
                </span>
              )}
              {currentStep && (
                <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded ${
                  currentStep.opcode.includes('return')
                    ? 'text-[#FF00FF] bg-[rgba(255,0,255,0.1)]'
                    : 'text-[#00FF88] bg-[rgba(0,255,136,0.1)]'
                }`}>
                  {currentStep.pc}: {currentStep.opcode} {currentStep.operands}
                </span>
              )}
            </div>
          </div>

          {/* Instruction list */}
          <div className="overflow-y-auto max-h-[320px] min-h-[100px]">
            {method.instructions.map((instr, i) => {
              const isExecuted = i <= currentInstrIdx && activeStep >= 0;
              const isCurrent = i === currentInstrIdx && activeStep >= 0;
              return (
                <div
                  key={i}
                  ref={isCurrent ? cursorRef : undefined}
                  className={`flex items-center gap-3 text-[10px] font-mono px-3 py-[3px] transition-colors duration-150 ${
                    isCurrent
                      ? 'bg-[var(--color-neon)] text-[var(--color-void)] font-bold'
                      : isExecuted
                      ? 'text-[var(--color-text-dim)]'
                      : 'text-[var(--color-text)]'
                  }`}
                >
                  <span className={`w-8 text-right shrink-0 ${isExecuted && !isCurrent ? 'text-[var(--color-text-muted)]' : ''}`}>
                    {instr.offset}:
                  </span>
                  <span className={`w-28 shrink-0 ${isCurrent ? '' : ''}`}
                    style={{ color: isCurrent ? undefined : getOpcodeColor(instr.opcode) }}>
                    {instr.opcode}
                  </span>
                  <span className={`${isExecuted && !isCurrent ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-text-dim)]'}`}>
                    {instr.operands}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Status bar */}
          <div className="px-3 py-1.5 border-t border-[var(--color-border)]">
            <span className="text-[9px] font-mono text-[var(--color-text-muted)]">
              {currentStep?.description || '...'}
            </span>
          </div>
        </div>

        {/* Right: stack + locals panels */}
        <div className="flex flex-col gap-3">
          {/* Operand Stack */}
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] p-3">
            <div className="text-[9px] text-[#00D4FF] font-bold font-display tracking-[0.1em] uppercase mb-2">
              Operand Stack
            </div>
            <div className="flex flex-col-reverse gap-0.5 min-h-[40px]">
              {currentStep ? currentStep.afterStack.map((val, i) => (
                <div
                  key={i}
                  className="text-[10px] font-mono px-2 py-0.5 bg-[rgba(0,212,255,0.08)] border border-[rgba(0,212,255,0.2)] text-[#00D4FF] text-center"
                >
                  {String(val)}
                </div>
              )) : (
                <div className="text-[9px] text-[var(--color-text-muted)] font-mono">empty</div>
              )}
            </div>
            {currentStep && (
              <div className="text-[8px] text-[var(--color-text-muted)] font-mono mt-1">
                depth: {currentStep.afterStack.length}
              </div>
            )}
          </div>

          {/* Local Variables */}
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] p-3">
            <div className="text-[9px] text-[#00FF88] font-bold font-display tracking-[0.1em] uppercase mb-2">
              Local Variables
            </div>
            <div className="flex flex-col gap-0.5">
              {currentStep ? currentStep.locals.map((val, i) => {
                const isLive = liveSet.has(i);
                return (
                  <div key={i} className={`flex items-center gap-2 text-[10px] font-mono px-1 rounded transition-colors ${isLive ? 'bg-[rgba(0,255,136,0.08)]' : 'opacity-40'}`}>
                    <span className={`w-6 ${isLive ? 'text-[#00FF88]' : 'text-[var(--color-text-muted)]'}`}>L{i}:</span>
                    <span className={isLive ? 'text-[#00FF88] font-bold' : 'text-[var(--color-text-muted)]'}>{String(val)}</span>
                    {isLive && <span className="text-[7px] text-[#00FF88] uppercase tracking-wider">live</span>}
                  </div>
                );
              }) : (
                <div className="text-[9px] text-[var(--color-text-muted)] font-mono">empty</div>
              )}
            </div>
            <div className="text-[8px] text-[var(--color-text-muted)] font-mono mt-1">
              register pressure: {liveSet.size} live / max {maxPressure}
            </div>
          </div>
        </div>
      </div>

      {/* Execution trace table */}
      <div className="bg-[var(--color-card)] border border-[var(--color-border)] overflow-x-auto">
        <div className="grid gap-px bg-[var(--color-border)] min-w-[520px]" style={{ gridTemplateColumns: '40px 80px 1fr 100px 90px' }}>
          <div className="bg-[var(--color-surface-2)] px-2 py-1.5 text-[9px] font-bold text-[var(--color-text-muted)] font-display uppercase">PC</div>
          <div className="bg-[var(--color-surface-2)] px-2 py-1.5 text-[9px] font-bold text-[#00D4FF] font-display uppercase">Opcode</div>
          <div className="bg-[var(--color-surface-2)] px-2 py-1.5 text-[9px] font-bold text-[var(--color-text)] font-display uppercase">Description</div>
          <div className="bg-[var(--color-surface-2)] px-2 py-1.5 text-[9px] font-bold text-[#00D4FF] font-display uppercase">Stack</div>
          <div className="bg-[var(--color-surface-2)] px-2 py-1.5 text-[9px] font-bold text-[#00FF88] font-display uppercase">Live locals</div>

          {trace.steps.map((step, i) => {
            const visible = visibleSteps.has(i);
            const isActive = activeStep === i;
            return (
              <React.Fragment key={i}>
                <div className={`px-2 py-1 text-[10px] font-mono transition-colors duration-200 ${
                  isActive ? 'bg-[rgba(0,212,255,0.08)] text-[#00D4FF]' : 'bg-[var(--color-card)] text-[var(--color-text-muted)]'
                } ${visible ? 'opacity-100' : 'opacity-0'}`}>
                  {step.pc}
                </div>
                <div className={`px-2 py-1 text-[10px] font-mono bg-[var(--color-card)] ${visible ? 'opacity-100' : 'opacity-0'}`}
                  style={{ color: getOpcodeColor(step.opcode) }}>
                  {step.opcode}
                </div>
                <div className={`px-2 py-1 text-[10px] font-mono bg-[var(--color-card)] text-[var(--color-text-dim)] ${visible ? 'opacity-100' : 'opacity-0'}`}>
                  {step.description}
                </div>
                <div className={`px-2 py-1 text-[9px] font-mono bg-[var(--color-card)] text-[#00D4FF] ${visible ? 'opacity-100' : 'opacity-0'}`}>
                  [{step.afterStack.join(', ')}]
                </div>
                <div className={`px-2 py-1 text-[9px] font-mono bg-[var(--color-card)] ${isActive ? 'text-[#00FF88]' : 'text-[var(--color-text-muted)]'} ${visible ? 'opacity-100' : 'opacity-0'}`}>
                  {step.liveLocals.length > 0 ? step.liveLocals.map(l => `L${l}`).join(' ') : '—'}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StackMachineVisualizer;
