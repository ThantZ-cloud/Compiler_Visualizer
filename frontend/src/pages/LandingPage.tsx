import React, { useEffect, useState, useRef, useMemo, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence, useReducedMotion, type Variants } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import Footer from '../components/Footer';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { useScrollMemory } from '../hooks/useScrollMemory';
import { Code, Layers, GitBranch, Search, Cpu, Save, Braces, Wand2 } from 'lucide-react';

// ── Typewriter hook ──
function useTypewriter(texts: string[], speed = 80, deleteSpeed = 40, pause = 2000) {
  const [display, setDisplay] = useState('');
  const [textIdx, setTextIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const current = texts[textIdx];
    let timer: ReturnType<typeof setTimeout>;

    if (!isDeleting && charIdx < current.length) {
      timer = setTimeout(() => setCharIdx(c => c + 1), speed);
    } else if (!isDeleting && charIdx === current.length) {
      timer = setTimeout(() => setIsDeleting(true), pause);
    } else if (isDeleting && charIdx > 0) {
      timer = setTimeout(() => setCharIdx(c => c - 1), deleteSpeed);
    } else if (isDeleting && charIdx === 0) {
      setIsDeleting(false);
      setTextIdx(t => (t + 1) % texts.length);
    }

    setDisplay(current.slice(0, charIdx));
    return () => clearTimeout(timer);
  }, [charIdx, isDeleting, textIdx, texts, speed, deleteSpeed, pause]);

  return display;
}

// Module-level flag: persists across React Router navigations (same JS session)
// but resets on hard reload (new page load = new JS execution)
let hasBootedInSession = false;

// ── Boot sequence text (shortened) ──
function BootSequence({ onComplete }: { onComplete: () => void }) {
  const [lines, setLines] = useState<string[]>([]);
  const bootLines = useRef([
    '[BOOT] Compiler Visualizer v2.0.0',
    '[OK]   JavaParser loaded',
    '[OK]   D3.js visualization engine ready',
    '[OK]   Monaco Compiler loaded',
    '[OK]   Phases 1-8: Source → Execution — online',
    '[READY] Welcome, human.',
  ]);

  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      if (i < bootLines.current.length) {
        const line = bootLines.current[i];
        i++;
        setLines(prev => [...prev, line]);
      } else {
        clearInterval(timer);
        setTimeout(onComplete, 400);
      }
    }, 70);
    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[200] bg-[var(--color-void)] flex items-center justify-center" role="log" aria-live="polite" aria-atomic="false">
      <div className="max-w-lg w-full px-8">
        {lines.map((line, i) => (
          <div
            key={i}
            className="text-xs leading-relaxed"
            style={{
              fontFamily: 'var(--font-mono)',
              color: line.includes('[READY]') ? 'var(--color-neon)' :
                     line.includes('[OK]') ? 'var(--color-text-dim)' :
                     'var(--color-text-muted)',
            }}
          >
            {line}
            {i === lines.length - 1 && <span className="cursor-blink" />}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Scroll reveal wrapper (respects prefers-reduced-motion) ──
function Reveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

// ── Animated terminal mockup (hero, "show don't tell") ──
type TokenKind = 'keyword' | 'identifier' | 'delimiter' | 'string' | 'method';

function TerminalMockup() {
  const { t } = useTranslation();
  const prefersReduced = useReducedMotion();
  const [phase, setPhase] = useState(0);

  const tokenColors: Record<TokenKind, string> = {
    keyword: 'var(--color-neon)',
    identifier: 'var(--color-cyan)',
    delimiter: 'var(--color-text-muted)',
    string: 'var(--color-amber)',
    method: 'var(--color-magenta)',
  };

  const phases = useMemo(() => {
    const tokens: { value: string; type: TokenKind }[] = [
      { value: 'public', type: 'keyword' },
      { value: 'class', type: 'keyword' },
      { value: 'Hello', type: 'identifier' },
      { value: '{', type: 'delimiter' },
      { value: 'System.out.println', type: 'method' },
      { value: '(', type: 'delimiter' },
      { value: '"Hello"', type: 'string' },
      { value: ')', type: 'delimiter' },
      { value: '}', type: 'delimiter' },
    ];
    return [
      { key: 'source', name: 'SOURCE', color: 'var(--color-neon)', kind: 'pre' as const, content: t('landing.preview.panels.editor.code'), tokens: [] as typeof tokens },
      { key: 'tokens', name: 'TOKENS', color: 'var(--color-cyan)', kind: 'tokens' as const, content: '', tokens },
      { key: 'ast', name: 'SYNTAX', color: 'var(--color-magenta)', kind: 'pre' as const, content: t('landing.preview.panels.ast.content'), tokens: [] as typeof tokens },
      { key: 'semantic', name: 'SEMANTIC', color: 'var(--color-cyan)', kind: 'pre' as const, content: t('landing.preview.panels.semantic.content'), tokens: [] as typeof tokens },
      { key: 'ir', name: 'IR', color: 'var(--color-amber)', kind: 'pre' as const, content: t('landing.preview.panels.ir.content'), tokens: [] as typeof tokens },
      { key: 'optimize', name: 'OPTIMIZER', color: 'var(--color-magenta)', kind: 'pre' as const, content: t('landing.preview.panels.optimize.content'), tokens: [] as typeof tokens },
      { key: 'bytecode', name: 'BYTECODE', color: 'var(--color-amber)', kind: 'pre' as const, content: t('landing.preview.panels.bytecode.content'), tokens: [] as typeof tokens },
      { key: 'execute', name: 'EXECUTE', color: 'var(--color-neon)', kind: 'pre' as const, content: t('landing.preview.panels.execute.content'), tokens: [] as typeof tokens },
    ];
  }, [t]);

  useEffect(() => {
    if (prefersReduced) return;
    const id = setInterval(() => setPhase(p => (p + 1) % phases.length), 2600);
    return () => clearInterval(id);
  }, [phases.length, prefersReduced]);

  const active = phases[phase];

  return (
    <motion.div
      className="relative w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.25 }}
      role="img"
      aria-label={`Compiler pipeline terminal: ${phases.map(p => p.name).join(', ')}`}
    >
      <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-72 h-40 rounded-full blur-3xl bg-[var(--color-neon-dim)] pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--color-neon)]/50 to-transparent" />

      {/* Window chrome */}
      <div className="relative flex items-center gap-2 px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-void-light)]">
        <span className="w-3 h-3 rounded-full bg-[var(--color-rose)]" />
        <span className="w-3 h-3 rounded-full bg-[var(--color-amber)]" />
        <span className="w-3 h-3 rounded-full bg-[var(--color-neon)]" />
        <span className="ml-3 font-mono text-xs text-[var(--color-text-muted)]">
          {t('landing.hero.terminalTitle')}
        </span>
        <span className="ml-auto font-mono text-[10px] font-bold tracking-[0.2em] text-[var(--color-neon)]">
          {t('landing.hero.phaseLabel')} {phase + 1}/{phases.length}
        </span>
      </div>

      {/* Body */}
      <div className="relative p-5 min-h-[260px] flex flex-col justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={active.key}
            initial={prefersReduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReduced ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <div className="font-mono text-[10px] font-bold tracking-[0.3em] mb-4" style={{ color: active.color }}>
              {active.name}
            </div>
            {active.kind === 'tokens' ? (
              <div className="flex flex-wrap gap-1.5">
                {active.tokens.map((tk, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 rounded border border-[var(--color-border)] font-mono text-[11px]"
                    style={{ color: tokenColors[tk.type] }}
                  >
                    {tk.value}
                  </span>
                ))}
              </div>
            ) : (
              <pre className="font-mono text-xs leading-relaxed text-[var(--color-text)] whitespace-pre-wrap">
                {active.content}
              </pre>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Phase selector dots */}
      <div className="relative flex items-center justify-center gap-2 pb-3">
        {phases.map((p, i) => (
          <button
            key={p.key}
            className="w-11 h-11 flex items-center justify-center cursor-pointer"
            onClick={() => setPhase(i)}
            aria-label={`Show ${p.name}`}
            aria-pressed={i === phase}
          >
            <span
              className="w-2 h-2 rounded-full transition-all duration-300"
              style={{ background: i === phase ? p.color : 'var(--color-surface-3)' }}
            />
          </button>
        ))}
      </div>
    </motion.div>
  );
}

// ── Section eyebrow ──
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[var(--color-neon)] text-xs font-bold tracking-[0.25em] mb-4 font-mono uppercase">
      {children}
    </div>
  );
}

const heroVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const LandingPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const prefersReduced = usePrefersReducedMotion();
  const [booted, setBooted] = useState(false);
  const [showContent, setShowContent] = useState(false);

  const typewriterTexts = useMemo(() => [
    'javac Main.java',
    'java -cp . Main',
    'class Lexer { scan() }',
    'public static void main',
    'System.out.println("0101")',
    'tokenize → parse → compile',
  ], []);

  const typed = useTypewriter(typewriterTexts, 70, 35, 1800);

  // Boot sequence — show on fresh page load (first visit / hard reload), skip on React Router nav
  useEffect(() => {
    if (prefersReduced || hasBootedInSession) {
      setBooted(true);
      setShowContent(true);
      return;
    }
    const timeout = setTimeout(() => {
      setBooted(true);
      setShowContent(true);
    }, 2400);
    return () => {
      clearTimeout(timeout);
      hasBootedInSession = true;
    };
  }, [prefersReduced]);

  const handleBootComplete = () => {
    setBooted(true);
    setTimeout(() => setShowContent(true), 100);
  };

  // Remember scroll position across navigations (e.g. coming back from /about)
  useScrollMemory();

  // Bento feature layout — varied card spans on md (2 cols) and lg (4 cols)
  const features = useMemo(() => [
    { id: 0, icon: Code, span: 'md:col-span-2 lg:col-span-2', accent: 'var(--color-neon)', tint: 'var(--color-neon-dim)' },
    { id: 1, icon: Layers, span: '', accent: 'var(--color-cyan)', tint: 'var(--color-cyan-dim)' },
    { id: 2, icon: GitBranch, span: '', accent: 'var(--color-magenta)', tint: 'var(--color-magenta-dim)' },
    { id: 3, icon: Search, span: '', accent: 'var(--color-amber)', tint: 'var(--color-amber-dim)' },
    { id: 4, icon: Cpu, span: '', accent: 'var(--color-rose)', tint: 'var(--color-rose-dim)' },
    { id: 5, icon: Save, span: 'md:col-span-2 lg:col-span-2', accent: 'var(--color-cyan)', tint: 'var(--color-cyan-dim)' },
  ], []);

  // How-it-works steps
  const steps = useMemo(() => [
    { id: 0, icon: Braces, accent: 'var(--color-neon)' },
    { id: 1, icon: Wand2, accent: 'var(--color-cyan)' },
    { id: 2, icon: Cpu, accent: 'var(--color-magenta)' },
  ], []);

  // Pipeline phase accent colors
  const phaseAccents = useMemo(() => [
    'var(--color-neon)',
    'var(--color-cyan)',
    'var(--color-magenta)',
    'var(--color-amber)',
    'var(--color-rose)',
    'var(--color-cyan)',
    'var(--color-neon)',
    'var(--color-amber)',
  ], []);

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-void)]">
      {!booted && <BootSequence onComplete={handleBootComplete} />}

      <div
        className={`relative flex-1 flex flex-col transition-opacity duration-700 ${showContent ? 'opacity-100' : 'opacity-0'}`}
      >
        {/* ═══ HERO — split: copy left, terminal mockup right ═══ */}
        <section className="relative flex items-center min-h-[calc(100dvh-3.5rem)] overflow-hidden">
          <div className="absolute inset-0 hero-dot-grid pointer-events-none" />

          <div className="fixed top-3 left-3 w-8 h-8 md:top-6 md:left-6 md:w-16 md:h-16 border-t-2 border-l-2 border-[var(--color-neon)] neon-corner opacity-40 z-30 pointer-events-none" />
          <div className="fixed top-3 right-3 w-8 h-8 md:top-6 md:right-6 md:w-16 md:h-16 border-t-2 border-r-2 border-[var(--color-neon)] neon-corner opacity-40 z-30 pointer-events-none" />
          <div className="fixed bottom-3 left-3 w-8 h-8 md:bottom-6 md:left-6 md:w-16 md:h-16 border-b-2 border-l-2 border-[var(--color-neon)] neon-corner opacity-40 z-30 pointer-events-none" />
          <div className="fixed bottom-3 right-3 w-8 h-8 md:bottom-6 md:right-6 md:w-16 md:h-16 border-b-2 border-r-2 border-[var(--color-neon)] neon-corner opacity-40 z-30 pointer-events-none" />

          <div className="relative z-20 w-full max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-20 grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-8 sm:gap-12 lg:gap-16 items-center">
            {/* Left — copy */}
            <motion.div variants={heroVariants} initial="hidden" animate="show">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 sm:mb-8 border border-[var(--color-neon)] bg-[var(--color-neon)]/5 rounded-full">
                <span className="w-1.5 h-1.5 bg-[var(--color-neon)] pulse-ring rounded-full" />
                <span className="text-[10px] font-bold text-[var(--color-neon)] tracking-[0.25em] uppercase font-display">
                  {t('landing.statusBadge')}
                </span>
              </div>

              <h1 className="font-display font-black tracking-wider text-[var(--color-text)]">
                <span className="block text-3xl xs:text-4xl sm:text-6xl lg:text-7xl leading-none">COMPILER</span>
                <span className="block text-3xl xs:text-4xl sm:text-6xl lg:text-7xl leading-none neon-text mt-2">VISUALIZER</span>
              </h1>

              <div className="mt-6 sm:mt-8 mb-6 sm:mb-8 inline-flex items-center bg-[var(--color-card)] border border-[var(--color-border)] px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg max-w-full overflow-hidden">
                <span className="text-[var(--color-neon)] font-bold font-mono shrink-0">$ </span>
                <span className="text-[var(--color-text)] text-xs sm:text-sm font-mono truncate">{typed}</span>
                <span className="cursor-blink shrink-0" />
              </div>

              <p className="text-[var(--color-text-dim)] text-sm sm:text-base md:text-lg max-w-md leading-relaxed font-sans mb-8 sm:mb-10">
                {t('landing.description')}
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-3 sm:gap-4">
                <button
                  className="btn-primary px-6 sm:px-10 py-3.5 sm:py-4 text-sm min-h-[48px] w-full sm:w-auto"
                  onClick={() => navigate('/compiler')}
                >
                  {isAuthenticated ? t('landing.openCompiler') : t('landing.begin')}
                </button>
                <button
                  className="btn-neon px-6 sm:px-10 py-3.5 sm:py-4 text-sm min-h-[48px] w-full sm:w-auto"
                  onClick={() => navigate('/pipeline', { state: { from: '/' } })}
                >
                  <span>{t('landing.viewPipeline')}</span>
                </button>
                <button
                  className="btn-neon px-6 sm:px-10 py-3.5 sm:py-4 text-sm min-h-[48px] w-full sm:w-auto"
                  onClick={() => navigate('/visualize/lexical')}
                >
                  <span>{t('landing.exploreVisualizer')}</span>
                </button>
              </div>

              <h3 className="text-sm font-bold tracking-[0.18em] uppercase mt-10 mb-4" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
                {t('landing.why.bestFor')}
              </h3>
              <div className="flex flex-wrap gap-3">
                <div className="inline-flex items-center gap-2 px-4 py-2 border border-[var(--color-border)] bg-[var(--color-void)] hover:border-[var(--color-neon)] transition-colors rounded-lg">
                  <span className="w-1.5 h-1.5 bg-[var(--color-neon)]" />
                  <span className="text-xs font-mono text-[var(--color-text-dim)]">{t('landing.why.forItems.students')}</span>
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-2 border border-[var(--color-border)] bg-[var(--color-void)] hover:border-[var(--color-cyan)] transition-colors rounded-lg">
                  <span className="w-1.5 h-1.5 bg-[var(--color-cyan)]" />
                  <span className="text-xs font-mono text-[var(--color-text-dim)]">{t('landing.why.forItems.educators')}</span>
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-2 border border-[var(--color-border)] bg-[var(--color-void)] hover:border-[var(--color-magenta)] transition-colors rounded-lg">
                  <span className="w-1.5 h-1.5 bg-[var(--color-magenta)]" />
                  <span className="text-xs font-mono text-[var(--color-text-dim)]">{t('landing.why.forItems.developers')}</span>
                </div>
              </div>
            </motion.div>

            {/* Right — terminal mockup */}
            <TerminalMockup />
          </div>
        </section>

        {/* ═══ VALUE STATEMENT — left-aligned band ═══ */}
        <section className="relative bg-[var(--color-card)] border-y border-[var(--color-border)]">
          <div className="absolute inset-0 band-grid opacity-60 pointer-events-none" />
          <div className="relative max-w-6xl mx-auto px-6 py-24">
            <Reveal>
              <div className="lg:grid lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-7">
                  <SectionLabel>{t('landing.why.label')}</SectionLabel>
                  <h2 className="text-3xl md:text-5xl font-black font-display text-[var(--color-text)] leading-tight">
                    {t('landing.why.headline')}
                    <span className="block neon-text mt-1">{t('landing.why.headlineAccent')}</span>
                  </h2>
                </div>
                <div className="lg:col-span-5 lg:mt-2">
                  <p className="text-base text-[var(--color-text-dim)] leading-relaxed font-sans mb-6">
                    {t('landing.why.body')}
                  </p>
                  <div className="border-l-2 border-[var(--color-neon)] pl-4">
                    <p className="text-xs text-[var(--color-text-dim)] leading-relaxed font-mono">
                      {t('landing.why.compilerVsInterpreter')}
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ═══ BENTO FEATURE GRID — asymmetric, per-card accent ═══ */}
        <section className="relative py-16 sm:py-24">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <Reveal>
              <SectionLabel>{t('landing.capabilities.label')}</SectionLabel>
              <h2 className="text-2xl sm:text-3xl md:text-5xl font-black font-display text-[var(--color-text)]">
                {t('landing.capabilities.headline')}
              </h2>
            </Reveal>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mt-10 sm:mt-12">
              {features.map((f, i) => {
                const Icon = f.icon;
                return (
                  <motion.div
                    key={f.id}
                    className={`card-lift group relative p-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden ${f.span}`}
                    style={{ '--accent': f.accent, '--accent-tint': f.tint } as React.CSSProperties}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ duration: 0.4, delay: (i % 4) * 0.07 }}
                  >
                    <div className="absolute inset-x-0 top-0 h-0.5" style={{ background: f.accent, opacity: 0.7 }} />
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                      style={{ background: `radial-gradient(120% 100% at 50% 0%, ${f.tint}, transparent 70%)` }}
                    />
                    <div className="relative flex items-start justify-between mb-4">
                      <span className="font-mono text-xs font-bold" style={{ color: f.accent, opacity: 0.7 }}>
                        {t(`landing.capabilities.features.${f.id}.id`)}
                      </span>
                      <Icon className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" style={{ color: f.accent }} />
                    </div>
                    <h3 className="text-base font-bold font-display tracking-wide text-[var(--color-text)] mb-2">
                      {t(`landing.capabilities.features.${f.id}.title`)}
                    </h3>
                    <p className="text-sm text-[var(--color-text-dim)] leading-relaxed font-sans">
                      {t(`landing.capabilities.features.${f.id}.description`)}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ═══ HOW IT WORKS — horizontal stepper ═══ */}
        <section className="relative py-24 bg-[var(--color-card)] border-y border-[var(--color-border)]">
          <div className="max-w-4xl mx-auto px-6">
            <Reveal className="text-center">
              <SectionLabel>{t('landing.protocol.label')}</SectionLabel>
              <h2 className="text-3xl md:text-5xl font-black font-display text-[var(--color-text)]">
                {t('landing.protocol.headline')}
              </h2>
            </Reveal>

            <div className="relative mt-16">
              <div className="hidden md:block absolute top-7 left-[16%] right-[16%] h-px bg-[var(--color-border)]" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
                {steps.map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <Reveal key={s.id} delay={i * 0.1} className="relative flex flex-col items-center text-center">
                      <div
                        className="relative z-10 w-14 h-14 rounded-xl border border-[var(--color-border)] bg-[var(--color-void)] flex items-center justify-center shadow-[0_8px_24px_rgba(0,0,0,0.3)]"
                        style={{ boxShadow: `0 0 24px ${s.accent}33` }}
                      >
                        <Icon className="w-6 h-6" style={{ color: s.accent }} />
                      </div>
                      <div className="font-mono text-[10px] font-bold tracking-[0.3em] mt-6" style={{ color: s.accent }}>
                        0{i + 1}
                      </div>
                      <h3 className="font-display text-sm font-bold tracking-wider text-[var(--color-text)] uppercase mt-2">
                        {t(`landing.protocol.steps.${s.id}.title`)}
                      </h3>
                      <p className="text-sm text-[var(--color-text-dim)] leading-relaxed font-sans mt-2 max-w-[280px]">
                        {t(`landing.protocol.steps.${s.id}.description`)}
                      </p>
                    </Reveal>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ═══ PIPELINE PHASES BAND — full-bleed glow ═══ */}
        <section className="relative py-24">
          <div className="max-w-6xl mx-auto px-6">
            <div className="relative rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden p-10 md:p-14 text-center">
              <div className="absolute inset-0 band-grid opacity-50 pointer-events-none" />
              <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-3xl bg-[var(--color-neon-dim)] pointer-events-none" />

              <Reveal className="relative">
                <SectionLabel>{t('landing.pipelineTeaser.label')}</SectionLabel>
                <h2 className="text-3xl md:text-5xl font-black font-display text-[var(--color-text)] mb-10">
                  {t('landing.pipelineTeaser.headline')}
                </h2>

                <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
                  {['0', '1', '2', '3', '4', '5', '6', '7'].map((idx, i) => (
                    <Fragment key={idx}>
                      <div
                        className="px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-void)] font-mono text-xs font-bold tracking-wider transition-colors hover:border-[var(--color-neon)]"
                        style={{ color: phaseAccents[i] }}
                      >
                        {t(`landing.pipelineTeaser.phases.${idx}`)}
                      </div>
                      {i < 7 && <span className="text-[var(--color-neon)] opacity-40 font-mono">→</span>}
                    </Fragment>
                  ))}
                </div>

                <p className="text-sm text-[var(--color-text-dim)] leading-relaxed font-sans max-w-xl mx-auto mt-8 mb-10">
                  {t('landing.pipelineTeaser.description')}
                </p>

                <button
                  className="btn-primary px-10 py-4 text-sm min-h-[48px]"
                  onClick={() => navigate('/pipeline')}
                >
                  {t('landing.pipelineTeaser.cta')}
                </button>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ═══ FINAL CTA — gradient band ═══ */}
        <section className="relative py-28 md:py-36 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(80% 80% at 50% 130%, var(--color-neon-glow), transparent 60%)' }}
          />
          <div className="relative max-w-4xl mx-auto px-6 text-center">
            <Reveal>
              <SectionLabel>{t('landing.finalCta.label')}</SectionLabel>
              <h2 className="text-4xl md:text-6xl font-black font-display text-[var(--color-text)] mb-5 leading-tight">
                {t('landing.finalCta.headline')}
              </h2>
              <p className="text-sm md:text-base font-mono text-[var(--color-text-dim)] mb-10">
                {t('landing.finalCta.subline')}
              </p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-5">
                <button
                  className="btn-primary px-10 py-4 text-sm min-h-[48px] w-full sm:w-auto"
                  onClick={() => navigate('/compiler')}
                >
                  {isAuthenticated ? t('landing.openCompiler') : t('landing.finalCta.primaryCta')}
                </button>
                <button
                  className="btn-neon px-10 py-4 text-sm min-h-[48px] w-full sm:w-auto"
                  onClick={() => navigate('/pipeline')}
                >
                  <span>{t('landing.finalCta.secondaryCta')}</span>
                </button>
              </div>
            </Reveal>
          </div>
        </section>

        <Footer />
      </div>
    </div>
  );
};

export default LandingPage;
