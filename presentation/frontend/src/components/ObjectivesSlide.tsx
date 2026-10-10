import { useTranslation } from 'react-i18next';
import {
  Blocks,
  Compass,
  Eye,
  GraduationCap,
  KeyRound,
  Languages,
  Network,
  Tag,
} from 'lucide-react';
import { SlideHead } from './SlideHead';

const ICONS = [Eye, Blocks, Tag, Compass, Languages, Network, KeyRound, GraduationCap];

export const ObjectivesSlide = () => {
  const { t } = useTranslation();
  const items = t('slides.objectives.items', { returnObjects: true }) as string[];
  return (
    <div className="flex h-full flex-col p-5 sm:p-8">
      <SlideHead kicker={t('slides.objectives.kicker')} title={t('slides.objectives.title')} />
      <ul className="grid flex-1 grid-cols-1 grid-rows-8 gap-3 sm:grid-cols-2 sm:grid-rows-4">
        {items.map((item, i) => {
          const Icon = ICONS[i % ICONS.length];
          return (
            <li key={i} className="flex items-center gap-3 border border-border bg-surface px-4 py-3">
              <Icon size={22} className="shrink-0 text-neon" />
              <span className="font-sans text-lg leading-snug text-text">
                <span className="mr-1 font-mono text-neon">{i + 1}.</span>
                {item}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
