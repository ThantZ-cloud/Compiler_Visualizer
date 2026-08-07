import React, { Suspense, lazy, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { getPipelineSteps } from '../data/pipelineData';
import PipelineStep from '../components/PipelineStep';
import ErrorBoundary from '../components/ErrorBoundary';
import { useScrollSpy } from '../hooks/useScrollSpy';

const PipelineScene = lazy(() => import('../components/PipelineScene'));

const PipelinePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const backTarget = location.state?.from === '/compiler' ? '/compiler' : '/';
  const pipelineSteps = useMemo(() => getPipelineSteps(t), [t]);
  const stepRefs = useRef<(HTMLElement | null)[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { activeIndex, scrollProgress, scrollTo } = useScrollSpy(scrollRef, stepRefs);
  const activeStep = activeIndex;

  const setStepRef = (el: HTMLElement | null, index: number) => {
    stepRefs.current[index] = el;
  };

  const scrollToStep = (index: number) => scrollTo(index);

  return (
    <div className="relative flex flex-col h-full bg-[var(--color-void)] overflow-hidden">
      {/* 3D cyberpunk tunnel — full page background */}
      <div className="absolute inset-0 z-0">
        <ErrorBoundary name="Pipeline 3D Scene" inline>
          <Suspense fallback={null}>
            <PipelineScene scrollProgress={scrollProgress} />
          </Suspense>
        </ErrorBoundary>
      </div>

      {/* Header bar */}
      <div className="relative z-20 flex items-center gap-4 px-6 py-3 border-b border-[var(--color-border)] bg-[var(--color-card)]/80 backdrop-blur-sm shrink-0">
        <button
          className="text-[var(--color-text-dim)] hover:text-[var(--color-neon)] transition-colors text-xs tracking-[0.1em]"
          style={{ fontFamily: 'var(--font-mono)' }}
          onClick={() => navigate(backTarget)}
        >
          {t('pipeline.back', '<- BACK')}
        </button>
        <span
          className="text-[10px] font-bold text-[var(--color-neon)] tracking-[0.3em] uppercase"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {'< '} PIPELINE {' />'}
        </span>
        <div className="ml-auto text-[10px] font-mono text-[var(--color-text-muted)] tracking-widest">
          {String(activeStep + 1).padStart(2, '0')}/{String(pipelineSteps.length).padStart(2, '0')} ·{' '}
          {Math.round(scrollProgress * 100)}%
        </div>
      </div>

      {/* Scrollable content overlaid on the tunnel */}
      <div
        ref={scrollRef}
        className="relative z-10 flex-1 min-h-0 overflow-y-auto"
        style={{ scrollbarWidth: 'none' }}
      >
        {/* ═══════ HERO ═══════ */}
        <section className="relative min-h-[85vh] flex flex-col items-center justify-center overflow-hidden">
          {/* Radial gradient overlay for text readability */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_45%,rgba(5,5,16,0.55),transparent_70%)] pointer-events-none" />

          <motion.div
            className="relative z-10 text-center px-6"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <div
              className="text-[10px] font-bold tracking-[0.4em] uppercase mb-4 text-[var(--color-neon)]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {t('pipeline.title')}
            </div>
            <h1
              className="text-4xl md:text-6xl lg:text-7xl font-black tracking-wider text-[var(--color-text)] mb-4"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {t('pipeline.subtitleLine1', 'HOW JAVA COMPILES')}
            </h1>
            <h2
              className="text-4xl md:text-6xl lg:text-7xl font-black tracking-wider neon-text mb-8"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {t('pipeline.subtitleLine2', 'YOUR CODE')}
            </h2>
            <p
              className="text-sm text-[var(--color-text-dim)] max-w-xl mx-auto mb-12 leading-relaxed"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {t('pipeline.description')}
            </p>

            {/* Step indicators */}
            <div className="flex items-center justify-center gap-3 flex-wrap mb-10">
              {pipelineSteps.map((step, i) => (
                <button
                  key={step.id}
                  className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold tracking-wider border transition-all"
                  style={{
                    fontFamily: 'var(--font-display)',
                    color: activeStep === i ? step.color : 'var(--color-text-muted)',
                    borderColor: activeStep === i ? step.color : 'transparent',
                    background: activeStep === i ? `${step.color}11` : 'transparent',
                  }}
                  onClick={() => scrollToStep(i)}
                >
                  <span>{step.phase}.</span>
                  <span className="hidden sm:inline">{step.title}</span>
                </button>
              ))}
            </div>

            {/* Scroll down indicator */}
            <motion.div
              className="text-[var(--color-text-muted)]"
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <ChevronDown size={20} />
            </motion.div>
          </motion.div>
        </section>

        {/* ═══════ PIPELINE STEPS ═══════ */}
        <div className="relative">
          {/* Vertical connecting line */}
          <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-[var(--color-neon)]/20 via-[var(--color-border)] to-transparent pointer-events-none" />

          {pipelineSteps.map((step, i) => (
            <div key={step.id} ref={(el) => setStepRef(el, i)}>
              <PipelineStep step={step} isLast={i === pipelineSteps.length - 1} />
            </div>
          ))}
        </div>

        {/* ═══════ SUMMARY FOOTER ═══════ */}
        <section className="relative py-20 px-6 text-center">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_50%,rgba(5,5,16,0.6),transparent_75%)] pointer-events-none" />
          <motion.div
            className="relative z-10 max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: false, amount: 0.3 }}
            transition={{ duration: 0.6 }}
          >
            <div
              className="text-[10px] font-bold tracking-[0.4em] uppercase mb-4 text-[var(--color-neon)]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {t('pipeline.summaryLabel', '// FROM TEXT TO EXECUTION')}
            </div>
            <h2
              className="text-3xl md:text-5xl font-black tracking-wider text-[var(--color-text)] mb-6"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {t('pipeline.completeHeadline')}
            </h2>
            <p
              className="text-sm text-[var(--color-text-dim)] leading-relaxed mb-10 font-mono"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {t('pipeline.completeDescription')}
            </p>
            <button
              className="btn-neon px-8 py-3 text-xs tracking-[0.15em]"
              style={{ fontFamily: 'var(--font-display)' }}
              onClick={() => navigate('/compiler')}
            >
              <span>[ {t('pipeline.tryIt', 'TRY IT YOURSELF')} ]</span>
            </button>
          </motion.div>
        </section>
      </div>
    </div>
  );
};

export default PipelinePage;
