import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  ArrowLeftRight,
  EyeOff,
  Languages,
  Sparkles,
  Wrench,
  Zap,
} from 'lucide-react';
import { SlideHead } from './SlideHead';

export const IntroSlide = () => {
  const { t } = useTranslation();
  return (
    <div className="flex h-full flex-col p-5 sm:p-6">
      <SlideHead kicker={t('slides.intro.kicker')} title={t('slides.intro.title')} />
      {/* Top band — the basics */}
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="border border-border bg-surface p-3">
          <p className="mb-1 flex items-center gap-1.5 font-display text-xs font-bold tracking-widest text-neon sm:text-sm">
            <Languages size={15} /> {t('slides.intro.basics.whatTitle').toUpperCase()}
          </p>
          <p className="font-sans text-[13px] leading-snug text-text sm:text-sm">
            {t('slides.intro.basics.whatBody')}
          </p>
        </div>
        <div className="border border-border bg-surface p-3">
          <p className="mb-1 flex items-center gap-1.5 font-display text-xs font-bold tracking-widest text-amber sm:text-sm">
            <Zap size={15} /> {t('slides.intro.basics.whyTitle').toUpperCase()}
          </p>
          <p className="font-sans text-[13px] leading-snug text-text sm:text-sm">
            {t('slides.intro.basics.whyBody')}
          </p>
        </div>
        <div className="border border-border bg-surface p-3">
          <p className="mb-1 flex items-center gap-1.5 font-display text-xs font-bold tracking-widest text-cyan sm:text-sm">
            <ArrowLeftRight size={15} /> {t('slides.intro.basics.vsTitle').toUpperCase()}
          </p>
          <p className="mb-1.5 font-sans text-[13px] leading-snug text-text sm:text-sm">
            {t('slides.intro.basics.vsBody')}
          </p>
          <div className="space-y-1">
            <p className="font-mono text-[11px] text-text-dim">
              {t('slides.intro.basics.javaLabel')}:{' '}
              <span className="bg-surface-2 px-1.5 py-0.5 text-text">
                {t('slides.intro.basics.javaChip')}
              </span>
            </p>
            <p className="font-mono text-[11px] text-text-dim">
              {t('slides.intro.basics.jsLabel')}:{' '}
              <span className="bg-surface-2 px-1.5 py-0.5 text-text">
                {t('slides.intro.basics.jsChip')}
              </span>
            </p>
          </div>
        </div>
      </div>
      {/* Bottom band — problem vs fix */}
      <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="relative flex flex-col justify-center overflow-hidden border border-rose/40 bg-rose/5 p-4">
          <EyeOff
            size={100}
            className="pointer-events-none absolute -bottom-4 -right-4 text-rose opacity-[0.08]"
          />
          <p className="mb-1.5 flex items-center gap-2 font-display text-xs font-bold tracking-widest text-rose sm:text-sm">
            <AlertTriangle size={15} /> {t('slides.intro.problemTitle').toUpperCase()}
          </p>
          <p className="relative font-sans text-sm leading-relaxed text-text sm:text-base">
            {t('slides.intro.problemBody')}
          </p>
        </div>
        <div className="relative flex flex-col justify-center overflow-hidden border border-neon/40 bg-neon/5 p-4">
          <Sparkles
            size={100}
            className="pointer-events-none absolute -bottom-4 -right-4 text-neon opacity-[0.08]"
          />
          <p className="mb-1.5 flex items-center gap-2 font-display text-xs font-bold tracking-widest text-neon sm:text-sm">
            <Wrench size={15} /> {t('slides.intro.fixTitle').toUpperCase()}
          </p>
          <p className="relative font-sans text-sm leading-relaxed text-text sm:text-base">
            {t('slides.intro.fixBody')}
          </p>
        </div>
      </div>
    </div>
  );
};
