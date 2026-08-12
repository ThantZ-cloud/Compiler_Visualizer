import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Play } from 'lucide-react';
import type { BytecodeMethod } from '../../lib/cfg/bytecodeParser';
import type { ExecutionTrace } from '../../lib/cfg/stackMachine';
import { simulateExecution } from '../../lib/cfg/stackMachine';

interface ExecutionFlowProps {
  method: BytecodeMethod;
  isPlaying: boolean;
  isCompleted: boolean;
}

const ExecutionFlow: React.FC<ExecutionFlowProps> = ({ method, isPlaying, isCompleted }) => {
  const { t } = useTranslation();
  const [visibleSteps, setVisibleSteps] = useState<Set<number>>(new Set());
  const [activeIdx, setActiveIdx] = useState<number>(-1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trace: ExecutionTrace = simulateExecution(method.instructions, method.maxLocals);

  useEffect(() => {
    if (!isPlaying) {
      if (isCompleted) {
        setVisibleSteps(new Set(trace.steps.map((_, i) => i)));
        setActiveIdx(trace.steps.length - 1);
      }
      return;
    }
    setVisibleSteps(new Set());
    setActiveIdx(-1);
    let i = 0;
    const show = () => {
      if (i >= trace.steps.length) return;
      setVisibleSteps(prev => new Set([...prev, i]));
      setActiveIdx(i);
      i++;
      timerRef.current = setTimeout(show, 300);
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

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 px-1">
        <Play size={14} className="text-[#FF00FF]" />
        <h4 className="text-[11px] font-bold text-[var(--color-text)] font-display tracking-[0.1em] uppercase m-0">
          {t('bytecode.pipeline.flow.title', 'Execution Flow')}
        </h4>
        <span className="text-[9px] text-[var(--color-text-muted)] font-mono">
          ({trace.totalSteps} steps{trace.finalState.output.length > 0 ? `, output: ${trace.finalState.output.join(', ')}` : ''})
        </span>
      </div>
      <p className="text-[10px] text-[var(--color-text-dim)] font-mono px-1 -mt-1">
        {t('bytecode.pipeline.flow.description', 'Step-by-step execution showing how the JVM processes each bytecode instruction. Changes to stack and local variables are highlighted.')}
      </p>

      {/* Execution summary */}
      <div className="flex gap-4 px-1">
        <div className="text-[9px] font-mono text-[var(--color-text-muted)]">
          Total steps: <span className="text-[var(--color-text)] font-bold">{trace.totalSteps}</span>
        </div>
        {trace.finalState.output.length > 0 && (
          <div className="text-[9px] font-mono text-[var(--color-text-muted)]">
            Output: <span className="text-[#00FF88] font-bold">{trace.finalState.output.join(', ')}</span>
          </div>
        )}
      </div>

      {/* Step-by-step execution */}
      <div className="bg-[var(--color-card)] border border-[var(--color-border)] overflow-hidden">
        <div className="grid gap-px bg-[var(--color-border)]" style={{ gridTemplateColumns: '40px 28px 80px 1fr 80px' }}>
          <div className="bg-[var(--color-surface-2)] px-2 py-1.5 text-[9px] font-bold text-[var(--color-text-muted)] font-display uppercase">Step</div>
          <div className="bg-[var(--color-surface-2)] px-1 py-1.5 text-[9px] font-bold text-[var(--color-text-muted)] font-display uppercase">PC</div>
          <div className="bg-[var(--color-surface-2)] px-2 py-1.5 text-[9px] font-bold text-[#FF00FF] font-display uppercase">Opcode</div>
          <div className="bg-[var(--color-surface-2)] px-2 py-1.5 text-[9px] font-bold text-[var(--color-text)] font-display uppercase">Effect</div>
          <div className="bg-[var(--color-surface-2)] px-2 py-1.5 text-[9px] font-bold text-[#00D4FF] font-display uppercase">Stack</div>

          {trace.steps.map((step, i) => {
            const visible = visibleSteps.has(i);
            const isActive = activeIdx === i;
            return (
              <React.Fragment key={i}>
                <div className={`px-2 py-1 text-[9px] font-mono transition-colors duration-200 ${
                  isActive ? 'bg-[rgba(255,0,255,0.08)] text-[#FF00FF]' : 'bg-[var(--color-card)] text-[var(--color-text-muted)]'
                } ${visible ? 'opacity-100' : 'opacity-0'}`}>
                  {i + 1}
                </div>
                <div className={`px-1 py-1 text-[9px] font-mono bg-[var(--color-card)] text-[var(--color-text-muted)] ${visible ? 'opacity-100' : 'opacity-0'}`}>
                  {step.pc}
                </div>
                <div className={`px-2 py-1 text-[10px] font-mono bg-[var(--color-card)] ${visible ? 'opacity-100' : 'opacity-0'}`}
                  style={{ color: getOpcodeColor(step.opcode) }}>
                  {step.opcode}
                </div>
                <div className={`px-2 py-1 text-[10px] font-mono bg-[var(--color-card)] ${visible ? 'opacity-100' : 'opacity-0'} ${
                  step.changed ? 'text-[var(--color-text)]' : 'text-[var(--color-text-dim)]'
                }`}>
                  {step.description}
                </div>
                <div className={`px-2 py-1 text-[9px] font-mono bg-[var(--color-card)] ${visible ? 'opacity-100' : 'opacity-0'} ${
                  step.changed ? 'text-[#00D4FF]' : 'text-[var(--color-text-muted)]'
                }`}>
                  [{step.afterStack.join(',')}]
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Final state */}
      {activeIdx === trace.steps.length - 1 && trace.steps.length > 0 && (
        <div className="bg-[var(--color-card)] border border-[rgba(0,255,136,0.2)] p-3">
          <div className="text-[9px] text-[#00FF88] font-bold font-display tracking-[0.1em] uppercase mb-2">
            Execution Complete
          </div>
          <div className="text-[10px] font-mono text-[var(--color-text-dim)]">
            {trace.finalState.output.length > 0
              ? `Output: ${trace.finalState.output.join(', ')}`
              : 'No output (void method)'}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExecutionFlow;
