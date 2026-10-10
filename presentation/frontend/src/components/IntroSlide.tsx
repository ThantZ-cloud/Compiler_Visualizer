import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  ArrowLeftRight,
  Languages,
  Wrench,
  Zap,
} from 'lucide-react';
import { SlideHead } from './SlideHead';

export const IntroSlide = () => {
  const { t } = useTranslation();
  return (
    <div className="flex h-full flex-col p-5 sm:p-8">
      <SlideHead kicker={t('slides.intro.kicker')} title={t('slides.intro.title')} />
      <ul className="flex flex-1 flex-col justify-center gap-2.5">
        <li className="flex items-center gap-3 border border-border bg-surface px-4 py-2.5">
          <span className="bg-neon/10 p-2">
            <Languages size={20} className="text-neon" />
          </span>
          <span>
            <span className="block font-display text-sm font-bold tracking-widest text-neon">
              {t('slides.intro.basics.whatTitle').toUpperCase()}
            </span>
            <span className="font-sans text-sm text-text sm:text-base">
              {t('slides.intro.basics.whatBody')}
            </span>
          </span>
        </li>
        <li className="flex items-center gap-3 border border-border bg-surface px-4 py-2.5">
          <span className="bg-amber/10 p-2">
            <Zap size={20} className="text-amber" />
          </span>
          <span>
            <span className="block font-display text-sm font-bold tracking-widest text-amber">
              {t('slides.intro.basics.whyTitle').toUpperCase()}
            </span>
            <span className="font-sans text-sm text-text sm:text-base">
              {t('slides.intro.basics.whyBody')}
            </span>
          </span>
        </li>
        <li className="flex items-center gap-3 border border-border bg-surface px-4 py-2.5">
          <span className="bg-cyan/10 p-2">
            <ArrowLeftRight size={20} className="text-cyan" />
          </span>
          <span>
            <span className="block font-display text-sm font-bold tracking-widest text-cyan">
              {t('slides.intro.basics.vsTitle').toUpperCase()}
            </span>
            <span className="font-sans text-sm text-text sm:text-base">
              {t('slides.intro.basics.vsBody')}{' '}
              <span className="whitespace-nowrap font-mono text-[13px] text-text-dim">
                {t('slides.intro.basics.javaLabel')}:{' '}
                <span className="bg-surface-2 px-1.5 py-0.5 text-text">
                  {t('slides.intro.basics.javaChip')}
                </span>{' '}
                / {t('slides.intro.basics.jsLabel')}:{' '}
                <span className="bg-surface-2 px-1.5 py-0.5 text-text">
                  {t('slides.intro.basics.jsChip')}
                </span>
              </span>
            </span>
          </span>
        </li>
        <li className="flex items-center gap-3 border border-border bg-surface px-4 py-2.5">
          <span className="bg-rose/10 p-2">
            <AlertTriangle size={20} className="text-rose" />
          </span>
          <span>
            <span className="block font-display text-sm font-bold tracking-widest text-rose">
              {t('slides.intro.problemTitle').toUpperCase()}
            </span>
            <span className="font-sans text-sm text-text sm:text-base">
              {t('slides.intro.problemBody')}
            </span>
          </span>
        </li>
        <li className="flex items-center gap-3 border border-border bg-surface px-4 py-2.5">
          <span className="bg-neon/10 p-2">
            <Wrench size={20} className="text-neon" />
          </span>
          <span>
            <span className="block font-display text-sm font-bold tracking-widest text-neon">
              {t('slides.intro.fixTitle').toUpperCase()}
            </span>
            <span className="font-sans text-sm text-text sm:text-base">
              {t('slides.intro.fixBody')}
            </span>
          </span>
        </li>
      </ul>
    </div>
  );
};
