import React from 'react';
import { Play, Pause, ChevronUp, ChevronDown, RotateCcw } from 'lucide-react';
import type { PlayState } from '../../lib/lexer/types';

interface StepControlsProps {
  currentStep: number;
  playState: PlayState;
  onPlay: () => void;
  onPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onRestart: () => void;
  /** Optional per-step labels shown in the dots row */
  stepNames?: string[];
  /** Total number of steps (for enabling/disabling next button) */
  totalSteps?: number;
}

const DEFAULT_STEP_NAMES = ['Regex', 'NFA', 'DFA', 'Scanner'];

const StepControls: React.FC<StepControlsProps> = ({
  currentStep,
  playState,
  onPlay,
  onPause,
  onPrev,
  onNext,
  onRestart,
  stepNames = DEFAULT_STEP_NAMES,
  totalSteps = 4,
}) => {
  return (
    <div className="sticky bottom-0 z-20 flex items-center justify-between gap-3 px-4 py-1.5 bg-[var(--color-card)] border-t border-[var(--color-border-bright)]">
      {/* Left: icon-only nav buttons */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onPrev}
          disabled={currentStep === 0}
          aria-label="Previous step"
          title="Previous"
          className="flex items-center justify-center w-7 h-7 text-[var(--color-text-dim)] border border-[var(--color-border)] bg-transparent cursor-pointer transition-all hover:text-[var(--color-neon)] hover:border-[var(--color-neon)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-[var(--color-text-dim)] disabled:hover:border-[var(--color-border)]"
        >
          <ChevronUp size={14} />
        </button>

        {playState === 'playing' ? (
          <button
            onClick={onPause}
            aria-label="Pause"
            title="Pause"
            className="flex items-center justify-center w-8 h-7 text-[var(--color-void)] bg-[var(--color-neon)] border border-[var(--color-neon)] cursor-pointer transition-all hover:shadow-[0_0_16px_var(--color-neon-dim)]"
          >
            <Pause size={14} />
          </button>
        ) : (
          <button
            onClick={onPlay}
            aria-label="Play"
            title="Play"
            className="flex items-center justify-center w-8 h-7 text-[var(--color-void)] bg-[var(--color-neon)] border border-[var(--color-neon)] cursor-pointer transition-all hover:shadow-[0_0_16px_var(--color-neon-dim)]"
          >
            <Play size={14} />
          </button>
        )}

        <button
          onClick={onNext}
          disabled={currentStep === totalSteps - 1}
          aria-label="Next step"
          title="Next"
          className="flex items-center justify-center w-7 h-7 text-[var(--color-text-dim)] border border-[var(--color-border)] bg-transparent cursor-pointer transition-all hover:text-[var(--color-neon)] hover:border-[var(--color-neon)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-[var(--color-text-dim)] disabled:hover:border-[var(--color-border)]"
        >
          <ChevronDown size={14} />
        </button>

        <div className="w-px h-4 bg-[var(--color-border)] mx-1" />

        <button
          onClick={onRestart}
          aria-label="Restart"
          title="Restart"
          className="flex items-center justify-center w-7 h-7 text-[var(--color-text-dim)] border border-[var(--color-border)] bg-transparent cursor-pointer transition-all hover:text-[var(--color-rose)] hover:border-[var(--color-rose)]"
        >
          <RotateCcw size={13} />
        </button>
      </div>

      {/* Right: horizontal step dots */}
      <div className="flex items-center gap-1.5">
        {stepNames.map((name, i) => (
          <div key={i} className="flex items-center gap-1.5">
            {i > 0 && (
              <div
                className={`w-3 h-px ${
                  i <= currentStep ? 'bg-[var(--color-neon-dim)]' : 'bg-[var(--color-border-bright)]'
                }`}
              />
            )}
            <div
              className={`relative flex items-center gap-1.5 ${
                i === currentStep ? 'text-[var(--color-neon)]' : i < currentStep ? 'text-[var(--color-text-dim)]' : 'text-[var(--color-text-muted)]'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  i === currentStep
                    ? 'bg-[var(--color-neon)] shadow-[0_0_6px_var(--color-neon)]'
                    : i < currentStep
                    ? 'bg-[var(--color-neon-dim)]'
                    : 'bg-[var(--color-border-bright)]'
                }`}
              />
              <span className="text-[7px] font-mono uppercase tracking-wider hidden xl:inline">
                {name}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StepControls;