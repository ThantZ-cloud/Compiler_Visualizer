import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { CodeGenerationData, TacInstruction } from '../../types';

interface Props {
  data: CodeGenerationData;
  isPlaying: boolean;
  isCompleted: boolean;
}

interface DecompositionStep {
  sourceExpr: string;
  breakdown: string[];
  sourceLine: number;
}

/**
 * Groups consecutive instructions that share the same source line
 * into decomposition steps — showing how one expression becomes
 * multiple TAC instructions.
 */
function buildDecompositionSteps(instructions: TacInstruction[]): DecompositionStep[] {
  const steps: DecompositionStep[] = [];
  let current: DecompositionStep | null = null;

  for (const instr of instructions) {
    // Skip labels, method_start, method_end
    if (instr.op === 'label' || instr.op === 'method_start' || instr.op === 'method_end') continue;

    const srcLine = instr.sourceLine;
    const display = formatInstruction(instr);

    if (current && current.sourceLine === srcLine && srcLine !== -1) {
      current.breakdown.push(display);
    } else {
      if (current) steps.push(current);
      current = {
        sourceExpr: instr.comment || `Line ${srcLine + 1}`,
        breakdown: [display],
        sourceLine: srcLine,
      };
    }
  }
  if (current) steps.push(current);
  return steps;
}

function formatInstruction(instr: TacInstruction): string {
  switch (instr.op) {
    case 'assign':
      return `${instr.result} = ${instr.arg1}`;
    case 'binary':
      return `${instr.result} = ${instr.arg1} ${instr.operator} ${instr.arg2}`;
    case 'neg':
      return `${instr.result} = ${instr.operator}${instr.arg1}`;
    case 'ldc':
      return `${instr.result} = ldc ${instr.arg1}`;
    case 'getstatic':
      return `${instr.result} = getstatic ${instr.arg1} : ${instr.arg2}`;
    case 'invokevirtual':
      return `${instr.result ? instr.result + ' = ' : ''}invokevirtual ${instr.arg1}(${instr.arg2})`;
    case 'if':
      return `if ${instr.arg1} goto ${instr.target}`;
    case 'iffalse':
      return `iffalse ${instr.arg1} goto ${instr.target}`;
    case 'goto':
      return `goto ${instr.target}`;
    case 'return':
      return `return${instr.arg1 ? ' ' + instr.arg1 : ''}`;
    case 'label':
      return `${instr.result}:`;
    default:
      return `${instr.result || ''} ${instr.op} ${instr.arg1 || ''}`.trim();
  }
}

const OP_COLORS: Record<string, string> = {
  assign: '#569cd6',
  binary: '#dcdcaa',
  neg: '#dcdcaa',
  ldc: '#ce9178',
  getstatic: '#4ec9b0',
  invokevirtual: '#4ec9b0',
  if: '#c586c0',
  iffalse: '#c586c0',
  goto: '#c586c0',
  return: '#c586c0',
  label: '#6a9955',
};

const ExpressionDecomposition: React.FC<Props> = ({ data, isPlaying, isCompleted }) => {
  const { t } = useTranslation();
  const steps = useMemo(() => buildDecompositionSteps(data.instructions), [data]);
  const [revealCount, setRevealCount] = useState(0);

  useEffect(() => {
    if (!isPlaying) {
      setRevealCount(isCompleted ? Number.MAX_SAFE_INTEGER : 0);
      return;
    }
    setRevealCount(0);
    const interval = setInterval(() => {
      setRevealCount(prev => prev + 1);
    }, 500);
    return () => clearInterval(interval);
  }, [isPlaying, isCompleted]);

  const visibleCount = isPlaying ? revealCount : (isCompleted ? steps.length : 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-[var(--color-card)] border border-[var(--color-border)] p-4"
    >
      <div className="mb-3">
        <h3 className="text-sm font-bold text-[var(--color-text)] font-display tracking-[0.1em] uppercase">
          {t('codegen.step1.title')}
        </h3>
        <p className="text-xs text-[var(--color-text-muted)] font-mono mt-1">
          {t('codegen.step1.description')}
        </p>
      </div>

      <div className="space-y-2">
        {steps.slice(0, visibleCount).map((step, idx) => (
          <motion.div
            key={`${step.sourceLine}-${idx}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="border border-[var(--color-border)] bg-[var(--color-void)] p-3"
          >
            {/* Source expression header */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold text-[var(--color-neon)] font-display tracking-wider uppercase">
                Expression
              </span>
              <span className="text-xs font-mono text-[var(--color-text-muted)]">
                {step.sourceExpr}
              </span>
            </div>

            {/* Decomposition arrow */}
            <div className="flex items-center gap-2 mb-2">
              <div className="h-px flex-1 bg-[var(--color-border)]" />
              <span className="text-[10px] text-[var(--color-neon)] font-display tracking-wider">
                {'>>>'} DECOMPOSES INTO {step.breakdown.length} INSTRUCTION{step.breakdown.length > 1 ? 'S' : ''}
              </span>
              <div className="h-px flex-1 bg-[var(--color-border)]" />
            </div>

            {/* Resulting instructions */}
            <div className="space-y-1">
              {step.breakdown.map((instr, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[10px] text-[var(--color-text-muted)] font-mono w-4 text-right">
                    {i + 1}.
                  </span>
                  <code className="text-xs font-mono text-[var(--color-text)]">
                    {highlightInstruction(instr)}
                  </code>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {steps.length === 0 && (
        <div className="text-xs text-[var(--color-text-muted)] font-mono text-center py-4">
          No instructions to decompose
        </div>
      )}
    </motion.div>
  );
};

/**
 * Simple syntax highlighting for TAC instructions.
 */
function highlightInstruction(instr: string): React.ReactNode {
  const parts: React.ReactNode[] = [];

  // Match label definitions
  const labelMatch = instr.match(/^(\w+:)$/);
  if (labelMatch) {
    return <span style={{ color: OP_COLORS.label }}>{instr}</span>;
  }

  // Match control flow keywords
  if (instr.startsWith('if ') || instr.startsWith('iffalse ') || instr.startsWith('goto ') || instr.startsWith('return')) {
    const keyword = instr.split(' ')[0];
    parts.push(
      <span key="kw" style={{ color: OP_COLORS[keyword] || '#c586c0' }}>{keyword}</span>
    );
    parts.push(<span key="rest"> {instr.slice(keyword.length)}</span>);
    return <span>{parts}</span>;
  }

  // Match assignment: result = expr
  const assignMatch = instr.match(/^(\w+)\s*=\s*(.+)$/);
  if (assignMatch) {
    const [, result, expr] = assignMatch;
    // Check if expr starts with a keyword
    const keywordMatch = expr.match(/^(getstatic|ldc|invokevirtual|binary|neg)\b/);
    if (keywordMatch) {
      const kw = keywordMatch[1];
      parts.push(
        <span key="result" style={{ color: '#9cdcfe' }}>{result}</span>
      );
      parts.push(<span key="eq"> = </span>);
      parts.push(
        <span key="kw" style={{ color: OP_COLORS[kw] || '#4ec9b0' }}>{kw}</span>
      );
      parts.push(<span key="rest"> {expr.slice(kw.length)}</span>);
      return <span>{parts}</span>;
    }
    // Binary expression with operator
    const binMatch = expr.match(/^(\S+)\s*([+\-*/%<>=!&|^]+)\s*(.+)$/);
    if (binMatch) {
      parts.push(
        <span key="result" style={{ color: '#9cdcfe' }}>{result}</span>
      );
      parts.push(<span key="eq"> = </span>);
      parts.push(
        <span key="left" style={{ color: '#9cdcfe' }}>{binMatch[1]}</span>
      );
      parts.push(
        <span key="op" style={{ color: OP_COLORS.binary }}> {binMatch[2]} </span>
      );
      parts.push(
        <span key="right" style={{ color: '#9cdcfe' }}>{binMatch[3]}</span>
      );
      return <span>{parts}</span>;
    }
    return (
      <span>
        <span style={{ color: '#9cdcfe' }}>{result}</span>
        <span> = </span>
        <span style={{ color: '#ce9178' }}>{expr}</span>
      </span>
    );
  }

  return <span style={{ color: '#d4d4d4' }}>{instr}</span>;
}

export default ExpressionDecomposition;
