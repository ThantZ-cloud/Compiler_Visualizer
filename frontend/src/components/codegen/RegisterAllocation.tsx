import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Cpu } from 'lucide-react';
import type { RegAllocationResult } from '../../lib/cfg/regalloc';
import InterferenceGraph from './InterferenceGraph';
import { REG_COLORS } from '../../lib/cfg/regColors';

interface RegisterAllocationProps {
  allocation: RegAllocationResult;
  isPlaying: boolean;
  isCompleted: boolean;
  showInterferenceGraph?: boolean;
}

const RegisterAllocation: React.FC<RegisterAllocationProps> = ({ allocation, isPlaying, isCompleted, showInterferenceGraph = true }) => {
  const { t } = useTranslation();
  const [visibleSteps, setVisibleSteps] = useState<Set<number>>(new Set());
  const [highlightVar, setHighlightVar] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isPlaying) {
      if (isCompleted) {
        setVisibleSteps(new Set(allocation.coloringSteps.map((_, i) => i)));
      } else {
        setVisibleSteps(new Set());
        setHighlightVar(null);
      }
      return;
    }
    setVisibleSteps(new Set());
    let i = 0;
    const show = () => {
      if (i >= allocation.coloringSteps.length) return;
      setVisibleSteps(prev => new Set([...prev, i]));
      setHighlightVar(allocation.coloringSteps[i].variable);
      i++;
      timerRef.current = setTimeout(show, 400);
    };
    timerRef.current = setTimeout(show, 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isPlaying, isCompleted, allocation]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 px-1">
        <Cpu size={14} className="text-[#8A2BE2]" />
        <h4 className="text-[11px] font-bold text-[var(--color-text)] font-display tracking-[0.1em] uppercase m-0">
          {t(showInterferenceGraph ? 'codegen.regalloc.title' : 'codegen.step4.title', 'Register Allocation')}
        </h4>
        {!showInterferenceGraph && (
          <span className="text-[8px] font-bold font-mono px-1.5 py-0.5 tracking-wider border border-[rgba(138,43,226,0.3)] text-[#8A2BE2] bg-[rgba(138,43,226,0.06)]">
            {t('codegen.step4.algorithm')}
          </span>
        )}
        <span className="text-[9px] text-[var(--color-text-muted)] font-mono">
          ({allocation.numRegisters} registers, {allocation.spills.length} spills)
        </span>
      </div>
      <p className="text-[10px] text-[var(--color-text-dim)] font-mono px-1 -mt-1">
        {t(showInterferenceGraph ? 'codegen.regalloc.description' : 'codegen.step4.description', 'Variables are assigned to physical registers using graph coloring. Variables that interfere (are simultaneously live) cannot share a register. Excess variables are spilled to memory.')}
      </p>

      {/*
        The coloring log reveals step-by-step only while playing; the
        assignments/spills/graph are always visible so the user never sees
        an empty box.
      */}
      <>
      {/* Stats */}
      <div className="flex gap-4 px-1">
        <div className="text-[9px] font-mono text-[var(--color-text-muted)]">
          <span className="text-[#8A2BE2] font-bold">{allocation.variables.length}</span> variables
        </div>
        <div className="text-[9px] font-mono text-[var(--color-text-muted)]">
          <span className="text-[#00FF88] font-bold">{allocation.interferenceGraph.length}</span> interference edges
        </div>
        <div className="text-[9px] font-mono text-[var(--color-text-muted)]">
          <span className="text-[#FF3366] font-bold">{allocation.spills.length}</span> spills
        </div>
        <div className="text-[9px] font-mono text-[var(--color-text-muted)]">
          <span className="text-[#00D4FF] font-bold">
            {allocation.coalescedMoves.filter(m => m.eliminated).length}
          </span> copies coalesced
        </div>
      </div>

      {/* Interference graph (D3 node-link) */}
      {showInterferenceGraph && allocation.interferenceGraph.length > 0 && (
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] overflow-hidden">
          <div className="flex items-center justify-between px-3 pt-2.5 pb-1 gap-2 flex-wrap">
            <div className="text-[9px] text-[#8A2BE2] font-bold font-display tracking-[0.1em] uppercase">
              Interference Graph
            </div>
            <div className="flex items-center gap-2">
              {allocation.variables.map(v => {
                const reg = allocation.assignments.get(v);
                const color = reg === undefined ? '#FF3366' : REG_COLORS[reg % REG_COLORS.length];
                return (
                  <span key={v} className="flex items-center gap-1 text-[8px] font-mono text-[var(--color-text-muted)]">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ background: color }} />
                    {v}
                  </span>
                );
              })}
            </div>
          </div>
          <InterferenceGraph allocation={allocation} highlightVar={highlightVar} />
        </div>
      )}

      {/* Register assignments */}
      {allocation.assignments.size > 0 && (
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] p-3">
          <div className="text-[9px] text-[#00FF88] font-bold font-display tracking-[0.1em] uppercase mb-2">
            Register Assignments
          </div>
          <div className="flex flex-wrap gap-2">
            {[...allocation.assignments.entries()].map(([variable, reg]) => (
              <div
                key={variable}
                className={`flex items-center gap-1.5 text-[10px] font-mono px-2 py-1 border transition-all duration-200 ${
                  highlightVar === variable
                    ? 'border-[var(--color-neon)] bg-[rgba(0,255,136,0.08)]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)]'
                }`}
              >
                <span className="text-[var(--color-text)]">{variable}</span>
                <span className="text-[var(--color-text-muted)]">→</span>
                <span
                  className="font-bold px-1"
                  style={{ color: REG_COLORS[reg % REG_COLORS.length] }}
                >
                  R{reg}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Spill costs */}
      {allocation.spillCosts.length > 0 && (
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] p-3">
          <div className="text-[9px] text-[#FFB000] font-bold font-display tracking-[0.1em] uppercase mb-2">
            Spill Cost Ranking
          </div>
          <p className="text-[8px] text-[var(--color-text-dim)] font-mono m-0 mb-2">
            cost = references × (loop depth + 1) — the allocator spills the cheapest variable first
          </p>
          <div className="grid gap-px bg-[var(--color-border)]" style={{ gridTemplateColumns: '70px 50px 50px 50px 60px 1fr' }}>
            <div className="bg-[var(--color-surface)] px-2 py-1 text-[8px] font-bold text-[var(--color-text-muted)] font-display uppercase">Variable</div>
            <div className="bg-[var(--color-surface)] px-2 py-1 text-[8px] font-bold text-[var(--color-text-muted)] font-display uppercase">Cost</div>
            <div className="bg-[var(--color-surface)] px-2 py-1 text-[8px] font-bold text-[var(--color-text-muted)] font-display uppercase">Refs</div>
            <div className="bg-[var(--color-surface)] px-2 py-1 text-[8px] font-bold text-[var(--color-text-muted)] font-display uppercase">Loop</div>
            <div className="bg-[var(--color-surface)] px-2 py-1 text-[8px] font-bold text-[var(--color-text-muted)] font-display uppercase">Register</div>
            <div className="bg-[var(--color-surface)] px-2 py-1 text-[8px] font-bold text-[var(--color-text-muted)] font-display uppercase">Spill</div>
            {allocation.spillCosts.map(sc => {
              const reg = allocation.assignments.get(sc.variable);
              const spilled = allocation.spills.includes(sc.variable);
              return (
                <React.Fragment key={sc.variable}>
                  <div className="bg-[var(--color-card)] px-2 py-1 text-[9px] font-mono text-[var(--color-text)]">{sc.variable}</div>
                  <div className="bg-[var(--color-card)] px-2 py-1 text-[9px] font-mono text-[#FFB000]">{sc.cost}</div>
                  <div className="bg-[var(--color-card)] px-2 py-1 text-[9px] font-mono text-[var(--color-text-dim)]">{sc.references}</div>
                  <div className="bg-[var(--color-card)] px-2 py-1 text-[9px] font-mono text-[var(--color-text-dim)]">{sc.loopDepth}</div>
                  <div className="bg-[var(--color-card)] px-2 py-1 text-[9px] font-mono" style={{ color: reg === undefined ? '#FF3366' : REG_COLORS[reg % REG_COLORS.length] }}>
                    {reg === undefined ? '[stack]' : `R${reg}`}
                  </div>
                  <div className="bg-[var(--color-card)] px-2 py-1 text-[9px] font-mono text-[var(--color-text-dim)]">
                    {spilled ? 'spilled' : 'kept'}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* Move coalescing */}
      {allocation.coalescedMoves.length > 0 && (
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] p-3">
          <div className="text-[9px] text-[#00D4FF] font-bold font-display tracking-[0.1em] uppercase mb-2">
            Move Coalescing
          </div>
          <p className="text-[8px] text-[var(--color-text-dim)] font-mono m-0 mb-2">
            Copy instructions (a = b) are eliminated when both operands land in the same register
          </p>
          <div className="flex flex-col gap-1">
            {allocation.coalescedMoves.map((move, i) => (
              <div key={i} className="flex items-center gap-2 text-[9px] font-mono">
                <span className={move.eliminated ? 'text-[#00FF88]' : 'text-[#FF3366]'}>
                  {move.eliminated ? 'ELIMINATED' : 'KEPT'}
                </span>
                <span className="text-[var(--color-text)]">{move.from} → {move.to}</span>
                <span className="text-[var(--color-text-dim)]">{move.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Spills */}
      {allocation.spills.length > 0 && (
        <div className="bg-[var(--color-card)] border border-[rgba(255,51,102,0.2)] p-3">
          <div className="text-[9px] text-[#FF3366] font-bold font-display tracking-[0.1em] uppercase mb-2">
            Spilled to Memory
          </div>
          <div className="flex flex-wrap gap-1.5">
            {allocation.spills.map(variable => (
              <div
                key={variable}
                className="text-[10px] font-mono px-2 py-1 bg-[rgba(255,51,102,0.06)] border border-[rgba(255,51,102,0.2)] text-[#FF3366]"
              >
                {variable} [stack]
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Coloring steps log */}
      {isPlaying && allocation.coloringSteps.length > 0 && (
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] p-3 max-h-[200px] overflow-y-auto">
          <div className="text-[9px] text-[var(--color-text-muted)] font-bold font-display tracking-[0.1em] uppercase mb-2">
            Coloring Log
          </div>
          <div className="flex flex-col gap-0.5">
            {[...allocation.coloringSteps].reverse().map((step, ri) => {
              const idx = allocation.coloringSteps.length - 1 - ri;
              const visible = visibleSteps.has(idx);
              return (
                <div
                  key={idx}
                  className={`text-[9px] font-mono transition-all duration-200 ${
                    visible ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <span className={step.action === 'spill' ? 'text-[#FF3366]' : 'text-[#00FF88]'}>
                    {step.action === 'spill' ? 'SPILL' : `R${step.register}`}
                  </span>
                  <span className="text-[var(--color-text-muted)] mx-1">·</span>
                  <span className="text-[var(--color-text)]">{step.description}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      </>
    </div>
  );
};

export default RegisterAllocation;
