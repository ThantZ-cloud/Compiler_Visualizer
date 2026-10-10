import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Braces,
  ChevronDown,
  Cpu,
  FileCode,
  Network,
  PenLine,
  Play,
  ScanText,
  Share2,
  Cog,
} from 'lucide-react';
import { SlideHead } from './SlideHead';

const NODE_ICONS = [PenLine, ScanText, Braces, Network, Share2, Cog, Cpu, FileCode, Play];

const NODE_ACCENT = [
  'border-text-dim text-text',
  'border-cyan text-cyan',
  'border-cyan text-cyan',
  'border-cyan text-cyan',
  'border-cyan text-cyan',
  'border-amber text-amber',
  'border-magenta text-magenta',
  'border-magenta text-magenta',
  'border-neon text-neon',
];

export const StateSlide = () => {
  const { t } = useTranslation();
  const nodes = t('slides.state.nodes', { returnObjects: true }) as string[];
  const phases = t('slides.state.phases', { returnObjects: true }) as string[];
  return (
    <div className="flex h-full flex-col p-5 sm:p-8">
      <SlideHead kicker={t('slides.state.kicker')} title={t('slides.state.title')} />
      <div className="mb-2 flex items-center gap-2">
        {phases.map((p, i) => (
          <span
            key={p}
            className={`border px-2 py-0.5 font-mono text-xs tracking-widest ${
              i === 0
                ? 'border-cyan/50 text-cyan'
                : i === 1
                  ? 'border-amber/50 text-amber'
                  : 'border-magenta/50 text-magenta'
            }`}
          >
            {p}
          </span>
        ))}
      </div>
      <div className="relative flex flex-1 flex-col items-center justify-center">
        <span className="pointer-events-none absolute inset-y-1 w-0.5 bg-border" aria-hidden="true" />
        {nodes.map((n, i) => {
          const Icon = NODE_ICONS[i % NODE_ICONS.length];
          const iconColor = NODE_ACCENT[i].split(' ')[1];
          return (
            <Fragment key={n}>
              {i > 0 && <ChevronDown size={14} className="z-10 shrink-0 bg-card text-text-muted" />}
              <span
                className={`z-10 flex w-64 items-center gap-2 border bg-surface px-3 py-1.5 font-mono text-sm ${NODE_ACCENT[i]}`}
              >
                <Icon size={16} className={`shrink-0 ${iconColor}`} />
                {n}
              </span>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
};
