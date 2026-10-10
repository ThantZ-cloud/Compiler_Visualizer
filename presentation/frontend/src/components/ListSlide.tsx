import { useTranslation } from 'react-i18next';
import { Rocket, TriangleAlert } from 'lucide-react';
import { SlideHead } from './SlideHead';

export const ListSlide = ({ kind }: { kind: 'limitations' | 'future' }) => {
  const { t } = useTranslation();
  const items = t(`slides.${kind}.items`, { returnObjects: true }) as string[];
  const Icon = kind === 'limitations' ? TriangleAlert : Rocket;
  const accent = kind === 'limitations' ? 'text-rose' : 'text-amber';
  return (
    <div className="flex h-full flex-col p-5 sm:p-8">
      <SlideHead
        kicker={t(`slides.${kind}.kicker`)}
        title={t(`slides.${kind}.title`)}
        accent={kind === 'limitations' ? 'amber' : 'neon'}
      />
      <ul className="flex flex-1 flex-col justify-center gap-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-3 border border-border bg-surface px-4 py-2">
            <Icon size={20} className={`shrink-0 ${accent}`} />
            <span className="font-mono text-xs text-text-dim">0{i + 1}</span>
            <span className="font-sans text-lg text-text">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
