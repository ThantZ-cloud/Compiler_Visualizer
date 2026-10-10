import { useTranslation } from 'react-i18next';
import { Cloud, Eye, GraduationCap, MousePointerClick } from 'lucide-react';
import { SlideHead } from './SlideHead';

const TOPIC_ICONS = [Eye, MousePointerClick, Cloud, GraduationCap];

export const ConclusionSlide = () => {
  const { t } = useTranslation();
  const topics = t('slides.conclusion.topics', { returnObjects: true }) as string[];
  return (
    <div className="flex h-full flex-col p-5 sm:p-8">
      <SlideHead kicker={t('slides.conclusion.kicker')} title={t('slides.conclusion.title')} />
      <ul className="flex flex-1 flex-col justify-center gap-3 sm:gap-4">
        {topics.map((topic, i) => {
          const Icon = TOPIC_ICONS[i % TOPIC_ICONS.length];
          return (
            <li
              key={topic}
              className="flex items-center gap-3 border border-border bg-surface px-4 py-3"
            >
              <span className="bg-neon/10 p-2">
                <Icon size={22} className="text-neon" />
              </span>
              <span className="font-sans text-lg text-text sm:text-xl">{topic}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
