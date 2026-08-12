import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Timer } from 'lucide-react';
import type { TacInstruction } from '../../types';
import type { SchedulingResult, ScheduleEntry } from '../../lib/cfg/scheduling';

interface InstructionSchedulingProps {
  data: { instructions: TacInstruction[] };
  scheduling: SchedulingResult;
  isPlaying: boolean;
  isCompleted: boolean;
}

const InstructionScheduling: React.FC<InstructionSchedulingProps> = ({ data, scheduling, isPlaying, isCompleted }) => {
  const { t } = useTranslation();
  const [visibleEntries, setVisibleEntries] = useState<Set<number>>(new Set());
  const [activeCycle, setActiveCycle] = useState<number>(-1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const instrMap = new Map<number, TacInstruction>();
  for (const instr of data.instructions) {
    instrMap.set(instr.line, instr);
  }

  useEffect(() => {
    if (!isPlaying) {
      if (isCompleted) {
        setVisibleEntries(new Set(scheduling.schedule.map((_, i) => i)));
        setActiveCycle(scheduling.schedule.length > 0 ? Math.max(...scheduling.schedule.map(s => s.cycle)) : -1);
      }
      return;
    }
    setVisibleEntries(new Set());
    setActiveCycle(-1);
    let i = 0;
    const show = () => {
      if (i >= scheduling.schedule.length) return;
      setVisibleEntries(prev => new Set([...prev, i]));
      setActiveCycle(scheduling.schedule[i].cycle);
      i++;
      timerRef.current = setTimeout(show, 250);
    };
    timerRef.current = setTimeout(show, 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isPlaying, isCompleted, scheduling]);

  // Group schedule by cycle
  const cycles = new Map<number, ScheduleEntry[]>();
  for (const entry of scheduling.schedule) {
    if (!cycles.has(entry.cycle)) cycles.set(entry.cycle, []);
    cycles.get(entry.cycle)!.push(entry);
  }

  const depTypeColor = (type: string) => {
    switch (type) {
      case 'data': return '#00FF88';
      case 'anti': return '#FFB000';
      case 'output': return '#FF3366';
      default: return '#6A7B9B';
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 px-1">
        <Timer size={14} className="text-[#FFB000]" />
        <h4 className="text-[11px] font-bold text-[var(--color-text)] font-display tracking-[0.1em] uppercase m-0">
          {t('codegen.scheduling.title', 'Instruction Scheduling')}
        </h4>
        <span className="text-[9px] text-[var(--color-text-muted)] font-mono">
          ({scheduling.schedule.length} instructions, {scheduling.scheduledCycles} cycles)
        </span>
      </div>
      <p className="text-[10px] text-[var(--color-text-dim)] font-mono px-1 -mt-1">
        {t('codegen.scheduling.description', 'Instructions are reordered to minimize pipeline stalls while preserving data dependencies. A superscalar pipeline issues up to 2 instructions per cycle.')}
      </p>

      {/* Stats */}
      <div className="flex gap-4 px-1">
        <div className="text-[9px] font-mono text-[var(--color-text-muted)]">
          <span className="text-[var(--color-text)] font-bold">{scheduling.originalCycles}</span> cycles (original)
        </div>
        <div className="text-[9px] font-mono text-[var(--color-text-muted)]">
          <span className="text-[#00FF88] font-bold">{scheduling.scheduledCycles}</span> cycles (scheduled)
        </div>
        <div className="text-[9px] font-mono text-[var(--color-text-muted)]">
          <span className="text-[#FFB000] font-bold">{scheduling.dependencies.length}</span> dependencies
        </div>
      </div>

      {/* Dependency graph */}
      {scheduling.dependencies.length > 0 && (
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] p-3">
          <div className="text-[9px] text-[#FFB000] font-bold font-display tracking-[0.1em] uppercase mb-2">
            Dependency Graph
          </div>
          <div className="flex flex-wrap gap-1.5">
            {scheduling.dependencies.map((dep, i) => (
              <div key={i} className="flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 bg-[rgba(255,176,0,0.06)] border border-[rgba(255,176,0,0.15)]">
                <span className="text-[var(--color-text-dim)]">L{dep.from}</span>
                <span style={{ color: depTypeColor(dep.type) }}>→</span>
                <span className="text-[var(--color-text-dim)]">L{dep.to}</span>
                <span style={{ color: depTypeColor(dep.type) }} className="text-[8px]">{dep.type[0].toUpperCase()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scheduled table — cycle by cycle */}
      <div className="bg-[var(--color-card)] border border-[var(--color-border)] overflow-hidden">
        <div className="grid gap-px bg-[var(--color-border)]" style={{ gridTemplateColumns: '50px 70px 50px 1fr' }}>
          <div className="bg-[var(--color-surface-2)] px-2 py-1.5 text-[9px] font-bold text-[var(--color-text-muted)] font-display uppercase">Cycle</div>
          <div className="bg-[var(--color-surface-2)] px-2 py-1.5 text-[9px] font-bold text-[#FFB000] font-display uppercase">Unit</div>
          <div className="bg-[var(--color-surface-2)] px-2 py-1.5 text-[9px] font-bold text-[var(--color-text-muted)] font-display uppercase">Line</div>
          <div className="bg-[var(--color-surface-2)] px-2 py-1.5 text-[9px] font-bold text-[var(--color-text)] font-display uppercase">Instruction</div>

          {[...cycles.entries()].map(([cycle, entries]) =>
            entries.map((entry, ei) => {
              const instr = instrMap.get(entry.tacLine);
              const visible = visibleEntries.has(scheduling.schedule.indexOf(entry));
              const isActive = activeCycle === cycle;
              return (
                <React.Fragment key={`${cycle}-${ei}`}>
                  <div className={`px-2 py-1.5 text-[10px] font-mono transition-colors duration-200 ${
                    isActive ? 'bg-[rgba(255,176,0,0.08)] text-[#FFB000]' : 'bg-[var(--color-card)] text-[var(--color-text-muted)]'
                  } ${visible ? 'opacity-100' : 'opacity-0'}`}>
                    {ei === 0 ? `C${cycle}` : ''}
                  </div>
                  <div className={`px-2 py-1.5 text-[9px] font-mono bg-[var(--color-card)] ${visible ? 'opacity-100' : 'opacity-0'}`}
                    style={{ color: entry.unit === 'MULT' ? '#FF00FF' : entry.unit === 'MEM' ? '#00D4FF' : entry.unit === 'CMP' ? '#FFB000' : '#00FF88' }}>
                    {entry.unit}
                  </div>
                  <div className="px-2 py-1.5 text-[10px] font-mono bg-[var(--color-card)] text-[var(--color-text-dim)]">
                    <span className={visible ? 'opacity-100' : 'opacity-0'}>L{entry.tacLine}</span>
                  </div>
                  <div className={`px-2 py-1.5 text-[10px] font-mono bg-[var(--color-card)] ${visible ? 'opacity-100' : 'opacity-0'}`}>
                    <span className="text-[var(--color-text)]">{instr?.result || ''}</span>
                    {instr?.result && <span className="text-[var(--color-text-muted)]"> = </span>}
                    <span className="text-[var(--color-text-dim)]">{instr?.arg1 || ''}</span>
                    {instr?.operator && <span className="text-[var(--color-neon)]"> {instr.operator} </span>}
                    <span className="text-[var(--color-text-dim)]">{instr?.arg2 || ''}</span>
                    {instr?.target && instr?.op !== 'label' && <span className="text-[#FF3366]"> goto {instr.target}</span>}
                  </div>
                </React.Fragment>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default InstructionScheduling;
