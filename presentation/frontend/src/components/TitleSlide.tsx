import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Braces,
  ChevronRight,
  Cpu,
  FileCode,
  Network,
  Play,
  ScanText,
  Share2,
  Cog,
} from 'lucide-react';

const PHASE_ICONS = [ScanText, Network, Braces, Share2, Cog, Cpu, FileCode, Play];

export const TitleSlide = () => {
  const { t } = useTranslation();
  const phases = t('slides.title.phases', { returnObjects: true }) as string[];
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center sm:gap-5">
      <p className="border border-border bg-surface px-3 py-1 font-mono text-sm text-neon sm:text-base">
        {t('slides.title.kicker')}
      </p>
      <h1 className="accent-headline font-display text-3xl font-black tracking-tight sm:text-6xl">
        {t('slides.title.headline')}
      </h1>
      <p className="font-sans text-lg font-medium tracking-wide text-text-dim sm:text-xl">
        {t('slides.title.sub')}
      </p>
      <div className="flex max-w-full flex-wrap items-center justify-center gap-y-1.5">
        {phases.map((phase, i) => {
          const Icon = PHASE_ICONS[i % PHASE_ICONS.length];
          return (
            <Fragment key={phase}>
              {i > 0 && <ChevronRight size={12} className="mx-0.5 shrink-0 text-text-muted" />}
              <span className="flex items-center gap-1 border border-border bg-surface px-1.5 py-1">
                <Icon size={14} className="text-neon" />
                <span className="font-mono text-[11px] text-text">{phase}</span>
              </span>
            </Fragment>
          );
        })}
      </div>
      <p className="no-print font-mono text-xs tracking-widest text-text-muted">
        {t('slides.title.hint')}
      </p>
    </div>
  );
};
