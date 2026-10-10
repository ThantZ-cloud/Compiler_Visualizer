import { useTranslation } from 'react-i18next';
import { MessageCircleQuestion } from 'lucide-react';

export const QASlide = () => {
  const { t } = useTranslation();
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center sm:gap-5">
      <p className="font-mono text-sm tracking-widest text-cyan">
        {t('slides.qa.kicker')}
      </p>
      <MessageCircleQuestion size={48} className="text-neon" />
      <h2 className="accent-headline font-display text-3xl font-black tracking-tight sm:text-6xl">
        {t('slides.qa.title')}
      </h2>
      <p className="font-sans text-base font-medium tracking-wide text-text-dim sm:text-lg">
        {t('slides.qa.sub')}
      </p>
      <p className="font-mono text-xs tracking-widest text-text-muted">
        {t('deck.groupTag')}
      </p>
    </div>
  );
};
