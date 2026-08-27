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
}

interface LoopGroup {
  startIdx: number;
  endIdx: number;
  iterations: number;
}

const StackMachineVisualizer: React.FC<StackMachineVisualizerProps> = ({ method, isPlaying, isCompleted }) => {
  const { t } = useTranslation();
  const [visibleSteps, setVisibleSteps] = useState<Set<number>>(new Set());
  const [activeStep, setActiveStep] = useState<number>(-1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cursorRef = useRef<HTMLDivElement | null>(null);

  const trace: ExecutionTrace = useMemo(() => simulateExecution(method.instructions, method.maxLocals), [method]);

  // Detect loop groups
  const loopGroups: LoopGroup[] = useMemo(() => {
    const groups: LoopGroup[] = [];
    const pcIndices = new Map<number, number[]>();
    trace.steps.forEach((step, i) => {
      const arr = pcIndices.get(step.pc);
      if (arr) arr.push(i);
      else pcIndices.set(step.pc, [i]);
    });

    // Find repeating PC sequences (loop iterations)
    for (let i = 0; i < trace.steps.length - 1; i++) {
      const indices = pcIndices.get(trace.steps[i].pc);
      if (!indices) continue;
      const nextIdx = indices.find(idx => idx > i);
      if (nextIdx === undefined) continue;

      const patternLen = nextIdx - i;
      if (patternLen < 2) continue;

      const pattern = trace.steps.slice(i, nextIdx);
      let iterations = 1;
      let cursor = nextIdx;
      while (cursor + patternLen <= trace.steps.length) {
        const chunk = trace.steps.slice(cursor, cursor + patternLen);
        if (chunk.every((s, j) => s.pc === pattern[j].pc)) {
          iterations++;
          cursor += patternLen;
        } else break;
      }

      if (iterations > 1) {
        // Check if we already have a group covering this range
        const overlaps = groups.some(g => g.startIdx <= i && g.endIdx >= nextIdx - 1);
        if (!overlaps) {
          groups.push({ startIdx: i, endIdx: nextIdx - 1, iterations });
        }
      }
    }
    return groups;
  }, [trace.steps]);

  const collapsedSteps: Set<number> = useMemo(() => {
    const collapsed = new Set<number>();
    for (const group of loopGroups) {
      const patternLen = group.endIdx - group.startIdx + 1;
      for (let iter = 1; iter < group.iterations; iter++) {
        const offset = iter * patternLen;
        for (let i = group.startIdx + offset; i < Math.min(group.startIdx + offset + patternLen, trace.steps.length); i++) {
          collapsed.add(i);
        }
      }
    }
    return collapsed;
  }, [loopGroups, trace.steps.length]);

  const offsetMap = useMemo(() => {
    const m = new Map<number, number>();
    method.instructions.forEach((instr, i) => m.set(instr.offset, i));
    return m;
  }, [method.instructions]);

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
  }, [isPlaying, isCompleted, trace.steps.length]);

  useEffect(() => {
    if (cursorRef.current) {
      cursorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeStep]);

  const getOpcodeColor = (opcode: string): string => {
    if (opcode.startsWith('if') || opcode === 'goto') return '#FF3366';
    if (opcode.startsWith('invoke')) return '#FFB000';
    if (opcode.includes('load')) return '#00D4FF';
    if (opcode.includes('store')) return '#00FF88';
    if (opcode.startsWith('const') || opcode === 'bipush' || opcode === 'sipush' || opcode === 'ldc') return '#8A2BE2';
    if (opcode.includes('return')) return '#FF00FF';
    if (opcode === 'pop' || opcode === 'dup' || opcode === 'swap') return '#FFB000';
    if (opcode === 'iadd' || opcode === 'isub' || opcode === 'imul' || opcode === 'idiv') return '#00FF88';
    return '#E0E0F0';
  };

  const currentStep = activeStep >= 0 ? trace.steps[activeStep] : null;
  const currentInstrIdx = currentStep ? offsetMap.get(currentStep.pc) ?? -1 : -1;
  const liveSet = new Set(currentStep?.liveLocals ?? []);
  const maxPressure = trace.maxPressure ?? 0;
  const isBranchTaken = currentStep?.description.includes('→ goto') ?? false;
  const isLoopBack = currentStep?.opcode === 'goto';

  const activeGroup = useMemo(() => {
    return loopGroups.find(g => activeStep >= g.startIdx && activeStep <= g.endIdx);
  }, [loopGroups, activeStep]);

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
        {loopGroups.length > 0 && (
          <span className="text-[8px] text-[#FF3366] font-mono bg-[rgba(255,51,102,0.1)] px-1.5 py-0.5 rounded">
            {loopGroups.length} loop{loopGroups.length > 1 ? 's' : ''} · {collapsedSteps.size} steps collapsed
          </span>
        )}
      </div>
      <p className="text-[10px] text-[var(--color-text-dim)] font-mono px-1 -mt-1">
        {t('bytecode.pipeline.stackMachine.description', 'JVM executes bytecode using an operand stack. Each instruction pushes/pops values from the stack, transforming the program state.')}
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-3">
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] overflow-hidden flex flex-col">
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
              {currentStep && isLoopBack && (
                <span className="flex items-center gap-1 text-[8px] font-mono text-[#FF9900] bg-[rgba(255,153,0,0.1)] px-1.5 py-0.5 rounded">
                  ↻ LOOP BACK
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
              {activeGroup && (
                <span className="text-[8px] font-mono text-[#FF9900]">
                  loop {activeStep - activeGroup.startIdx + 1}/{activeGroup.iterations}
                </span>
              )}
            </div>
          </div>

          <div className="overflow-y-auto max-h-[320px] min-h-[100px]">
            {method.instructions.map((instr, i) => {
              const isExecuted = activeStep >= 0 && trace.steps.slice(0, activeStep + 1).some(s => s.pc === instr.offset);
              const isCurrent = currentInstrIdx === i && activeStep >= 0;
              const instrStep = trace.steps.find(s => s.pc === instr.offset);
              const isBranch = instr.opcode === 'goto' || instr.opcode.startsWith('if');
              const branchTaken = instrStep?.description.includes('→ goto') ?? false;
              return (
                <div
                  key={i}
                  ref={isCurrent ? cursorRef : undefined}
                  className={`flex items-center gap-3 text-[10px] font-mono px-3 py-[3px] transition-all duration-300 ${
                    isCurrent
                      ? 'bg-[var(--color-neon)] text-[var(--color-void)] font-bold shadow-[0_0_12px_rgba(0,255,136,0.5)] transform scale-[1.02]'
                      : isExecuted && !isCurrent
                      ? 'text-[var(--color-text-dim)]'
                      : 'text-[var(--color-text)]'
                  }`}
                >
                  <span className={`w-8 text-right shrink-0 ${isExecuted && !isCurrent ? 'text-[var(--color-text-muted)]' : ''}`}>
                    {instr.offset}:
                  </span>
                  <span className={`w-28 shrink-0`} style={{ color: isCurrent ? undefined : getOpcodeColor(instr.opcode) }}>
                    {instr.opcode}
                  </span>
                  <span className={`${isExecuted && !isCurrent ? 'text-[var(--color-dim)]' : 'text-[var(--color-text-dim)]'}`}>
                    {instr.operands}
                  </span>
                  {isCurrent && isBranch && (
                    <span className="ml-auto text-[7px] font-mono text-[#FF3366]">
                      {instr.opcode.startsWith('if') ? (branchTaken ? '→' : '↓') : '→'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="px-3 py-1.5 border-t border-[var(--color-border)]">
            <span className="text-[9px] font-mono text-[var(--color-text-muted)]">
              {currentStep?.description || '...'}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] p-3">
            <div className="text-[9px] text-[#00D4FF] font-bold font-display tracking-[0.1em] uppercase mb-2 flex items-center justify-between">
              <span>Operand Stack</span>
              {currentStep && (
                <span className="text-[7px] text-[var(--color-text-muted)] font-mono">
                  depth: {currentStep.afterStack.length}
                </span>
              )}
            </div>
            <div className="flex flex-col-reverse gap-0.5 min-h-[40px]">
              {currentStep ? (
                currentStep.afterStack.map((val, i) => {
                  const wasPushed = activeStep > 0 && trace.steps[activeStep - 1] && currentStep.beforeStack.length < currentStep.afterStack.length;
                  const justPushed = wasPushed && i === currentStep.afterStack.length - 1;
                  return (
                    <div
                      key={i}
                      className={`transition-all duration-500 text-[10px] font-mono flex items-center justify-center rounded border ${
                        justPushed
                          ? 'bg-[#00FF88]/30 border-[#00FF88]/50 scale-105'
                          : 'bg-[rgba(0,212,255,0.08)] border-[rgba(0,212,255,0.2)] text-[#00D4FF]'
                      }`}
                    >
                      {String(val)}
                    </div>
                  );
                })
              ) : (
                <div className="text-[9px] text-[var(--color-text-muted)] font-mono">empty</div>
              )}
            </div>
          </div>

          <div className="bg-[var(--color-card)] border border-[var(--color-border)] p-3">
            <div className="text-[9px] text-[#00FF88] font-bold font-display tracking-[0.1em] uppercase mb-2 flex items-center justify-between">
              <span>Local Variables</span>
              <span className="text-[7px] text-[var(--color-text-muted)] font-mono">
                pressure: {liveSet.size} live / max {maxPressure}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              {currentStep ? (
                currentStep.locals.map((val, i) => {
                  const isLive = liveSet.has(i);
                  const prevVal = activeStep > 0 ? trace.steps[activeStep - 1]?.locals[i] : undefined;
                  const changed = prevVal !== val;
                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-2 text-[10px] font-mono px-1 rounded transition-all duration-300 ${
                        isLive ? 'bg-[rgba(0,255,136,0.08)]' : 'opacity-40'
                      } ${changed && isLive ? 'font-bold' : ''}`}
                    >
                      <span className={`w-6 ${isLive ? 'text-[#00FF88]' : 'text-[var(--color-text-muted)]'}`}>L{i}:</span>
                      <span className={isLive ? 'text-[#00FF88] font-bold' : 'text-[var(--color-text-muted)]'}>
                        {String(val)}
                      </span>
                      {isLive && <span className="text-[7px] text-[#00FF88] uppercase tracking-wider">live</span>}
                    </div>
                  );
                })
              ) : (
                <div className="text-[9px] text-[var(--color-text-muted)] font-mono">empty</div>
              )}
            </div>
          </div>

          {trace.steps.length > 2 && (
            <div className="bg-[var(--color-card)] border border-[var(--color-border)] p-3">
              <div className="text-[9px] text-[var(--color-text-muted)] font-display tracking-[0.1em] uppercase mb-2">
                {t('bytecode.pipeline.stackMachine.depthChart', 'Stack Depth Over Time')}
              </div>
              <div className="h-16 flex items-end gap-0.5 overflow-x-auto">
                {trace.steps.map((step, i) => {
                  const depth = step.afterStack.length;
                  const maxDepth = Math.max(...trace.steps.map(s => s.afterStack.length)) || 1;
                  const height = Math.max(4, (depth / maxDepth) * 48);
                  const isActive = i === activeStep;
                  const executed = i <= (activeStep >= 0 ? activeStep : -1);
                  const color = depth === 0 ? '#6b7280' : executed ? (isActive ? '#00FF88' : '#00D4FF') : '#374151';
                  return (
                    <div
                      key={i}
                      className="min-w-[2px] rounded-t transition-all duration-200"
                      style={{ height, backgroundColor: color, opacity: executed ? 1 : 0.2 }}
                      title={`Step ${i + 1}: depth=${step.afterStack.length}`}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-[var(--color-card)] border border-[var(--color-border)] overflow-hidden">
        <div className="grid gap-px bg-[var(--color-border)] min-w-[520px]" style={{ gridTemplateColumns: '40px 80px 1fr 100px 90px' }}>
          <div className="bg-[var(--color-surface-2)] px-2 py-1.5 text-[9px] font-bold text-[var(--color-text-muted)] font-display uppercase">PC</div>
          <div className="bg-[var(--color-surface-2)] px-2 py-1.5 text-[9px] font-bold text-[#00D4FF] font-display uppercase">Opcode</div>
          <div className="bg-[var(--color-surface-2)] px-2 py-1.5 text-[9px] font-bold text-[var(--color-text)] font-display uppercase">Description</div>
          <div className="bg-[var(--color-surface-2)] px-2 py-1.5 text-[9px] font-bold text-[#00D4FF] font-display uppercase">Stack</div>
          <div className="bg-[var(--color-surface-2)] px-2 py-1.5 text-[9px] font-bold text-[#00FF88] font-display uppercase">Live locals</div>

          {trace.steps.map((step, i) => {
            const visible = visibleSteps.has(i) || isCompleted;
            const isActive = activeStep === i;
            const isCollapsed = collapsedSteps.has(i);
            if (isCollapsed) return null;

            return (
              <React.Fragment key={i}>
                <div className={`px-2 py-1 text-[10px] font-mono transition-colors duration-200 ${
                  isActive ? 'bg-[rgba(0,212,255,0.08)] text-[#00D4FF]' : 'bg-[var(--color-card)] text-[var(--color-text-muted)]'
                } ${visible ? 'opacity-100' : 'opacity-0'}`}>
                  {step.pc}
                </div>
                <div className={`px-2 py-1 text-[10px] font-mono bg-[var(--color-card)] ${visible ? 'opacity-100' : 'opacity-0'}`}
                  style={{ color: isActive ? undefined : getOpcodeColor(step.opcode) }}>
                  {step.opcode}
                </div>
                <div className={`px-2 py-1 text-[10px] font-mono bg-[var(--color-card)] text-[var(--color-text-dim)] ${visible ? 'opacity-100' : 'opacity-0'}`}>
                  {step.description}
                </div>
                <div className={`px-2 py-1 text-[9px] font-mono bg-[var(--color-card)] text-[#00D4FF] ${visible ? 'opacity-100' : 'opacity-0'}`}>
                  [{step.afterStack.join(',')}]
                </div>
                <div className={`px-2 py-1 text-[9px] font-mono bg-[var(--color-card)] ${isActive ? 'text-[#00FF88]' : 'text-[var(--color-text-muted)]'} ${visible ? 'opacity-100' : 'opacity-0'}`}>
                  {step.liveLocals.length > 0 ? step.liveLocals.map(l => `L${l}`).join(' ') : '—'}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {activeStep === trace.steps.length - 1 && trace.steps.length > 0 && (
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

export default StackMachineVisualizer;
