import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { TacInstruction } from '../../types';
import type { SchedulingResult } from '../../lib/cfg/scheduling';

interface ReservationTableProps {
  instructions: TacInstruction[];
  scheduling: SchedulingResult;
  isPlaying: boolean;
  isCompleted: boolean;
}

const UNIT_COLORS: Record<string, string> = {
  ALU: '#00FF88',
  MULT: '#FF00FF',
  MEM: '#00D4FF',
  CMP: '#FFB000',
  CTRL: '#FF3366',
};

function formatInstr(instr?: TacInstruction | null): string {
  if (!instr) return '';
  const parts: string[] = [];
  if (instr.result) parts.push(`${instr.result} =`);
  if (instr.arg1) parts.push(instr.arg1);
  if (instr.operator) parts.push(instr.operator);
  if (instr.arg2) parts.push(instr.arg2);
  if (instr.target && instr.op !== 'label') parts.push(`goto ${instr.target}`);
  return parts.join(' ') || '?';
}

const ReservationTable: React.FC<ReservationTableProps> = ({ instructions, scheduling, isPlaying, isCompleted }) => {
  const [visibleRows, setVisibleRows] = useState<Set<number>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lines = useMemo(() => scheduling.cycleBreakdown ?? [], [scheduling.cycleBreakdown]);

  // Reveal rows one by one while playing
  useEffect(() => {
    if (!isPlaying) {
      if (isCompleted) {
        setVisibleRows(new Set(lines.map((_, i) => i)));
      }
      return;
    }
    setVisibleRows(new Set());
    let i = 0;
    const show = () => {
      if (i >= lines.length) return;
      setVisibleRows(prev => new Set([...prev, i]));
      i++;
      timerRef.current = setTimeout(show, 300);
    };
    timerRef.current = setTimeout(show, 250);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isPlaying, isCompleted, lines]);

  const instrMap = new Map<number, TacInstruction>();
  for (const instr of instructions) instrMap.set(instr.line, instr);

  const unitByLine = new Map<number, string>();
  for (const e of scheduling.schedule) unitByLine.set(e.tacLine, e.unit);

  const lineChip = (line: number) => {
    const instr = instrMap.get(line);
    const unit = unitByLine.get(line);
    const color = unit ? (UNIT_COLORS[unit] || '#6A7B9B') : '#6A7B9B';
    return (
      <span
        key={line}
        className="inline-flex items-center gap-1 px-1 py-0.5 text-[9px] font-mono border rounded"
        style={{ color, borderColor: `${color}55`, backgroundColor: `${color}14` }}
        title={`L${line} ${formatInstr(instr)}`}
      >
        <span className="opacity-60">L</span>{line}
      </span>
    );
  };

  if (lines.length === 0) {
    return (
      <div className="h-[380px] flex items-center justify-center">
        <div className="text-[10px] font-mono text-[var(--color-text-muted)]">
          No cycle data available
        </div>
      </div>
    );
  }

  const cellCls = (extra = '') =>
    `px-2 py-1.5 text-[10px] font-mono bg-[var(--color-card)] transition-opacity duration-200 ${extra}`;

  return (
    <div className="overflow-x-auto">
      <div className="grid gap-px bg-[var(--color-border)]" style={{ gridTemplateColumns: '56px minmax(220px,1fr) minmax(150px,1fr) minmax(140px,1fr)' }}>
        <div className="bg-[var(--color-surface-2)] px-2 py-1.5 text-[9px] font-bold text-[var(--color-text-muted)] font-display uppercase">Cycle</div>
        <div className="bg-[var(--color-surface-2)] px-2 py-1.5 text-[9px] font-bold text-[#00FF88] font-display uppercase">Issued</div>
        <div className="bg-[var(--color-surface-2)] px-2 py-1.5 text-[9px] font-bold text-[var(--color-text-muted)] font-display uppercase">Ready</div>
        <div className="bg-[var(--color-surface-2)] px-2 py-1.5 text-[9px] font-bold text-[#FFB000] font-display uppercase">Stalled</div>

        {lines.map((info, i) => {
          const visible = visibleRows.has(i);
          const issued = info.issued;
          return (
            <React.Fragment key={info.cycle}>
              <div className={`${cellCls()} ${visible ? 'opacity-100' : 'opacity-0'}`}>
                <span className="text-[#FFB000]">C{info.cycle}</span>
              </div>
              <div className={`${cellCls()} ${visible ? 'opacity-100' : 'opacity-0'}`}>
                {issued.length === 0 && <span className="text-[var(--color-text-muted)]">—</span>}
                <div className="flex flex-wrap items-center gap-1">
                  {issued.map(line => {
                    const instr = instrMap.get(line);
                    const unit = unitByLine.get(line);
                    const color = unit ? (UNIT_COLORS[unit] || '#6A7B9B') : '#6A7B9B';
                    return (
                      <span key={line} className="flex items-center gap-1 whitespace-nowrap">
                        {lineChip(line)}
                        <span className="text-[9px] text-[var(--color-text-dim)]">{formatInstr(instr)}</span>
                        <span className="text-[8px]" style={{ color }}>{unit}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
              <div className={`${cellCls()} ${visible ? 'opacity-100' : 'opacity-0'}`}>
                {info.ready.length === 0 && <span className="text-[var(--color-text-muted)]">—</span>}
                <div className="flex flex-wrap gap-1">
                  {info.ready.map(line => lineChip(line))}
                </div>
              </div>
              <div className={`${cellCls()} ${visible ? 'opacity-100' : 'opacity-0'}`}>
                {info.stalled.length === 0 && <span className="text-[var(--color-text-muted)]">—</span>}
                <div className="flex flex-wrap gap-1">
                  {info.stalled.map(line => (
                    <span
                      key={line}
                      className="px-1 py-0.5 text-[9px] font-mono border rounded border-[rgba(255,176,0,0.35)] bg-[rgba(255,176,0,0.08)] text-[#FFB000]"
                      title={`Stalled: ready but issue limit reached`}
                    >
                      L{line}
                    </span>
                  ))}
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
      <div className="px-3 py-1.5 text-[8px] font-mono text-[var(--color-text-muted)]">
        Stalled = ready to issue but held back because the processor can issue at most 2 instructions per cycle.
      </div>
    </div>
  );
};

export default ReservationTable;