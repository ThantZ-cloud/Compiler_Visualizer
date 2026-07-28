import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import BinaryRain from '../components/BinaryRain';

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

// ── Floating binary strings ──
function FloatingBinary() {
  const [prefersReduced, setPrefersReduced] = useState(
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const bits = useRef(
    Array.from({ length: 18 }, (_, i) => ({
      id: i,
      text: Array.from({ length: 6 + Math.floor(Math.random() * 10) }, () => Math.random() > 0.5 ? '1' : '0').join(''),
      left: Math.random() * 100,
      delay: Math.random() * 20,
      duration: 15 + Math.random() * 25,
      size: 10 + Math.random() * 4,
    }))
  ).current;

  if (prefersReduced) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {bits.map(b => (
        <span
          key={b.id}
          className="absolute text-[var(--color-neon)] floating-binary-digit"
          style={{
            left: `${b.left}%`,
            fontSize: `${b.size}px`,
            fontFamily: 'var(--font-mono)',
            animation: `float-up ${b.duration}s linear ${b.delay}s infinite`,
            writingMode: 'vertical-rl',
          }}
        >
          {b.text}
        </span>
      ))}
    </div>
  );
}

// Module-level flag: persists across React Router navigations (same JS session)
// but resets on hard reload (new page load = new JS execution)
let hasBootedInSession = false;

// ── Boot sequence text ──
function BootSequence({ onComplete }: { onComplete: () => void }) {
  const [lines, setLines] = useState<string[]>([]);
  const bootLines = useRef([
    '[BOOT] Compilation Visualizer v2.0.0',
    '[SYS]  Initializing JVM interface...',
    '[OK]   JavaParser loaded',
    '[OK]   D3.js visualization engine ready',
    '[OK]   Monaco Compiler loaded',
    '[SYS]  Scanning compilation pipeline...',
    '[OK]   Phase 1: Lexer — online',
    '[OK]   Phase 2: Parser — online',
    '[OK]   Phase 3: AST Builder — online',
    '[OK]   Phase 4: Semantic Analyzer — online',
    '[OK]   Phase 5: Bytecode Generator — online',
    '[SYS]  All systems operational.',
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
    }, 90);
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

const LandingPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [booted, setBooted] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced || hasBootedInSession) {
      setBooted(true);
      setShowContent(true);
      return;
    }
    // Skip boot after 3s max
    const timeout = setTimeout(() => {
      setBooted(true);
      setShowContent(true);
    }, 3200);
    return () => {
      clearTimeout(timeout);
      hasBootedInSession = true;
    };
  }, []);

  const handleBootComplete = () => {
    setBooted(true);
    setTimeout(() => setShowContent(true), 100);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Boot sequence */}
      {!booted && <BootSequence onComplete={handleBootComplete} />}

      <div
        ref={scrollContainerRef}
        className={`relative flex-1 flex flex-col overflow-hidden bg-[var(--color-void)] transition-opacity duration-700 ${showContent ? 'opacity-100' : 'opacity-0'}`}
      >
        {/* Background — covers full page */}
        <BinaryRain />
        <FloatingBinary />

        {/* ═══════ HERO ═══════ */}
        <section className="relative flex-1 flex items-center justify-center overflow-hidden">

          {/* Neon corner brackets */}
          <div className="absolute top-6 left-6 md:top-8 md:left-8 w-12 h-12 md:w-16 md:h-16 border-t-2 border-l-2 border-[var(--color-neon)] neon-corner opacity-30 z-10" />
          <div className="absolute top-6 right-6 md:top-8 md:right-8 w-12 h-12 md:w-16 md:h-16 border-t-2 border-r-2 border-[var(--color-neon)] neon-corner opacity-30 z-10" />
          <div className="absolute bottom-6 left-6 md:bottom-8 md:left-8 w-12 h-12 md:w-16 md:h-16 border-b-2 border-l-2 border-[var(--color-neon)] neon-corner opacity-30 z-10" />
          <div className="absolute bottom-6 right-6 md:bottom-8 md:right-8 w-12 h-12 md:w-16 md:h-16 border-b-2 border-r-2 border-[var(--color-neon)] neon-corner opacity-30 z-10" />

          <div className="relative z-20 text-center px-6 max-w-5xl mx-auto">
            {/* Status badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 border border-[var(--color-neon)] bg-[var(--color-neon)]/5">
              <span className="w-1.5 h-1.5 bg-[var(--color-neon)] pulse-ring" />
              <span className="text-[10px] font-bold text-[var(--color-neon)] tracking-[0.25em] uppercase"
                style={{ fontFamily: 'var(--font-display)' }}>
                {t('landing.statusBadge')}
              </span>
            </div>

            {/* Main title — glitch effect */}
            <h1 className="mb-2"
              style={{ fontFamily: 'var(--font-display)' }}>
              <span className="block text-5xl md:text-7xl lg:text-8xl font-black tracking-wider text-[var(--color-text)] text-glitch">
                COMPILATION
              </span>
              <span className="block text-5xl md:text-7xl lg:text-8xl font-black tracking-wider neon-text mt-1">
                VISUALIZER
              </span>
            </h1>

            {/* Terminal-style subtitle */}
            <div className="mt-8 mb-10 inline-block bg-[var(--color-card)] border border-[var(--color-border)] px-6 py-3">
              <span className="text-[var(--color-neon)] font-bold" style={{ fontFamily: 'var(--font-mono)' }}>$ </span>
              <span className="text-[var(--color-text)] text-sm" style={{ fontFamily: 'var(--font-mono)' }}>
                {typed}
              </span>
              <span className="cursor-blink" />
            </div>

            {/* Description */}
            <p className="text-[var(--color-text-dim)] text-sm md:text-base max-w-xl mx-auto mb-12 leading-relaxed"
              style={{ fontFamily: 'var(--font-mono)' }}>
              {t('landing.description')}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
              <button
                className="btn-neon px-8 py-4 text-sm tracking-[0.15em] glitch-hover min-h-[48px]"
                style={{ fontFamily: 'var(--font-display)' }}
                onClick={() => navigate('/pipeline', { state: { from: '/' } })}
              >
                <span>{t('landing.viewPipeline')}</span>
              </button>
              <button
                className="btn-neon px-10 py-4 text-sm tracking-[0.15em] glitch-hover min-h-[48px]"
                onClick={() => navigate('/compiler')}
              >
                <span>[ {isAuthenticated ? t('landing.openCompiler') : t('landing.begin')} ]</span>
              </button>
            </div>
          </div>
        </section>

        {/* ═══════ FOOTER ═══════ */}
        <div className="py-6 text-center shrink-0">
          <p className="text-[11px] text-[var(--color-neon)] tracking-[0.1em] flex items-center justify-center gap-4"
            style={{ fontFamily: 'var(--font-mono)' }}>
            <span>© 2026 Compilation Visualizer</span>
            <span className="text-[var(--color-border)]">•</span>
            <span>{t('landing.contactUs', 'Contact Us')}</span>
          </p>
        </div>

      </div>
    </div>
  );
};

export default LandingPage;
