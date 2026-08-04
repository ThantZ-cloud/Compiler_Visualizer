import React from 'react';
import { useTranslation } from 'react-i18next';
import { RotateCcw, SkipBack, Play, Pause, SkipForward, Gauge } from 'lucide-react';
import { useStepper } from '../context/StepperContext';

/**
 * Floating playback deck anchored to the bottom-center of the Studio canvas.
 * Controls stepping through the compile result and shows a live explainer.
 */
const PlaybackDeck: React.FC = () => {
  const { t } = useTranslation();
  const {
    playing,
    togglePlay,
    stepBack,
    stepForward,
    reset,
    speed,
    setSpeed,
    explainerText,
    hasSteps,
    index,
    steps,
  } = useStepper();

  const controlBtn =
    'flex h-10 w-10 items-center justify-center rounded-full text-[var(--color-text-dim)] ' +
    'hover:bg-[var(--color-surface)] hover:text-[var(--color-neon)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

  const atEnd = index >= steps.length - 1;

  return (
    <div className="pointer-events-none absolute bottom-5 left-1/2 z-20 w-full max-w-2xl -translate-x-1/2 px-4">
      <div className="flex flex-col items-center gap-2.5">
        {/* Live explainer callout */}
        <div className="glass pointer-events-auto max-w-full rounded-full px-4 py-1.5">
          <p className="truncate text-center text-[12.5px] text-[var(--color-text-dim)]">
            {hasSteps && index >= 0 ? (
              <>
                <span className="font-semibold text-[var(--color-neon)]">{t('playback.currentStep')}: </span>
                {explainerText}
              </>
            ) : (
              t('playback.ready')
            )}
          </p>
        </div>

        {/* Controls bar */}
        <div className="glass pointer-events-auto flex items-center gap-1 rounded-2xl px-3 py-2">
          <button
            type="button"
            className={controlBtn}
            onClick={reset}
            disabled={!hasSteps}
            title={t('playback.reset')}
            aria-label={t('playback.reset')}
          >
            <RotateCcw size={18} />
          </button>
          <button
            type="button"
            className={controlBtn}
            onClick={stepBack}
            disabled={!hasSteps || index <= 0}
            title={t('playback.stepBack')}
            aria-label={t('playback.stepBack')}
          >
            <SkipBack size={18} />
          </button>

          {/* Play / pause — primary */}
          <button
            type="button"
            className="mx-1 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-neon)] text-white
              shadow-[var(--shadow-soft)] hover:bg-[#2563EB] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={togglePlay}
            disabled={!hasSteps}
            title={playing ? t('playback.pause') : t('playback.play')}
            aria-label={playing ? t('playback.pause') : t('playback.play')}
          >
            {playing ? <Pause size={19} /> : <Play size={19} className="ml-0.5" />}
          </button>

          <button
            type="button"
            className={controlBtn}
            onClick={stepForward}
            disabled={!hasSteps || atEnd}
            title={t('playback.stepForward')}
            aria-label={t('playback.stepForward')}
          >
            <SkipForward size={18} />
          </button>

          {/* Speed slider */}
          <div className="ml-2 flex items-center gap-2 border-l border-[var(--color-border)] pl-3">
            <Gauge size={16} className="text-[var(--color-text-muted)]" />
            <input
              type="range"
              min={0.5}
              max={4}
              step={0.5}
              value={speed}
              onChange={e => setSpeed(parseFloat(e.target.value))}
              disabled={!hasSteps}
              aria-label={t('playback.speed')}
              className="compili-range h-1 w-24 cursor-pointer appearance-none rounded-full bg-[var(--color-surface-2)]"
            />
            <span className="w-9 text-right text-[12px] font-semibold tabular-nums text-[var(--color-text-dim)]">
              {speed}x
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaybackDeck;
