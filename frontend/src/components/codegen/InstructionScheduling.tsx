import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Timer, ArrowRight, Network, Table } from 'lucide-react';
import type { TacInstruction } from '../../types';
import type { SchedulingResult, ScheduleEntry } from '../../lib/cfg/scheduling';
import DependencyGraph from '../cfg/DependencyGraph';
import ReservationTable from '../cfg/ReservationTable';

interface InstructionSchedulingProps {
  data: { instructions: TacInstruction[] };
  scheduling: SchedulingResult;
  isPlaying: boolean;
  isCompleted: boolean;
  showDependencyGraph?: boolean;
}

const InstructionScheduling: React.FC<InstructionSchedulingProps> = ({ data, scheduling, isPlaying, isCompleted, showDependencyGraph = true }) => {
  const { t } = useTranslation();
  const [visibleEntries, setVisibleEntries] = useState<Set<number>>(new Set());
  const [activeCycle, setActiveCycle] = useState<number>(-1);
  const [depView, setDepView] = useState<'graph' | 'table'>('graph');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const instructions = data.instructions;

  const instrMap = new Map<number, TacInstruction>();
  for (const instr of instructions) {
    instrMap.set(instr.line, instr);
  }

  const gainPct = scheduling.serialCycles > 0
    ? Math.round(((scheduling.serialCycles - scheduling.scheduledCycles) / scheduling.serialCycles) * 100)
    : 0;
  const cyclesSaved = scheduling.serialCycles - scheduling.scheduledCycles;

  useEffect(() => {
    if (!isPlaying) {
      if (isCompleted) {
        setVisibleEntries(new Set(scheduling.schedule.map((_, i) => i)));
        setActiveCycle(scheduling.schedule.length > 0 ? Math.max(...scheduling.schedule.map(s => s.cycle)) : -1);
      } else {
        setVisibleEntries(new Set());
        setActiveCycle(-1);
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

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2 min-w-0">
          <Timer size={14} className="text-[#FFB000] shrink-0" />
          <h4 className="text-[11px] font-bold text-[var(--color-text)] font-display tracking-[0.1em] uppercase m-0">
            {t(showDependencyGraph ? 'codegen.scheduling.title' : 'codegen.step2.title', 'Instruction Scheduling')}
          </h4>
          {!showDependencyGraph && (
            <span className="text-[8px] font-bold font-mono px-1.5 py-0.5 tracking-wider border border-[rgba(255,176,0,0.3)] text-[#FFB000] bg-[rgba(255,176,0,0.06)]">
              {t('codegen.step2.algorithm')}
            </span>
          )}
          <span className="text-[9px] text-[var(--color-text-muted)] font-mono whitespace-nowrap">
            ({scheduling.schedule.length} instructions, {scheduling.scheduledCycles} cycles)
          </span>
        </div>
        {showDependencyGraph && (
          <div className="flex gap-0.5 bg-[var(--color-card)] border border-[var(--color-border)] p-0.5 shrink-0">
            <button
              type="button"
              onClick={() => setDepView('graph')}
              className={`flex items-center gap-1 px-2 py-1 text-[9px] font-mono transition-colors ${
                depView === 'graph'
                  ? 'text-[var(--color-neon)] bg-[rgba(0,255,136,0.1)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              <Network size={11} />
              Graph
            </button>
            <button
              type="button"
              onClick={() => setDepView('table')}
              className={`flex items-center gap-1 px-2 py-1 text-[9px] font-mono transition-colors ${
                depView === 'table'
                  ? 'text-[var(--color-neon)] bg-[rgba(0,255,136,0.1)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              <Table size={11} />
              Table
            </button>
          </div>
        )}
      </div>
      <p className="text-[10px] text-[var(--color-text-dim)] font-mono px-1 -mt-1">
        {t(showDependencyGraph ? 'codegen.scheduling.description' : 'codegen.step2.description', 'Instructions are reordered to minimize pipeline stalls while preserving data dependencies. A superscalar pipeline issues up to 2 instructions per cycle.')}
      </p>

      {/* Scheduler comparison */}
      <div className="flex flex-wrap items-stretch gap-2 px-1">
        <div className="flex-1 min-w-[160px] bg-[var(--color-card)] border border-[var(--color-border)] px-3 py-2">
          <div className="text-[8px] font-bold text-[var(--color-text-muted)] font-display tracking-[0.1em] uppercase">Before</div>
          <div className="text-[20px] leading-none font-mono text-[var(--color-text)] mt-1">{scheduling.serialCycles}</div>
          <div className="text-[9px] font-mono text-[var(--color-text-muted)] mt-1">cycles · 1-wide serial</div>
        </div>
        <div className="flex items-center px-1">
          <ArrowRight size={14} className="text-[var(--color-text-muted)]" />
        </div>
        <div className="flex-1 min-w-[160px] bg-[var(--color-card)] border border-[var(--color-border)] px-3 py-2">
          <div className="text-[8px] font-bold text-[#00FF88] font-display tracking-[0.1em] uppercase">After</div>
          <div className="text-[20px] leading-none font-mono text-[#00FF88] mt-1">{scheduling.scheduledCycles}</div>
          <div className="text-[9px] font-mono text-[var(--color-text-muted)] mt-1">cycles · 2-wide superscalar</div>
        </div>
        <div className={`flex-1 min-w-[140px] bg-[var(--color-card)] border px-3 py-2 ${gainPct > 0 ? 'border-[rgba(0,255,136,0.35)]' : 'border-[var(--color-border)]'}`}>
          <div className="text-[8px] font-bold text-[#FFB000] font-display tracking-[0.1em] uppercase">Gain</div>
          <div className={`text-[20px] leading-none font-mono mt-1 ${gainPct > 0 ? 'text-[#00FF88]' : 'text-[var(--color-text)]'}`}>
            {gainPct > 0 ? `-${gainPct}%` : '0%'}
          </div>
          <div className="text-[9px] font-mono text-[var(--color-text-muted)] mt-1">{cyclesSaved} cycles saved</div>
        </div>
      </div>

      {/* Detail chips */}
      <div className="flex flex-wrap gap-4 px-1">
        <div className="text-[9px] font-mono text-[var(--color-text-muted)]">
          <span className="text-[#00D4FF] font-bold">{scheduling.criticalPathInfo?.criticalLength ?? 0}</span> critical chain
        </div>
        <div className="text-[9px] font-mono text-[var(--color-text-muted)]">
          <span className="text-[#FF3366] font-bold">{scheduling.dependencies.length}</span> dependencies
        </div>
      </div>

      {/* Dependency graph / reservation table */}
      {showDependencyGraph && depView === 'graph' && (
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] overflow-hidden">
          <div className="flex items-center justify-between px-3 pt-2.5 gap-2">
            <div className="text-[9px] text-[#FFB000] font-bold font-display tracking-[0.1em] uppercase">
              Dependency Graph
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-[8px] font-mono text-[var(--color-text-muted)]">
                <span className="w-2 h-0.5 inline-block" style={{ background: '#00FF88' }} /> data (RAW)
              </span>
              <span className="flex items-center gap-1 text-[8px] font-mono text-[var(--color-text-muted)]">
                <span className="w-2 h-0.5 inline-block" style={{ background: '#FFB000' }} /> anti (WAR)
              </span>
              <span className="flex items-center gap-1 text-[8px] font-mono text-[var(--color-text-muted)]">
                <span className="w-2 h-0.5 inline-block" style={{ background: '#FF3366' }} /> output (WAW)
              </span>
              <span className="flex items-center gap-1 text-[8px] font-mono text-[var(--color-text-muted)]">
                <span className="w-2 h-0.5 inline-block" style={{ background: '#00D4FF' }} /> critical chain
              </span>
            </div>
          </div>
          {scheduling.dependencies.length > 0 ? (
            <DependencyGraph
              instructions={instructions}
              scheduling={scheduling}
              isPlaying={isPlaying}
              isCompleted={isCompleted}
            />
          ) : (
            <div className="h-[380px] flex items-center justify-center text-[10px] font-mono text-[var(--color-text-muted)]">
              No dependencies to show
            </div>
          )}
        </div>
      )}
      {showDependencyGraph && depView === 'table' && (
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] overflow-hidden">
          <div className="px-3 pt-2.5">
            <div className="text-[9px] text-[#FFB000] font-bold font-display tracking-[0.1em] uppercase">
              Reservation Table
            </div>
          </div>
          <ReservationTable
            instructions={instructions}
            scheduling={scheduling}
            isPlaying={isPlaying}
            isCompleted={isCompleted}
          />
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