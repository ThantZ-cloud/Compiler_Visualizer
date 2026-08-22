import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { Copy, Check, ChevronDown, FileCode, Scan, TreePine, Search, Code2, Cpu, Wand2, Play, Boxes } from 'lucide-react';
import type { PipelineStepData } from '../../data/pipelineData';

const iconMap: Record<string, React.FC<{ size?: number; className?: string; style?: React.CSSProperties }>> = {
  FileCode, Scan, TreePine, Search, Code2, Cpu, Boxes, Wand2, Play,
};

interface Props {
  step: PipelineStepData;
  isLast: boolean;
}

function SectionLabel({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <div className="text-[10px] font-bold tracking-[0.2em] uppercase mb-2 flex items-center gap-2" style={{ fontFamily: 'var(--font-mono)', color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} aria-hidden />
      {children}
    </div>
  );
}

const CodePanel: React.FC<{ title: string; code: string; color: string; language?: string }> = ({ title, code, color, language = 'java' }) => {
  const [copied, setCopied] = useState(false);
  const display = code.length > 1800 ? code.slice(0, 1800) + '\n// … truncated for readability' : code;
  const onCopy = async () => {
    try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1400); } catch { /* ignore */ }
  };
  return (
    <div className="border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <span className="text-[10px] font-bold tracking-[0.15em] uppercase" style={{ fontFamily: 'var(--font-display)', color }}>
          {title}
        </span>
        <span className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-[var(--color-text-muted)] hidden sm:inline">{language}</span>
          <button
            onClick={onCopy}
            aria-label={`Copy ${title}`}
            className="inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-mono border border-[var(--color-border)] bg-[var(--color-void)] hover:border-[var(--color-neon)] hover:text-[var(--color-neon)] transition-colors"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </span>
      </div>
      <pre
        className="text-[11px] leading-relaxed p-3 overflow-auto max-h-80"
        style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-dim)' }}
      >
        {display}
      </pre>
    </div>
  );
};

const DocStep: React.FC<Props> = ({ step, isLast }) => {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const Icon = iconMap[step.icon] || FileCode;
  const [expanded, setExpanded] = useState(false);
  const longOutput = step.output.length > 420;
  const visibleOutput = expanded || !longOutput ? step.output : step.output.slice(0, 420) + '\n// …';

  return (
    <motion.section
      id={`phase-${step.id}`}
      className="scroll-mt-20 py-8 md:py-10 border-b border-[var(--color-border)]/70 last:border-b-0"
      initial={reduce ? false : { opacity: 0, y: 6 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div
          className="w-9 h-9 shrink-0 flex items-center justify-center border bg-[var(--color-card)]"
          style={{ borderColor: `${step.color}55`, color: step.color }}
          aria-hidden
        >
          <Icon size={16} />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ fontFamily: 'var(--font-display)', color: step.color }}>
            PHASE {String(step.phase).padStart(2, '0')} — {step.subtitle}
          </div>
          <h3 className="text-lg md:text-xl font-bold tracking-tight text-[var(--color-text)] mt-0.5" style={{ fontFamily: 'var(--font-display)' }}>
            {step.title}
          </h3>
        </div>
      </div>

      {/* Two-column: prose left, code right */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-6 items-start">
        <div className="min-w-0">
          {/* What / Why / Plain analogy */}
          <div className="space-y-3">
            {step.explanation.map((para, i) => (
              <p
                key={i}
                className={`${i === 0 ? 'text-[14px] leading-relaxed text-[var(--color-text)]' : 'text-sm leading-relaxed text-[var(--color-text-dim)]'}`}
                style={{ fontFamily: 'var(--font-sans)' }}
              >
                {para}
              </p>
            ))}
          </div>

          {/* Java concept callout — easy to learn */}
          <div className="mt-5 border-l-2 pl-4 py-2 bg-[var(--color-surface)]/70" style={{ borderColor: step.color }}>
            <div className="text-[10px] font-bold tracking-[0.15em] uppercase mb-1" style={{ fontFamily: 'var(--font-display)', color: step.color }}>
              {t('pipeline.javaConceptLabel')} — {t('pipeline.phaseLabel')} {String(step.phase).padStart(2, '0')}
            </div>
            <p className="text-xs leading-relaxed text-[var(--color-text-muted)]" style={{ fontFamily: 'var(--font-sans)' }}>
              {step.javaConcept}
            </p>
          </div>

          {/* Expandable extra detail (learn more) */}
          {longOutput && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-mono text-[var(--color-text-muted)] hover:text-[var(--color-neon)] transition-colors"
            >
              {expanded ? 'Show less' : 'Show code details'}
              <ChevronDown size={12} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>

        <div className="min-w-0 space-y-4">
          <SectionLabel color={step.color}>{t('pipeline.inputLabel')}</SectionLabel>
          <CodePanel title={t('pipeline.inputLabel')} code={step.input} color="var(--color-text-muted)" language="java" />
          <SectionLabel color={step.color}>{t('pipeline.outputLabel')}</SectionLabel>
          <CodePanel title={t('pipeline.outputLabel')} code={visibleOutput} color={step.color} language={step.id === 'source' ? 'java' : step.id === 'lexical' ? 'json' : 'java'} />
        </div>
      </div>

      {!isLast && <div className="hidden md:block h-px mt-8 bg-[var(--color-border)]/50" />}
    </motion.section>
  );
};

export default DocStep;
