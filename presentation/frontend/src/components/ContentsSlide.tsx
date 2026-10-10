import { useTranslation } from 'react-i18next';
import {
  Database,
  Flag,
  Info,
  Layers,
  MessagesSquare,
  Rocket,
  Target,
  TriangleAlert,
  Workflow,
} from 'lucide-react';
import { SlideHead } from './SlideHead';

const ITEM_ICONS = [Info, Target, Layers, Database, Workflow, TriangleAlert, Rocket, Flag, MessagesSquare];

export const ContentsSlide = () => {
  const { t } = useTranslation();
  const items = t('slides.contents.items', { returnObjects: true }) as string[];
  return (
    <div className="flex h-full flex-col p-6 sm:p-10">
      <SlideHead kicker={t('slides.contents.kicker')} title={t('slides.contents.title')} accent="cyan" />
      <ol className="flex flex-1 flex-col justify-center gap-2.5">
        {items.map((item, i) => {
          const Icon = ITEM_ICONS[i % ITEM_ICONS.length];
          return (
            <li
              key={i}
              className="mx-2 flex max-w-3xl items-center gap-3 border border-border bg-surface px-4 py-2 sm:mx-4"
            >
              <span className="font-display text-base font-bold text-neon">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="bg-neon/10 p-1.5">
                <Icon size={18} className="text-neon" />
              </span>
              <span className="font-sans text-base text-text sm:text-lg">{item}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
};
