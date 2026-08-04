import React from 'react';
import { useTranslation } from 'react-i18next';
import { ScanText, Network, SearchCheck, GitFork, Cpu, Check, ChevronRight } from 'lucide-react';
import { useStepper } from '../context/StepperContext';
import type { StageId } from '../lib/buildSteps';

const STAGES: Array<{ id: StageId; labelKey: string; icon: React.ComponentType<{ size?: number | string; className?: string }> }> = [
  { id: 'lexer', labelKey: 'stages.lexer', icon: ScanText },
  { id: 'parser', labelKey: 'stages.parser', icon: Network },
  { id: 'semantic', labelKey: 'stages.semantic', icon: SearchCheck },
  { id: 'ir', labelKey: 'stages.ir', icon: GitFork },
  { id: 'codegen', labelKey: 'stages.codegen', icon: Cpu },
];

/**
 * Horizontal pipeline banner. Each pill reflects the stepping engine's
 * progress: pending (gray), active (blue + pulse), complete (emerald check).
 * Clicking a stage with data jumps the playback to it.
 */
const PipelineStepper: React.FC = () => {
  const { t } = useTranslation();
  const { getStageState, hasStageData, jumpToStage, hasSteps } = useStepper();

  return (
    <div className="flex items-center justify-center flex-wrap gap-1 px-4 py-3">
      {STAGES.map((stage, i) => {
        const state = getStageState(stage.id);
        const hasData = hasStageData(stage.id);
        const Icon = stage.icon;

        const base =
          'flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-all select-none';
        const byState =
          state === 'active'
            ? 'bg-[var(--color-neon)]/10 border-[var(--color-neon)] text-[var(--color-neon)] pulse-ring'
            : state === 'complete'
              ? 'bg-[var(--color-cyan)]/10 border-[var(--color-cyan)] text-[var(--color-cyan)]'
              : 'bg-[var(--color-card)] border-[var(--color-border)] text-[var(--color-text-muted)]';
        const interactivity = hasSteps && hasData ? 'cursor-pointer hover:border-[var(--color-neon)]' : 'cursor-default opacity-80';

        return (
          <React.Fragment key={stage.id}>
            <button
              type="button"
              className={`${base} ${byState} ${interactivity}`}
              onClick={() => hasData && jumpToStage(stage.id)}
              disabled={!hasSteps || !hasData}
              aria-current={state === 'active' ? 'step' : undefined}
              title={t(stage.labelKey)}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold
                  ${state === 'complete'
                    ? 'bg-[var(--color-cyan)] text-white'
                    : state === 'active'
                      ? 'bg-[var(--color-neon)] text-white'
                      : 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)]'}`}
              >
                {state === 'complete' ? <Check size={12} strokeWidth={3} /> : i + 1}
              </span>
              <Icon size={14} />
              <span className="hidden sm:inline">{t(stage.labelKey)}</span>
            </button>
            {i < STAGES.length - 1 && (
              <ChevronRight size={15} className="mx-0.5 shrink-0 text-[var(--color-border-bright)]" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default PipelineStepper;
