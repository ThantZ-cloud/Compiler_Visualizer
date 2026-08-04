import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Sparkles,
  ArrowRight,
  Play,
  ScanText,
  Network,
  SearchCheck,
  GitFork,
  Cpu,
  MousePointerClick,
  Route,
  Lightbulb,
} from 'lucide-react';

const STAGES = [
  { icon: ScanText, labelKey: 'landing.stepLexer' },
  { icon: Network, labelKey: 'landing.stepParser' },
  { icon: SearchCheck, labelKey: 'landing.stepSemantic' },
  { icon: Cpu, labelKey: 'landing.stepCodegen' },
];

const FEATURES = [
  {
    icon: MousePointerClick,
    title: 'Step through every phase',
    body: 'Play, pause, and step through tokenization, parsing, analysis, and code generation at your own pace.',
    tint: 'var(--color-neon)',
  },
  {
    icon: Route,
    title: 'Interactive visual trees',
    body: 'Explore the abstract syntax tree as soft, connected cards you can zoom and pan around.',
    tint: 'var(--color-cyan)',
  },
  {
    icon: Lightbulb,
    title: 'Built for learning',
    body: 'Friendly explanations describe exactly what the compiler is doing at each step.',
    tint: 'var(--color-magenta)',
  },
];

const LandingPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="dot-grid flex h-full flex-col overflow-y-auto">
      {/* ── Hero ── */}
      <section className="relative flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        {/* Badge */}
        <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-1.5 shadow-[var(--shadow-card)]">
          <Sparkles size={14} className="text-[var(--color-neon)]" />
          <span className="text-[12.5px] font-medium text-[var(--color-text-dim)]">
            {t('landing.heroBadge')}
          </span>
        </div>

        {/* Headline */}
        <h1 className="max-w-3xl text-5xl font-extrabold leading-[1.05] tracking-tight text-[var(--color-text)] md:text-6xl">
          {t('landing.heroTitleA')}{' '}
          <span className="bg-gradient-to-r from-[#3B82F6] to-[#10B981] bg-clip-text text-transparent">
            {t('landing.heroTitleB')}
          </span>
        </h1>

        {/* Description */}
        <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-[var(--color-text-dim)] md:text-base">
          {t('landing.description')}
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => navigate('/compiler')}
            className="flex items-center gap-2 rounded-full bg-[var(--color-cyan)] px-7 py-3.5 text-[14.5px]
              font-semibold text-white shadow-[var(--shadow-soft)] transition-all hover:bg-[#059669]"
          >
            <Play size={16} />
            {t('landing.openCompiler')}
          </button>
          <button
            type="button"
            onClick={() => navigate('/pipeline', { state: { from: '/' } })}
            className="flex items-center gap-2 rounded-full border border-[var(--color-neon)] bg-[var(--color-card)]
              px-7 py-3.5 text-[14.5px] font-semibold text-[var(--color-neon)] transition-colors
              hover:bg-[var(--color-neon)] hover:text-white"
          >
            {t('landing.viewPipeline')}
            <ArrowRight size={16} />
          </button>
        </div>

        {/* Animated pipeline preview */}
        <div className="mt-16 flex items-center justify-center gap-2">
          {STAGES.map((stage, i) => {
            const Icon = stage.icon;
            return (
              <React.Fragment key={stage.labelKey}>
                <div
                  className="card-soft flex animate-pulse items-center gap-2 px-4 py-2.5"
                  style={{ animationDelay: `${i * 0.5}s`, animationDuration: '3s' }}
                >
                  <span className="text-[var(--color-neon)]">
                    <Icon size={16} />
                  </span>
                  <span className="text-[13px] font-medium text-[var(--color-text)]">
                    {t(stage.labelKey)}
                  </span>
                </div>
                {i < STAGES.length - 1 && (
                  <ArrowRight size={15} className="shrink-0 text-[var(--color-border-bright)]" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </section>

      {/* ── Feature cards ── */}
      <section className="mx-auto w-full max-w-5xl px-6 pb-16">
        <div className="grid gap-5 md:grid-cols-3">
          {FEATURES.map(feature => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="card-soft p-6 text-left">
                <span
                  className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-[12px]"
                  style={{ background: `color-mix(in srgb, ${feature.tint} 12%, transparent)`, color: feature.tint }}
                >
                  <Icon size={20} />
                </span>
                <h3 className="mb-1.5 text-[15px] font-semibold text-[var(--color-text)]">
                  {feature.title}
                </h3>
                <p className="text-[13.5px] leading-relaxed text-[var(--color-text-dim)]">
                  {feature.body}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-card)] py-5 text-center">
        <p className="text-[12px] text-[var(--color-text-muted)]">
          {t('footer.copyright')}
        </p>
      </footer>
    </div>
  );
};

export default LandingPage;
