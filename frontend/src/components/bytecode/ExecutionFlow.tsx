import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Play } from 'lucide-react';
import type { BytecodeMethod } from '../../lib/cfg/bytecodeParser';
import type { ExecutionTrace, ExecutionStep } from '../../lib/cfg/stackMachine';
import { simulateExecution } from '../../lib/cfg/stackMachine';

interface ExecutionFlowProps {
  method: BytecodeMethod;
  isPlaying: boolean;
  isCompleted: boolean;
}

interface LoopGroup {
  startIdx: number;
  endIdx: number;
  iterations: number;
}

const ExecutionFlow: React.FC<ExecutionFlowProps> = ({ method, isPlaying, isCompleted }) => {
  const { t } = useTranslation();
  const [visibleSteps, setVisibleSteps] = useState<Set<number>>(new Set());
  const [activeIdx, setActiveIdx] = useState<number>(-1);
  const [expandedLoops, setExpandedLoops] = useState<Set<number>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trace: ExecutionTrace = useMemo(() => simulateExecution(method.instructions, method.maxLocals), [method]);

  const loopGroups: LoopGroup[] = useMemo(() => {
    const groups: LoopGroup[] = [];
    const pcToFirstIdx = new Map<number, number>();
    trace.steps.forEach((step, i) => {
      if (!pcToFirstIdx.has(step.pc)) pcToFirstIdx.set(step.pc, i);
    });

    for (let i = 0; i < trace.steps.length - 1; i++) {
      const nextIdx = pcToFirstIdx.get(trace.steps[i].pc);
      if (nextIdx !== undefined && nextIdx > i) {
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
          const overlaps = groups.some(g => g.startIdx <= i && g.endIdx >= nextIdx - 1);
          if (!overlaps) {
            groups.push({ startIdx: i, endIdx: nextIdx - 1, iterations });
          }
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

  const groupStartMap = useMemo(() => {
    const map = new Map<number, LoopGroup>();
    loopGroups.forEach(g => map.set(g.startIdx, g));
    return map;
  }, [loopGroups]);

  const displayedSteps: ExecutionStep[] = useMemo(() => {
    const result: ExecutionStep[] = [];
    for (let i = 0; i < trace.steps.length; i++) {
      if (collapsedSteps.has(i)) continue;
      const group = groupStartMap.get(i);
      if (group && group.iterations > 1 && !expandedLoops.has(group.startIdx)) {
        result.push(trace.steps[i]);
        i = group.startIdx + group.iterations * (group.endIdx - group.startIdx + 1) - 1;
      } else {
        result.push(trace.steps[i]);
      }
    }
    return result;
  }, [trace.steps, collapsedSteps, groupStartMap, expandedLoops]);

  useEffect(() => {
    if (!isPlaying) {
      if (isCompleted) {
        setVisibleSteps(new Set(displayedSteps.map((_, i) => i)));
        setActiveIdx(displayedSteps.length - 1);
      } else {
        setVisibleSteps(new Set());
        setActiveIdx(-1);
      }
      return;
    }
    setVisibleSteps(new Set());
    setActiveIdx(-1);
    let i = 0;
    const show = () => {
      if (i >= displayedSteps.length) return;
      setVisibleSteps(prev => new Set([...prev, i]));
      setActiveIdx(i);
      i++;
      timerRef.current = setTimeout(show, 300);
    };
    timerRef.current = setTimeout(show, 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isPlaying, isCompleted, displayedSteps.length]);

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

  const maxDepth = Math.max(...trace.steps.map(s => s.afterStack.length)) || 1;

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
        {collapsedSteps.size > 0 && (
          <span className="text-[8px] text-[#FF3366] font-mono bg-[rgba(255,51,102,0.1)] px-1.5 py-0.5 rounded">
            {collapsedSteps.size} loop steps collapsed
          </span>
        )}
      </div>
      <p className="text-[10px] text-[var(--color-text-dim)] font-mono px-1 -mt-1">
        {t('bytecode.pipeline.flow.description', 'Step-by-step execution showing how the JVM processes each bytecode instruction. Changes to stack and local variables are highlighted.')}
      </p>

      {trace.steps.length > 2 && (
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] p-3">
          <div className="text-[9px] text-[var(--color-text-muted)] font-display tracking-[0.1em] uppercase mb-2">
            Stack Depth Over Time
          </div>
          <div className="h-12 flex items-end gap-0.5 overflow-x-auto">
            {trace.steps.map((step, i) => {
              const depth = step.afterStack.length;
              const height = Math.max(4, (depth / maxDepth) * 32);
              const isActive = i === trace.steps.findIndex(s => s === displayedSteps[activeIdx]);
              const executed = visibleSteps.has(displayedSteps.findIndex(s => s === step));
              const color = depth === 0 ? '#6b7280' : executed ? (isActive ? '#00FF88' : '#00D4FF') : '#374151';
              return (
                <div
                  key={i}
                  className="min-w-[2px] rounded-t transition-all duration-200"
                  style={{ height, backgroundColor: color, opacity: executed ? 1 : 0.2 }}
                  title={`Step ${i + 1}: depth=${depth}`}
                />
              );
            })}
          </div>
        </div>
      )}

      <div className="flex gap-4 px-1">
        <div className="text-[9px] font-mono text-[var(--color-text-muted)]">
          Total steps: <span className="text-[var(--color-text)] font-bold">{trace.totalSteps}</span>
        </div>
        <div className="text-[9px] font-mono text-[var(--color-text-muted)]">
          Max register pressure: <span className="text-[#00FF88] font-bold">{trace.maxPressure ?? 0}</span>
        </div>
        {trace.finalState.output.length > 0 && (
          <div className="text-[9px] font-mono text-[var(--color-text-muted)]">
            Output: <span className="text-[#00FF88] font-bold">{trace.finalState.output.join(', ')}</span>
          </div>
        )}
      </div>

      <div className="bg-[var(--color-card)] border border-[var(--color-border)] overflow-hidden">
        <div className="grid gap-px bg-[var(--color-border)]" style={{ gridTemplateColumns: '32px 28px 80px 1fr 80px 80px' }}>
          <div className="bg-[var(--color-surface-2)] px-2 py-1.5 text-[9px] font-bold text-[var(--color-text-muted)] font-display uppercase">#</div>
          <div className="bg-[var(--color-surface-2)] px-1 py-1.5 text-[9px] font-bold text-[var(--color-text-muted)] font-display uppercase">PC</div>
          <div className="bg-[var(--color-surface-2)] px-2 py-1.5 text-[9px] font-bold text-[#FF00FF] font-display uppercase">Opcode</div>
          <div className="bg-[var(--color-surface-2)] px-2 py-1.5 text-[9px] font-bold text-[var(--color-text)] font-display uppercase">Effect</div>
          <div className="bg-[var(--color-surface-2)] px-2 py-1.5 text-[9px] font-bold text-[#00D4FF] font-display uppercase">Stack</div>
          <div className="bg-[var(--color-surface-2)] px-2 py-1.5 text-[9px] font-bold text-[#00FF88] font-display uppercase">Live</div>

          {displayedSteps.map((step, i) => {
            const visible = visibleSteps.has(i);
            const isActive = activeIdx === i;
            const isCollapsedMarker = collapsedSteps.has(trace.steps.findIndex(s => s === step));
            const group = groupStartMap.get(trace.steps.findIndex(s => s === step));
            const isLoopHeader = group !== undefined && !expandedLoops.has(group.startIdx);
            const showLoopBanner = isLoopHeader && group && group.iterations > 1;

            if (isCollapsedMarker) return null;

            return (
              <React.Fragment key={i}>
                {showLoopBanner && (
                  <div className="col-span-6 px-2 py-0.5 text-[8px] font-mono bg-[rgba(255,51,102,0.05)] border-b border-[#FF3366]/20 flex items-center justify-between cursor-pointer hover:bg-[rgba(255,51,102,0.08)]"
                    onClick={() => setExpandedLoops(prev => new Set([...prev, group.startIdx]))}>
                    <span className="text-[#FF3366] flex items-center gap-1">
                      <span>↻</span>
                      <span>Loop collapsed {group.iterations}× — click to expand</span>
                    </span>
                    <span className="text-[var(--color-text-dim)]">at PC {step.pc}</span>
                  </div>
                )}
                <div className={`px-2 py-1 text-[9px] font-mono transition-colors duration-200 ${
                  isActive ? 'bg-[rgba(255,0,255,0.08)] text-[#FF00FF]' : 'bg-[var(--color-card)] text-[var(--color-text-muted)]'
                } ${visible ? 'opacity-100' : 'opacity-0'}`}>
                  {i + 1}
                </div>
                <div className={`px-1 py-1 text-[9px] font-mono bg-[var(--color-card)] text-[var(--color-text-muted)] ${visible ? 'opacity-100' : 'opacity-0'}`}>
                  {step.pc}
                </div>
                <div className={`px-2 py-1 text-[10px] font-mono bg-[var(--color-card)] ${visible ? 'opacity-100' : 'opacity-0'}`}
                  style={{ color: isActive ? undefined : getOpcodeColor(step.opcode) }}>
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
                <div className={`px-2 py-1 text-[9px] font-mono bg-[var(--color-card)] ${visible ? 'opacity-100' : 'opacity-0'} ${
                  step.changed ? 'text-[#00FF88]' : 'text-[var(--color-text-muted)]'
                }`}>
                  {step.liveLocals.length > 0 ? step.liveLocals.join(',') : '—'}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {activeIdx === displayedSteps.length - 1 && trace.steps.length > 0 && (
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
