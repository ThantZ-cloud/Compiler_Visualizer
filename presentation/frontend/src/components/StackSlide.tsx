import { useTranslation } from 'react-i18next';
import {
  Braces,
  Code2,
  Database,
  Languages,
  Monitor,
  Server,
  SquareTerminal,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import {
  siApachemaven,
  siD3,
  siEslint,
  siGit,
  siJsonwebtokens,
  siMysql,
  siReact,
  siRender,
  siSpringboot,
  siSqlite,
  siTailwindcss,
  siVercel,
  type SimpleIcon,
} from 'simple-icons';
import { SlideHead } from './SlideHead';

const BrandIcon = ({ icon, size = 20 }: { icon: SimpleIcon; size?: number }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill={`#${icon.hex}`}
    role="img"
    aria-label={icon.title}
    className="shrink-0"
  >
    <path d={icon.path} />
  </svg>
);

interface GroupDef {
  icon: LucideIcon;
  title: string;
  items: string[];
  accent: string;
  art: (SimpleIcon | LucideIcon | null)[];
}

const isBrand = (a: SimpleIcon | LucideIcon | null): a is SimpleIcon =>
  !!a && 'path' in a && 'hex' in a;

const RowArt = ({
  art,
  accent,
}: {
  art: SimpleIcon | LucideIcon | null;
  accent: string;
}) => {
  if (isBrand(art)) return <BrandIcon icon={art} />;
  if (art) {
    const Fallback = art;
    return <Fallback size={18} className={`shrink-0 ${accent}`} />;
  }
  return <span className="mr-1 text-text-dim">▸</span>;
};

export const StackSlide = () => {
  const { t } = useTranslation();
  const groups: GroupDef[] = [
    {
      icon: Monitor,
      title: t('slides.stack.frontend'),
      items: t('slides.stack.frontendItems', { returnObjects: true }) as string[],
      accent: 'text-cyan border-cyan/40',
      art: [siReact, siTailwindcss, Code2, siD3, Languages],
    },
    {
      icon: Server,
      title: t('slides.stack.backend'),
      items: t('slides.stack.backendItems', { returnObjects: true }) as string[],
      accent: 'text-neon border-neon/40',
      art: [siSpringboot, Braces, siJsonwebtokens, SquareTerminal],
    },
    {
      icon: Database,
      title: t('slides.stack.database'),
      items: t('slides.stack.databaseItems', { returnObjects: true }) as string[],
      accent: 'text-magenta border-magenta/40',
      art: [siSqlite, siMysql, Database],
    },
    {
      icon: Wrench,
      title: t('slides.stack.tools'),
      items: t('slides.stack.toolsItems', { returnObjects: true }) as string[],
      accent: 'text-amber border-amber/40',
      art: [siApachemaven, Code2, siGit, siEslint, siVercel, siRender],
    },
  ];
  return (
    <div className="flex h-full flex-col p-5 sm:p-8">
      <SlideHead kicker={t('slides.stack.kicker')} title={t('slides.stack.title')} accent="magenta" />
      <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        {groups.map((g) => (
          <div key={g.title} className={`border bg-surface p-4 ${g.accent.split(' ')[1]}`}>
            <p className={`mb-3 flex items-center gap-2 font-display text-base font-bold tracking-widest ${g.accent.split(' ')[0]}`}>
              <g.icon size={20} /> {g.title.toUpperCase()}
            </p>
            <ul className="space-y-2.5">
              {g.items.map((item, i) => (
                <li key={item} className="flex items-center gap-2.5 font-mono text-sm leading-snug text-text sm:text-[15px]">
                  <RowArt art={g.art[i] ?? null} accent={g.accent.split(' ')[0]} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};
