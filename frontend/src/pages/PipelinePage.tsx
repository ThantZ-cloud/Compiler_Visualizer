import React, { useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getPipelineSteps } from '../data/pipelineData';
import DocStep from '../components/pipeline/DocStep';
import PipelineToc from '../components/pipeline/PipelineToc';
import { useScrollSpy } from '../hooks/useScrollSpy';
import { useScrollMemory } from '../hooks/useScrollMemory';

const PipelinePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const pipelineSteps = useMemo(() => getPipelineSteps(t), [t]);
  const stepRefs = useRef<(HTMLElement | null)[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { activeIndex, scrollTo } = useScrollSpy(scrollRef, stepRefs);

  useScrollMemory(scrollRef);

  const setStepRef = (el: HTMLElement | null, index: number) => {
    stepRefs.current[index] = el;
  };

  // Group ids for section dividers
  const phaseGroups = [
    { id: 'front-end', label: t('pipeline.threePhases.frontEnd.title', 'FRONT END'), desc: t('pipeline.threePhases.frontEnd.description'), from: 0, to: 4 },
    { id: 'optimizer', label: t('pipeline.threePhases.optimizer.title', 'OPTIMIZER'), desc: t('pipeline.threePhases.optimizer.description'), from: 5, to: 5 },
    { id: 'back-end', label: t('pipeline.threePhases.backEnd.title', 'BACK END'), desc: t('pipeline.threePhases.backEnd.description'), from: 6, to: 7 },
  ];

  return (
    <div className="flex flex-col h-full bg-[var(--color-void)] overflow-hidden">
      {/* Scroll container */}
      <div
        ref={scrollRef}
        data-scroll-root="true"
        className="flex-1 min-h-0 overflow-y-auto"
      >
        {/* Breadcrumb + Hero — doc style, not cyberpunk */}
        <div className="border-b border-[var(--color-border)] bg-[var(--color-card)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-[var(--color-text-muted)] mb-2" style={{ fontFamily: 'var(--font-mono)' }}>
              {t('pipeline.title')} — <span className="text-[var(--color-neon)]">{t('pipeline.subtitle', 'HOW JAVA COMPILES YOUR CODE')}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-[var(--color-text)]" style={{ fontFamily: 'var(--font-display)' }}>
              {t('pipeline.subtitleLine1', 'HOW JAVA COMPILES')} <span className="text-[var(--color-neon)]">{t('pipeline.subtitleLine2', 'YOUR CODE')}</span>
            </h1>
            <p className="mt-3 text-sm md:text-[15px] leading-relaxed text-[var(--color-text-dim)] max-w-3xl" style={{ fontFamily: 'var(--font-sans)' }}>
              {t('pipeline.description')}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={() => navigate('/compiler')}
                className="px-5 py-2.5 text-xs font-bold tracking-[0.08em] bg-[var(--color-neon)] text-[var(--color-void)] border border-[var(--color-neon)] hover:brightness-110 transition-all"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {t('pipeline.tryIt', 'TRY IT YOURSELF')}
              </button>
              <button
                onClick={() => navigate('/visualize/lexical')}
                className="px-5 py-2.5 text-xs font-bold tracking-[0.08em] bg-transparent text-[var(--color-text)] border border-[var(--color-border)] hover:border-[var(--color-neon)] hover:text-[var(--color-neon)] transition-colors"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Open Visualizer
              </button>
            </div>


          </div>
        </div>

        {/* Main doc grid: Toc + Article */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            {/* TOC */}
            <aside className="w-full lg:w-64 shrink-0">
              <PipelineToc steps={pipelineSteps} activeIndex={activeIndex} onSelect={scrollTo} />
            </aside>

            {/* Article */}
            <div className="flex-1 min-w-0">
              {/* How to read this page — learnability aid */}
              <div className="mb-8 p-4 border border-[var(--color-border)] bg-[var(--color-surface)]">
                <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-[var(--color-text-muted)] mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                  HOW TO LEARN FROM THIS PAGE
                </div>
                <p className="text-xs leading-relaxed text-[var(--color-text-dim)]" style={{ fontFamily: 'var(--font-sans)' }}>
                  Each phase shows <span className="text-[var(--color-text)] font-semibold">Input → What happens → Output</span> with a tiny Java example.
                  Think of it like the i18n pipeline you already know: <span className="text-[var(--color-neon)]">Frontend</span> understands code (like parsing JSX), <span className="text-[var(--color-cyan)]">Optimizer</span> rewrites it faster, <span className="text-[var(--color-magenta)]">Back End</span> emits what the machine runs.
                  Use the left index to jump; click <span className="font-mono text-[var(--color-text)]">Copy</span> to try the code in the Compiler.
                </p>
              </div>

              {phaseGroups.map(g => (
                <div key={g.id} className="mb-2">
                  <div id={`group-${g.id}`} className="scroll-mt-24 flex items-center gap-3 py-3 mt-4">
                    <div className="h-px flex-1 bg-[var(--color-border)]" />
                    <span className="text-[10px] font-bold tracking-[0.25em] uppercase px-3 py-1 border bg-[var(--color-card)] text-[var(--color-neon)] border-[var(--color-border)]" style={{ fontFamily: 'var(--font-display)' }}>
                      {g.label}
                    </span>
                    <div className="h-px flex-1 bg-[var(--color-border)]" />
                  </div>
                  <p className="text-xs text-center text-[var(--color-text-muted)] max-w-2xl mx-auto mb-2" style={{ fontFamily: 'var(--font-sans)' }}>
                    {g.desc}
                  </p>
                  {pipelineSteps.slice(g.from, g.to + 1).map((step, idxInGroup) => {
                    const globalIdx = g.from + idxInGroup;
                    return (
                      <div key={step.id} ref={el => setStepRef(el, globalIdx)}>
                        <DocStep step={step} isLast={globalIdx === pipelineSteps.length - 1} />
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* Summary / Why study */}
              <div className="mt-10 pt-8 border-t border-[var(--color-border)] space-y-6">
                <div>
                  <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-[var(--color-neon)] mb-2" style={{ fontFamily: 'var(--font-display)' }}>
                    {t('pipeline.summaryLabel', '// FROM TEXT TO EXECUTION')}
                  </div>
                  <h2 className="text-2xl md:text-3xl font-black tracking-tight text-[var(--color-text)]" style={{ fontFamily: 'var(--font-display)' }}>
                    {t('pipeline.completeHeadline')}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-dim)] max-w-2xl" style={{ fontFamily: 'var(--font-sans)' }}>
                    {t('pipeline.completeDescription')}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {( ['frontEnd', 'optimizer', 'backEnd'] as const).map(key => (
                    <div key={key} className="p-4 border border-[var(--color-border)] bg-[var(--color-card)]">
                      <div className="text-[10px] font-bold tracking-[0.2em] uppercase mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-neon)' }}>
                        {t(`pipeline.threePhases.${key}.title`)}
                      </div>
                      <p className="text-xs leading-relaxed text-[var(--color-text-dim)]" style={{ fontFamily: 'var(--font-sans)' }}>
                        {t(`pipeline.threePhases.${key}.description`)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="p-4 border border-[var(--color-border)] bg-[var(--color-surface)] border-l-2" style={{ borderLeftColor: 'var(--color-neon)' }}>
                  <div className="text-[10px] font-bold tracking-[0.2em] uppercase mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-neon)' }}>
                    {t('pipeline.whyStudy.title')}
                  </div>
                  <p className="text-xs leading-relaxed text-[var(--color-text-dim)]" style={{ fontFamily: 'var(--font-sans)' }}>
                    {t('pipeline.whyStudy.body')}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    onClick={() => navigate('/compiler')}
                    className="px-6 py-3 text-xs font-bold tracking-[0.1em] bg-[var(--color-neon)] text-[var(--color-void)] border border-[var(--color-neon)] hover:brightness-110 transition-all"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {t('pipeline.tryIt', 'TRY IT YOURSELF')}
                  </button>
                  <button
                    onClick={() => navigate('/visualize/lexical')}
                    className="px-6 py-3 text-xs font-bold tracking-[0.1em] bg-transparent text-[var(--color-text)] border border-[var(--color-border)] hover:border-[var(--color-neon)] hover:text-[var(--color-neon)] transition-colors"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    Open Visualizer
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PipelinePage;
