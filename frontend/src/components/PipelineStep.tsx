import React from 'react';
import { motion, type Variants } from 'framer-motion';
import {
  FileCode, Scan, TreePine, Search, Code2, Cpu,
} from 'lucide-react';
import type { PipelineStepData } from '../data/pipelineData';

const iconMap: Record<string, React.FC<{ size?: number; className?: string; style?: React.CSSProperties }>> = {
  FileCode, Scan, TreePine, Search, Code2, Cpu,
};

const containerVariants: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

interface Props {
  step: PipelineStepData;
  isLast: boolean;
}

const PipelineStep: React.FC<Props> = ({ step, isLast }) => {
  const Icon = iconMap[step.icon] || FileCode;

  return (
    <motion.section
      className="relative min-h-[80vh] flex items-center py-16 md:py-24"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: false, amount: 0.15 }}
      transition={{ duration: 0.6 }}
    >
      <div className="w-full max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-10 lg:gap-16 items-center">
        {/* Left: Step indicator + visual */}
        <motion.div
          className="flex flex-col items-center lg:items-end gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: false, amount: 0.3 }}
        >
          {/* Phase number + icon */}
          <motion.div variants={itemVariants} className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center border-2 relative"
              style={{
                borderColor: step.color,
                boxShadow: `0 0 20px ${step.color}33, inset 0 0 15px ${step.color}11`,
              }}
            >
              <Icon size={24} style={{ color: step.color }} />
              {/* Pulse ring */}
              <div
                className="absolute inset-0 rounded-full pulse-ring"
                style={{ boxShadow: `0 0 0 0 ${step.color}44` }}
              />
            </div>
            <div className="text-left">
              <div
                className="text-[10px] font-bold tracking-[0.3em] uppercase"
                style={{ color: step.color, fontFamily: 'var(--font-display)' }}
              >
                Phase {step.phase}
              </div>
              <h2
                className="text-2xl md:text-3xl font-black tracking-wider text-[var(--color-text)]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {step.title}
              </h2>
            </div>
          </motion.div>

          {/* Input/Output mini preview */}
          <motion.div
            variants={itemVariants}
            className="w-full max-w-md bg-[var(--color-card)] border border-[var(--color-border)] p-4"
          >
            <div
              className="text-[9px] font-bold tracking-[0.2em] uppercase mb-2"
              style={{ color: step.color, fontFamily: 'var(--font-mono)' }}
            >
              Output
            </div>
            <pre
              className="text-[10px] leading-relaxed text-[var(--color-text-dim)] overflow-hidden max-h-40 overflow-y-auto"
              style={{ fontFamily: 'var(--font-mono)', scrollbarWidth: 'none' }}
            >
              {step.output.length > 400 ? step.output.slice(0, 400) + '\n// ...' : step.output}
            </pre>
          </motion.div>
        </motion.div>

        {/* Right: Explanation */}
        <motion.div
          className="flex flex-col gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: false, amount: 0.2 }}
        >
          {/* Subtitle */}
          <motion.div variants={itemVariants}>
            <span
              className="text-xs font-bold tracking-[0.2em] uppercase"
              style={{ color: step.color, fontFamily: 'var(--font-mono)' }}
            >
              {step.subtitle}
            </span>
          </motion.div>

          {/* Explanation paragraphs */}
          {step.explanation.map((para, i) => (
            <motion.p
              key={i}
              variants={itemVariants}
              className="text-sm md:text-base leading-relaxed text-[var(--color-text-dim)]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {para}
            </motion.p>
          ))}

          {/* Java concept box */}
          <motion.div
            variants={itemVariants}
            className="border-l-2 pl-4 py-2"
            style={{ borderColor: step.color }}
          >
            <div
              className="text-[9px] font-bold tracking-[0.2em] uppercase mb-1"
              style={{ color: step.color, fontFamily: 'var(--font-display)' }}
            >
              Java Concept
            </div>
            <p
              className="text-xs leading-relaxed text-[var(--color-text-muted)]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {step.javaConcept}
            </p>
          </motion.div>

          {/* Input label */}
          <motion.div
            variants={itemVariants}
            className="bg-[var(--color-surface)] border border-[var(--color-border)] p-3"
          >
            <div
              className="text-[9px] font-bold tracking-[0.2em] uppercase mb-1 text-[var(--color-text-muted)]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Input
            </div>
            <pre
              className="text-[10px] text-[var(--color-text-dim)] overflow-hidden max-h-20"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {step.input.length > 200 ? step.input.slice(0, 200) + '...' : step.input}
            </pre>
          </motion.div>
        </motion.div>
      </div>

      {/* Connecting line to next step */}
      {!isLast && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-px h-16 bg-gradient-to-b from-transparent via-[var(--color-border)] to-transparent" />
      )}
    </motion.section>
  );
};

export default PipelineStep;
