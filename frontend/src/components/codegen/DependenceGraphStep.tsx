import React from 'react';
import { useTranslation } from 'react-i18next';
import { Network } from 'lucide-react';
import type { TacInstruction } from '../../types';
import type { SchedulingResult } from '../../lib/cfg/scheduling';
import DependencyGraph from '../cfg/DependencyGraph';

interface Props {
  data: { instructions: TacInstruction[] };
  scheduling: SchedulingResult;
  isPlaying: boolean;
  isCompleted: boolean;
}

const DependenceGraphStep: React.FC<Props> = ({ data, scheduling, isPlaying, isCompleted }) => {
  const { t } = useTranslation();
  const instructions = data.instructions;

  return (
    <div className="flex flex-col gap-3 bg-[var(--color-card)] border border-[var(--color-border)] p-4">
      <div className="flex items-center gap-2">
        <Network size={14} className="text-[#FFB000] shrink-0" />
        <h3 className="text-sm font-bold text-[var(--color-text)] font-display tracking-[0.1em] uppercase">
          {t('codegen.step1.title')}
        </h3>
        <span className="text-[8px] font-bold font-mono px-1.5 py-0.5 tracking-wider border border-[rgba(255,176,0,0.3)] text-[#FFB000] bg-[rgba(255,176,0,0.06)]">
          {t('codegen.step1.algorithm')}
        </span>
      </div>
      <p className="text-xs text-[var(--color-text-muted)] font-mono">
        {t('codegen.step1.description')}
      </p>

      <div className="flex flex-wrap gap-4">
        <div className="text-[9px] font-mono text-[var(--color-text-muted)]">
          <span className="text-[#00D4FF] font-bold">{scheduling.criticalPathInfo?.criticalLength ?? 0}</span> critical chain
        </div>
        <div className="text-[9px] font-mono text-[var(--color-text-muted)]">
          <span className="text-[#FF3366] font-bold">{scheduling.dependencies.length}</span> dependencies
        </div>
        <div className="text-[9px] font-mono text-[var(--color-text-muted)]">
          <span className="text-[var(--color-text)] font-bold">{instructions.filter(i => i.op !== 'label' && i.op !== 'method_start' && i.op !== 'method_end').length}</span> instructions
        </div>
      </div>

      <div className="bg-[var(--color-void)] border border-[var(--color-border)] overflow-hidden">
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
    </div>
  );
};

export default DependenceGraphStep;
