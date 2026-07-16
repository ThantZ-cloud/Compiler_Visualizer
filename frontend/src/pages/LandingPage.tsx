import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BinaryRain from '../components/BinaryRain';

const PHASES = [
  { num: '01', label: 'LEXING', desc: 'Break source into tokens', icon: '⟐', color: 'var(--color-neon)' },
  { num: '02', label: 'PARSING', desc: 'Build syntax tree', icon: '⌬', color: 'var(--color-cyan)' },
  { num: '03', label: 'AST', desc: 'Abstract syntax tree', icon: '⬡', color: 'var(--color-magenta)' },
  { num: '04', label: 'SEMANTIC', desc: 'Analyze symbol table', icon: '◈', color: 'var(--color-amber)' },
  { num: '05', label: 'BYTECODE', desc: 'JVM instructions', icon: '⏣', color: 'var(--color-rose)' },
];

const FEATURES = [
  { label: 'MONACO EDITOR', desc: 'Full Java syntax highlighting with JetBrains Mono' },
  { label: 'REAL COMPILATION', desc: 'javac-powered — not a toy, real bytecode output' },
  { label: 'FILE MANAGEMENT', desc: 'VS Code-like sidebar with folders and save' },
  { label: 'LIVE VISUALIZATION', desc: 'D3.js trees, charts, and flow diagrams' },
];

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

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {bits.map(b => (
        <span
          key={b.id}
          className="absolute text-[var(--color-neon)]"
          style={{
            left: `${b.left}%`,
            fontSize: `${b.size}px`,
            opacity: 0.08,
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

// ── Boot sequence text ──
function BootSequence({ onComplete }: { onComplete: () => void }) {
  const [lines, setLines] = useState<string[]>([]);
  const bootLines = useRef([
    '[BOOT] Compiler Visualizer v2.0.0',
    '[SYS]  Initializing JVM interface...',
    '[OK]   JavaParser loaded',
    '[OK]   D3.js visualization engine ready',
    '[OK]   Monaco Editor loaded',
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
    <div className="fixed inset-0 z-[9998] bg-[var(--color-void)] flex items-center justify-center">
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
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [booted, setBooted] = useState(false);
  const [showContent, setShowContent] = useState(false);

  const typed = useTypewriter([
    'javac Main.java',
    'java -cp . Main',
    'class Lexer { scan() }',
    'public static void main',
    'System.out.println("0101")',
    'tokenize → parse → compile',
  ], 70, 35, 1800);

  // Boot sequence on mount
  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setBooted(true);
      setShowContent(true);
      return;
    }
    // Skip boot after 3s max
    const timeout = setTimeout(() => {
      setBooted(true);
      setShowContent(true);
    }, 3200);
    return () => clearTimeout(timeout);
  }, []);

  const handleBootComplete = () => {
    setBooted(true);
    setTimeout(() => setShowContent(true), 100);
  };

  return (
    <div className="scanlines">
      {/* Boot sequence */}
      {!booted && <BootSequence onComplete={handleBootComplete} />}

      <div className={`flex-1 overflow-y-auto bg-[var(--color-void)] transition-opacity duration-700 ${showContent ? 'opacity-100' : 'opacity-0'}`}>
        {/* ═══════ HERO ═══════ */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
          <BinaryRain />
          <FloatingBinary />

          {/* Scanline overlay */}
          <div className="absolute inset-0 pointer-events-none z-10"
            style={{
              background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,136,0.02) 2px, rgba(0,255,136,0.02) 4px)',
            }}
          />

          {/* Neon corner brackets */}
          <div className="absolute top-8 left-8 w-16 h-16 border-t-2 border-l-2 border-[var(--color-neon)] opacity-30 z-10" />
          <div className="absolute top-8 right-8 w-16 h-16 border-t-2 border-r-2 border-[var(--color-neon)] opacity-30 z-10" />
          <div className="absolute bottom-8 left-8 w-16 h-16 border-b-2 border-l-2 border-[var(--color-neon)] opacity-30 z-10" />
          <div className="absolute bottom-8 right-8 w-16 h-16 border-b-2 border-r-2 border-[var(--color-neon)] opacity-30 z-10" />

          <div className="relative z-20 text-center px-6 max-w-5xl mx-auto">
            {/* Status badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 border border-[var(--color-neon)] bg-[var(--color-neon)]/5">
              <span className="w-1.5 h-1.5 bg-[var(--color-neon)] pulse-ring" />
              <span className="text-[10px] font-bold text-[var(--color-neon)] tracking-[0.25em] uppercase"
                style={{ fontFamily: 'var(--font-display)' }}>
                SYSTEM ONLINE
              </span>
            </div>

            {/* Main title — glitch effect */}
            <h1 className="mb-2"
              style={{ fontFamily: 'var(--font-display)' }}>
              <span className="block text-5xl md:text-7xl lg:text-8xl font-black tracking-wider text-[var(--color-text)] text-glitch">
                COMPILER
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
              {'// '}Write Java code. Watch the compiler dissect it —<br />
              token by token, tree by tree, instruction by instruction.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                className="btn-neon px-10 py-4 text-sm tracking-[0.15em] glitch-hover"
                onClick={() => navigate('/compiler')}
              >
                <span>[ {isAuthenticated ? 'OPEN EDITOR' : 'BEGIN'} ]</span>
              </button>
              <button
                className="px-8 py-4 text-sm text-[var(--color-text-dim)] border border-[var(--color-border)] hover:border-[var(--color-text-muted)] transition-colors tracking-[0.1em]"
                style={{ fontFamily: 'var(--font-display)' }}
                onClick={() => document.getElementById('pipeline')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <span>VIEW PIPELINE ↓</span>
              </button>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2">
            <span className="text-[9px] text-[var(--color-text-muted)] tracking-[0.3em] uppercase"
              style={{ fontFamily: 'var(--font-display)' }}>
              Scroll
            </span>
            <div className="w-px h-8 bg-gradient-to-b from-[var(--color-neon)] to-transparent opacity-40" />
          </div>
        </section>

        {/* ═══════ PIPELINE ═══════ */}
        <section id="pipeline" className="py-24 px-6 relative border-t border-[var(--color-border)]">
          <div className="max-w-6xl mx-auto">
            {/* Section header */}
            <div className="text-center mb-16">
              <span className="text-[10px] font-bold text-[var(--color-neon)] tracking-[0.3em] uppercase mb-4 block"
                style={{ fontFamily: 'var(--font-display)' }}>
                {'< '}PIPELINE {' />'}
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-[var(--color-text)] mb-4"
                style={{ fontFamily: 'var(--font-display)' }}>
                FIVE PHASES. ONE JOURNEY.
              </h2>
              <p className="text-[var(--color-text-dim)] text-sm max-w-lg mx-auto"
                style={{ fontFamily: 'var(--font-mono)' }}>
                {'// '}Your source code passes through each stage.<br />
                {'// '}Visualize every transformation.
              </p>
            </div>

            {/* Pipeline flow — terminal style */}
            <div className="relative">
              {/* Connecting line */}
              <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-px -translate-y-1/2 z-0"
                style={{
                  background: 'linear-gradient(90deg, var(--color-neon), var(--color-cyan), var(--color-magenta), var(--color-amber), var(--color-rose))',
                  opacity: 0.2,
                }}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 relative z-10">
                {PHASES.map((phase, i) => (
                  <div
                    key={phase.num}
                    className="phase-card p-5 text-center group cursor-pointer"
                    onClick={() => navigate('/compiler')}
                  >
                    {/* Phase number */}
                    <span className="text-[9px] font-bold tracking-[0.2em] block mb-3"
                      style={{ color: phase.color, fontFamily: 'var(--font-display)' }}>
                      PHASE {phase.num}
                    </span>

                    {/* Icon */}
                    <div className="text-2xl mb-3 transition-all group-hover:scale-110"
                      style={{ color: phase.color }}>
                      {phase.icon}
                    </div>

                    {/* Label */}
                    <h3 className="text-xs font-bold text-[var(--color-text)] mb-1 tracking-[0.15em]"
                      style={{ fontFamily: 'var(--font-display)' }}>
                      {phase.label}
                    </h3>
                    <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed"
                      style={{ fontFamily: 'var(--font-mono)' }}>
                      {phase.desc}
                    </p>

                    {/* Arrow between cards */}
                    {i < PHASES.length - 1 && (
                      <div className="hidden lg:block absolute -right-2 top-1/2 -translate-y-1/2 text-[var(--color-neon)] text-xs z-20 opacity-40"
                        style={{ fontFamily: 'var(--font-mono)' }}>
                        →
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══════ FEATURES ═══════ */}
        <section className="py-24 px-6 border-t border-[var(--color-border)]">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-16 items-center">
              {/* Left — feature list */}
              <div>
                <span className="text-[10px] font-bold text-[var(--color-cyan)] tracking-[0.3em] uppercase mb-4 block"
                  style={{ fontFamily: 'var(--font-display)' }}>
                  {'< '}FEATURES {' />'}
                </span>
                <h2 className="text-2xl md:text-3xl font-bold text-[var(--color-text)] mb-8"
                  style={{ fontFamily: 'var(--font-display)' }}>
                  NOT A TOY DEMO.
                </h2>

                <div className="space-y-4">
                  {FEATURES.map((f, i) => (
                    <div key={i} className="flex items-start gap-4 p-4 border border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-neon)] transition-colors group">
                      <span className="text-[var(--color-neon)] text-xs font-bold mt-0.5 shrink-0"
                        style={{ fontFamily: 'var(--font-mono)' }}>
                        [{String(i + 1).padStart(2, '0')}]
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-[var(--color-text)] tracking-[0.1em] mb-1"
                          style={{ fontFamily: 'var(--font-display)' }}>
                          {f.label}
                        </h4>
                        <p className="text-[11px] text-[var(--color-text-dim)]"
                          style={{ fontFamily: 'var(--font-mono)' }}>
                          {f.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right — code block */}
              <div className="bg-[var(--color-card)] border border-[var(--color-border)] overflow-hidden">
                {/* Terminal title bar */}
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                  <span className="w-2.5 h-2.5 bg-[var(--color-rose)] opacity-70" />
                  <span className="w-2.5 h-2.5 bg-[var(--color-amber)] opacity-70" />
                  <span className="w-2.5 h-2.5 bg-[var(--color-neon)] opacity-70" />
                  <span className="ml-2 text-[10px] text-[var(--color-text-muted)]"
                    style={{ fontFamily: 'var(--font-mono)' }}>
                    Main.java
                  </span>
                </div>

                {/* Code */}
                <div className="p-5 text-xs leading-loose" style={{ fontFamily: 'var(--font-mono)' }}>
                  <pre className="text-[var(--color-text-dim)]">
                    <span className="text-[var(--color-neon)]">public class</span>{' '}
                    <span className="text-[var(--color-amber)]">Main</span> {'{'}
                  </pre>
                  <pre className="text-[var(--color-text-dim)]">
                    {'  '}
                    <span className="text-[var(--color-neon)]">public static void</span>{' '}
                    <span className="text-[var(--color-cyan)]">main</span>(
                    <span className="text-[var(--color-magenta)]">String[]</span> args) {'{'}
                  </pre>
                  <pre className="text-[var(--color-text-dim)]">
                    {'    '}System.<span className="text-[var(--color-cyan)]">out</span>.
                    <span className="text-[var(--color-cyan)]">println</span>(
                    <span className="text-[var(--color-neon)]">"Hello, World!"</span>);
                  </pre>
                  <pre className="text-[var(--color-text-dim)]">
                    {'  }'}
                  </pre>
                  <pre className="text-[var(--color-text-dim)]">
                    {'}'}
                  </pre>
                </div>

                {/* Output bar */}
                <div className="px-4 py-2.5 border-t border-[var(--color-border)] bg-[var(--color-surface)]">
                  <span className="text-[10px] text-[var(--color-text-muted)]"
                    style={{ fontFamily: 'var(--font-mono)' }}>
                    <span className="text-[var(--color-neon)]">$</span> javac Main.java && java Main
                  </span>
                  <br />
                  <span className="text-[11px] text-[var(--color-text)]"
                    style={{ fontFamily: 'var(--font-mono)' }}>
                    Hello, World!
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════ FOOTER CTA ═══════ */}
        <section className="py-24 px-6 border-t border-[var(--color-border)] relative overflow-hidden">
          {/* Background glow */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[600px] h-[300px] bg-[var(--color-neon)] opacity-[0.03] blur-[120px]" />
          </div>

          <div className="max-w-2xl mx-auto text-center relative z-10">
            <h2 className="text-2xl md:text-3xl font-bold text-[var(--color-text)] mb-4"
              style={{ fontFamily: 'var(--font-display)' }}>
              READY TO COMPILE?
            </h2>
            <p className="text-[var(--color-text-dim)] text-sm mb-10"
              style={{ fontFamily: 'var(--font-mono)' }}>
              {'// '}Open the editor, write some Java, and watch every phase unfold.
            </p>
            <button
              className="btn-neon px-12 py-5 text-sm tracking-[0.15em] glitch-hover"
              onClick={() => navigate('/compiler')}
            >
              <span>[ LAUNCH EDITOR ]</span>
            </button>
          </div>
        </section>

        {/* ═══════ FOOTER ═══════ */}
        <footer className="py-6 px-6 border-t border-[var(--color-border)] bg-[var(--color-card)]">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[var(--color-neon)] font-bold"
                style={{ fontFamily: 'var(--font-display)' }}>
                {'< '}CV{' />'}
              </span>
              <span className="text-[10px] text-[var(--color-text-muted)]"
                style={{ fontFamily: 'var(--font-mono)' }}>
                Compiler Visualizer v2.0.0
              </span>
            </div>
            <div className="flex items-center gap-6">
              <span className="text-[10px] text-[var(--color-text-muted)]"
                style={{ fontFamily: 'var(--font-mono)' }}>
                Java 17 • Spring Boot • React • D3.js
              </span>
              <span className="text-[10px] text-[var(--color-text-muted)]"
                style={{ fontFamily: 'var(--font-mono)' }}>
                Built with {'<3'} for learning
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;
