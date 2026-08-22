import React from 'react';
import type { PipelineStepData } from '../../data/pipelineData';

interface Props {
  steps: PipelineStepData[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

const PHASE_LABELS: Record<number, string> = {
  1: 'FRONT END',
  2: 'FRONT END',
  3: 'FRONT END',
  4: 'FRONT END',
  5: 'FRONT END',
  6: 'OPTIMIZER',
  7: 'BACK END',
  8: 'BACK END',
};

const GROUP_ORDER = [
  { key: 'frontEnd', label: 'FRONT END', ids: ['source', 'lexical', 'syntax', 'semantic', 'ir'] },
  { key: 'optimizer', label: 'OPTIMIZER', ids: ['optimizer'] },
  { key: 'backEnd', label: 'BACK END', ids: ['bytecode', 'execution'] },
] as const;

const PipelineToc: React.FC<Props> = ({ steps, activeIndex, onSelect }) => {
  const stepById = new Map(steps.map(s => [s.id, s]));
  const activeStep = steps[activeIndex];

  return (
    <nav aria-label="Pipeline table of contents" className="flex flex-col gap-6">
      {/* Mobile pill bar — also used as top nav on narrow screens (hidden on lg where sidebar shows) */}
      <div className="lg:hidden -mx-4 px-4 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {steps.map((step, i) => {
          const isActive = i === activeIndex;
          return (
            <button
              key={step.id}
              onClick={() => onSelect(i)}
              className={`shrink-0 px-3 py-1.5 text-[11px] font-bold tracking-[0.08em] border transition-colors whitespace-nowrap
                ${isActive
                  ? 'bg-[var(--color-neon)] text-[var(--color-void)] border-[var(--color-neon)]'
                  : 'bg-[var(--color-card)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-[var(--color-neon)] hover:text-[var(--color-neon)]'}`}
              style={{ fontFamily: 'var(--font-display)' }}
              aria-current={isActive ? 'true' : undefined}
            >
              <span className="font-mono text-[10px] opacity-70 mr-1">{String(step.phase).padStart(2, '0')}</span>
              {step.title.split(' ')[0]}
            </button>
          );
        })}
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-col gap-6 sticky top-6">
        {GROUP_ORDER.map(group => (
          <div key={group.key}>
            <div
              className="text-[10px] font-bold tracking-[0.2em] mb-2"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-muted)' }}
            >
              {group.label}
            </div>
            <div className="flex flex-col gap-1 border-l border-[var(--color-border)]">
              {group.ids.map(id => {
                const step = stepById.get(id);
                if (!step) return null;
                const idx = steps.findIndex(s => s.id === id);
                const isActive = step.id === activeStep?.id;
                return (
                  <button
                    key={id}
                    onClick={() => onSelect(idx)}
                    className={`text-left pl-3 py-1.5 border-l-2 -ml-px text-xs leading-snug transition-colors
                      ${isActive
                        ? 'border-[var(--color-neon)] text-[var(--color-neon)] bg-[var(--color-neon)]/5 font-semibold'
                        : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-border-bright)]'}`}
                    style={{ fontFamily: 'var(--font-mono)' }}
                    aria-current={isActive ? 'true' : undefined}
                  >
                    <span className="font-bold mr-1.5 text-[10px] opacity-60">{String(step.phase).padStart(2, '0')}</span>
                    {step.title}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Small phase badge for context */}
        {activeStep && (
          <div className="mt-2 pt-4 border-t border-[var(--color-border)]">
            <div className="text-[10px] font-mono text-[var(--color-text-muted)] mb-1">Currently viewing</div>
            <div className="text-xs font-bold text-[var(--color-text)]" style={{ fontFamily: 'var(--font-display)' }}>
              {String(activeStep.phase).padStart(2, '0')} — {activeStep.title}
            </div>
            <div className="text-[10px] font-mono text-[var(--color-text-muted)] mt-0.5">{PHASE_LABELS[activeStep.phase] ?? ''}</div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default PipelineToc;
