import { useTranslation } from 'react-i18next';
import { FileInput, Languages, Waypoints } from 'lucide-react';
import { SlideHead } from './SlideHead';

const STAT_ICONS = [FileInput, Waypoints, Languages];

export const ConclusionSlide = () => {
  const { t } = useTranslation();
  const stats = t('slides.conclusion.stats', { returnObjects: true }) as string[];
  return (
    <div className="flex h-full flex-col p-5 sm:p-8">
      <SlideHead kicker={t('slides.conclusion.kicker')} title={t('slides.conclusion.title')} />
      <p className="flex-1 content-center border-l-4 border-neon pl-4 font-sans text-lg leading-relaxed text-text">
        {t('slides.conclusion.body')}
      </p>
      <div className="grid grid-cols-3 gap-2">
        {stats.map((s, i) => {
          const Icon = STAT_ICONS[i % STAT_ICONS.length];
          return (
            <div
              key={s}
              className="flex items-center justify-center gap-2 border border-neon/40 bg-neon/5 px-2 py-3 text-center"
            >
              <Icon size={20} className="shrink-0 text-neon" />
              <span className="accent-headline font-display text-base font-bold sm:text-lg">{s}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
