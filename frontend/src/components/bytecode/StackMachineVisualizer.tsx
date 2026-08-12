import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Layers } from 'lucide-react';
import type { BytecodeMethod } from '../../lib/cfg/bytecodeParser';
import type { ExecutionTrace } from '../../lib/cfg/stackMachine';
import { simulateExecution } from '../../lib/cfg/stackMachine';

interface StackMachineVisualizerProps {
  method: BytecodeMethod;
  isPlaying: boolean;
  isCompleted: boolean;
}

const StackMachineVisualizer: React.FC<StackMachineVisualizerProps> = ({ method, isPlaying, isCompleted }) => {
  const { t } = useTranslation();
  const [visibleSteps, setVisibleSteps] = useState<Set<number>>(new Set());
  const [activeStep, setActiveStep] = useState<number>(-1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trace: ExecutionTrace = simulateExecution(method.instructions, method.maxLocals);

  useEffect(() => {
    if (!isPlaying) {
      if (isCompleted) {
        setVisibleSteps(new Set(trace.steps.map((_, i) => i)));
        setActiveStep(trace.steps.length - 1);
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

  return (
    <div className="flex flex-col gap-3">
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

      {/* Live stack visualization */}
      <div className="flex gap-4 px-1">
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] p-3 flex-1">
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

        <div className="bg-[var(--color-card)] border border-[var(--color-border)] p-3 flex-1">
          <div className="text-[9px] text-[#00FF88] font-bold font-display tracking-[0.1em] uppercase mb-2">
            Local Variables
          </div>
          <div className="flex flex-col gap-0.5">
            {currentStep ? currentStep.locals.map((val, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px] font-mono">
                <span className="text-[var(--color-text-muted)] w-6">L{i}:</span>
                <span className="text-[#00FF88]">{String(val)}</span>
              </div>
            )) : (
              <div className="text-[9px] text-[var(--color-text-muted)] font-mono">empty</div>
            )}
          </div>
        </div>
      </div>

      {/* Execution trace */}
      <div className="bg-[var(--color-card)] border border-[var(--color-border)] overflow-hidden">
        <div className="grid gap-px bg-[var(--color-border)]" style={{ gridTemplateColumns: '40px 80px 1fr 100px' }}>
          <div className="bg-[var(--color-surface-2)] px-2 py-1.5 text-[9px] font-bold text-[var(--color-text-muted)] font-display uppercase">PC</div>
          <div className="bg-[var(--color-surface-2)] px-2 py-1.5 text-[9px] font-bold text-[#00D4FF] font-display uppercase">Opcode</div>
          <div className="bg-[var(--color-surface-2)] px-2 py-1.5 text-[9px] font-bold text-[var(--color-text)] font-display uppercase">Description</div>
          <div className="bg-[var(--color-surface-2)] px-2 py-1.5 text-[9px] font-bold text-[#00D4FF] font-display uppercase">Stack</div>

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
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StackMachineVisualizer;
