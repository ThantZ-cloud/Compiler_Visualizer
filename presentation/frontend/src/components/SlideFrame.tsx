import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Languages, Maximize, Minimize } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { TOTAL_SLIDES } from '../hooks/useDeck';

interface SlideFrameProps {
  step: number;
  onPrev: () => void;
  onNext: () => void;
  onGoTo: (n: number) => void;
  onFullscreen: () => void;
  isFullscreen: boolean;
  children: React.ReactNode;
}

export const SlideFrame: React.FC<SlideFrameProps> = ({
  step,
  onPrev,
  onNext,
  onGoTo,
  onFullscreen,
  isFullscreen,
  children,
}) => {
  const { t } = useTranslation();
  const { language, toggle } = useLanguage();

  return (
    <div className="flex h-full min-h-screen flex-col bg-void text-text">
      {/* Top bar */}
      <header className="no-print flex items-center justify-between border-b border-border px-4 py-2 sm:px-6">
        <span className="min-w-0 truncate font-mono text-xs tracking-widest text-text-dim">
          {t('deck.groupTag')}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          <span className="font-mono text-xs tracking-widest text-neon">
            {t('deck.slideCounter', { cur: step + 1, total: TOTAL_SLIDES })}
          </span>
          <button
            type="button"
            onClick={toggle}
            title={t('deck.toggleLanguage')}
            aria-label={t('deck.toggleLanguage')}
            className="flex items-center gap-1 border border-border-bright px-2 py-1 font-mono text-xs text-text-dim transition-colors hover:border-neon hover:text-neon"
          >
            <Languages size={13} />
            {language === 'en' ? 'မြန်' : 'EN'}
          </button>
          <button
            type="button"
            onClick={onFullscreen}
            title={isFullscreen ? t('deck.exitFullscreen') : t('deck.fullscreen')}
            aria-label={isFullscreen ? t('deck.exitFullscreen') : t('deck.fullscreen')}
            className="border border-border-bright p-1 text-text-dim transition-colors hover:border-neon hover:text-neon"
          >
            {isFullscreen ? <Minimize size={13} /> : <Maximize size={13} />}
          </button>
        </div>
      </header>

      {/* Progress bar */}
      <div className="no-print h-0.5 w-full bg-surface">
        <div
          className="h-full bg-neon transition-all duration-300"
          style={{ width: `${((step + 1) / TOTAL_SLIDES) * 100}%` }}
        />
      </div>

      {/* Stage */}
      <main className="print-stack relative flex flex-1 items-start justify-center overflow-y-auto bg-void-light p-3 sm:items-center sm:overflow-hidden sm:p-6">
        <div
          key={step}
          className="slide-enter print-slide relative w-full max-w-6xl border border-border bg-card shadow-sm sm:aspect-video sm:max-h-full sm:overflow-hidden"
        >
          {children}
        </div>

        {/* click zones */}
        <button
          type="button"
          aria-label={t('deck.prev')}
          onClick={onPrev}
          disabled={step === 0}
          className="no-print absolute left-0 top-0 hidden h-full w-12 opacity-0 disabled:hidden sm:block"
        />
        <button
          type="button"
          aria-label={t('deck.next')}
          onClick={onNext}
          disabled={step === TOTAL_SLIDES - 1}
          className="no-print absolute right-0 top-0 hidden h-full w-12 opacity-0 disabled:hidden sm:block"
        />
      </main>

      {/* Bottom nav */}
      <footer className="no-print flex items-center justify-between border-t border-border px-4 py-2 sm:px-6">
        <button
          type="button"
          onClick={onPrev}
          disabled={step === 0}
          className="flex items-center gap-1 border border-border-bright px-3 py-1 font-display text-xs tracking-widest text-text-dim transition-colors hover:border-neon hover:text-neon disabled:opacity-30 disabled:hover:border-border-bright disabled:hover:text-text-dim"
        >
          <ChevronLeft size={14} /> {t('deck.prev')}
        </button>
        <div className="flex items-center gap-1.5">
          {Array.from({ length: TOTAL_SLIDES }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onGoTo(i)}
              title={t('deck.goToSlide', { n: i + 1 })}
              aria-label={t('deck.goToSlide', { n: i + 1 })}
              className={`h-2 w-2 transition-colors ${
                i === step ? 'bg-neon' : 'bg-border-bright hover:bg-text-dim'
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={onNext}
          disabled={step === TOTAL_SLIDES - 1}
          className="flex items-center gap-1 border border-neon px-3 py-1 font-display text-xs tracking-widest text-neon transition-colors hover:bg-neon hover:text-void disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-neon"
        >
          {t('deck.next')} <ChevronRight size={14} />
        </button>
      </footer>
    </div>
  );
};
