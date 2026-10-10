import { useTranslation } from 'react-i18next';
import { Database } from 'lucide-react';
import { SlideHead } from './SlideHead';

const USERS_FIELDS = [
  ['id', 'PK'],
  ['username', 'UNIQUE'],
  ['email', 'UNIQUE'],
  ['passwordHash', ''],
  ['createdAt', ''],
  ['updatedAt', ''],
];

const SAVED_FIELDS = [
  ['id', 'PK'],
  ['user_id', 'FK → users.id'],
  ['title', ''],
  ['sourceCode', 'TEXT'],
  ['createdAt', ''],
  ['updatedAt', ''],
];

const Table = ({ name, fields, accent }: { name: string; fields: string[][]; accent: string }) => (
  <div className={`w-full border bg-surface ${accent}`}>
    <p className="flex items-center gap-2 border-b border-border px-3 py-1.5 font-mono text-sm font-bold text-text">
      <Database size={15} className="text-neon" /> {name}
    </p>
    {fields.map(([f, tag]) => (
      <div key={f} className="flex items-center justify-between border-b border-border/50 px-3 py-1 last:border-0">
        <span className="font-mono text-sm text-text">{f}</span>
        {tag && (
          <span className="border border-amber/50 px-1 font-mono text-xs tracking-widest text-amber">
            {tag}
          </span>
        )}
      </div>
    ))}
  </div>
);

export const ERSlide = () => {
  const { t } = useTranslation();
  return (
    <div className="flex h-full flex-col p-5 sm:p-8">
      <SlideHead kicker={t('slides.er.kicker')} title={t('slides.er.title')} accent="cyan" />
      <div className="flex flex-1 items-center justify-center gap-2 sm:gap-6">
        <div className="w-40 sm:w-56">
          <Table name={t('slides.er.users')} fields={USERS_FIELDS} accent="border-cyan/40" />
        </div>
        <div className="flex flex-col items-center gap-1 px-1">
          <span className="font-mono text-xs tracking-widest text-neon sm:text-sm">
            {t('slides.er.owns')}
          </span>
          <span className="font-mono text-xl text-neon">⟶</span>
        </div>
        <div className="w-40 sm:w-56">
          <Table name={t('slides.er.savedCode')} fields={SAVED_FIELDS} accent="border-magenta/40" />
        </div>
      </div>
      <p className="mt-2 text-center font-mono text-xs tracking-widest text-text-dim sm:text-sm">
        // {t('slides.er.note')}
      </p>
    </div>
  );
};
