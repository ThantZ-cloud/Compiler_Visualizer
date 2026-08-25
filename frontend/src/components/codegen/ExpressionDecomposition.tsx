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

function buildDecompositionSteps(instructions: TacInstruction[]): DecompositionStep[] {
  const steps: DecompositionStep[] = [];
  let current: DecompositionStep | null = null;

  for (const instr of instructions) {
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

const OP_BADGES: Record<string, { label: string; color: string }> = {
  assign: { label: 'ASSIGN', color: '#569cd6' },
  binary: { label: 'BINARY', color: '#dcdcaa' },
  neg: { label: 'UNARY', color: '#dcdcaa' },
  ldc: { label: 'LOAD', color: '#ce9178' },
  getstatic: { label: 'GET', color: '#4ec9b0' },
  invokevirtual: { label: 'CALL', color: '#4ec9b0' },
  if: { label: 'BRANCH', color: '#c586c0' },
  iffalse: { label: 'BRANCH', color: '#c586c0' },
  goto: { label: 'GOTO', color: '#c586c0' },
  return: { label: 'RETURN', color: '#c586c0' },
  label: { label: 'LABEL', color: '#6a9955' },
  method_start: { label: 'METHOD', color: '#dcdcaa' },
  method_end: { label: 'END', color: '#dcdcaa' },
};

const ExpressionDecomposition: React.FC<Props> = ({ data, isPlaying, isCompleted }) => {
  const { t } = useTranslation();
  const steps = useMemo(() => buildDecompositionSteps(data.instructions), [data]);
  const displayInstructions = useMemo(() => data.instructions.filter(i => i.op !== 'method_end'), [data]);
  const [revealCount, setRevealCount] = useState(0);
  const [view, setView] = useState<'decomposition' | 'fullTac'>('decomposition');

  useEffect(() => {
    if (!isPlaying) {
      setRevealCount(isCompleted ? Number.MAX_SAFE_INTEGER : 0);
      return;
    }
    setRevealCount(0);
    const interval = setInterval(() => {
      setRevealCount(prev => prev + 1);
    }, view === 'decomposition' ? 500 : 150);
    return () => clearInterval(interval);
  }, [isPlaying, isCompleted, view]);

  const visibleDecomp = isPlaying ? revealCount : (isCompleted ? steps.length : 0);
  const visibleTac = isPlaying ? revealCount : (isCompleted ? displayInstructions.length : 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-[var(--color-card)] border border-[var(--color-border)] p-4"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-[var(--color-text)] font-display tracking-[0.1em] uppercase">
              {t('codegen.step0.title')}
            </h3>
            <span className="text-[8px] font-bold font-mono px-1.5 py-0.5 tracking-wider border border-[rgba(0,255,136,0.3)] text-[var(--color-neon)] bg-[rgba(0,255,136,0.06)]">
              {t('codegen.step0.algorithm')}
            </span>
          </div>
          <p className="text-xs text-[var(--color-text-muted)] font-mono mt-1">
            {t('codegen.step0.description')}
          </p>
        </div>
      </div>

      {/* View toggle */}
      <div className="flex gap-1 mb-3">
        <button
          onClick={() => setView('decomposition')}
          className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold tracking-wide border ${view === 'decomposition' ? 'bg-[var(--color-neon-dim)] text-[var(--color-neon)] border-[var(--color-neon)]' : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border-bright)]'}`}
        >
          {t('codegen.step0.viewDecomposition')}
        </button>
        <button
          onClick={() => setView('fullTac')}
          className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold tracking-wide border ${view === 'fullTac' ? 'bg-[var(--color-neon-dim)] text-[var(--color-neon)] border-[var(--color-neon)]' : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border-bright)]'}`}
        >
          {t('codegen.step0.viewFullTac')}
        </button>
      </div>

      {/* Summary */}
      <div className="mb-3 flex items-center gap-3 text-[10px] font-mono text-[var(--color-text-muted)]">
        <span>{data.totalInstructions} instructions</span>
        <span className="text-[var(--color-border)]">|</span>
        <span>{data.className}</span>
      </div>

      {view === 'decomposition' ? (
        <div className="space-y-2">
          {steps.slice(0, visibleDecomp).map((step, idx) => (
            <motion.div
              key={`${step.sourceLine}-${idx}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="border border-[var(--color-border)] bg-[var(--color-void)] p-3"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold text-[var(--color-neon)] font-display tracking-wider uppercase">
                  Expression
                </span>
                <span className="text-xs font-mono text-[var(--color-text-muted)]">
                  {step.sourceExpr}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-px flex-1 bg-[var(--color-border)]" />
                <span className="text-[10px] text-[var(--color-neon)] font-display tracking-wider">
                  {'>>>'} DECOMPOSES INTO {step.breakdown.length} INSTRUCTION{step.breakdown.length > 1 ? 'S' : ''}
                </span>
                <div className="h-px flex-1 bg-[var(--color-border)]" />
              </div>
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
          {steps.length === 0 && (
            <div className="text-xs text-[var(--color-text-muted)] font-mono text-center py-4">
              No instructions to decompose
            </div>
          )}
        </div>
      ) : (
        <div className="border border-[var(--color-border)] bg-[var(--color-void)] overflow-hidden">
          <div className="grid grid-cols-[40px_60px_1fr_1fr] gap-2 px-3 py-1.5 bg-[rgba(0,255,136,0.03)] border-b border-[var(--color-border)] text-[9px] font-bold text-[var(--color-text-muted)] font-display tracking-wider uppercase">
            <span>Line</span>
            <span>Type</span>
            <span>Instruction</span>
            <span>Source</span>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {displayInstructions.slice(0, visibleTac).map((instr, idx) => {
              const badge = OP_BADGES[instr.op] || { label: instr.op.toUpperCase(), color: '#d4d4d4' };
              return (
                <motion.div
                  key={`${instr.line}-${idx}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15 }}
                  className={`grid grid-cols-[40px_60px_1fr_1fr] gap-2 px-3 py-1.5 border-b border-[var(--color-border)] items-center text-xs font-mono hover:bg-[rgba(0,255,136,0.03)] ${
                    instr.op === 'label' ? 'bg-[rgba(106,153,85,0.05)]' : ''
                  }`}
                >
                  <span className="text-[var(--color-text-muted)] text-[10px]">{instr.line}</span>
                  <span>
                    <span
                      className="text-[9px] font-bold font-display px-1.5 py-0.5 tracking-wider"
                      style={{ color: badge.color, backgroundColor: `${badge.color}15`, border: `1px solid ${badge.color}30` }}
                    >
                      {badge.label}
                    </span>
                  </span>
                  <span className="text-[var(--color-text)]">{formatInstructionColored(instr)}</span>
                  <span className="text-[var(--color-text-muted)] text-[10px] truncate">
                    {instr.sourceLine >= 0 ? `L${instr.sourceLine + 1}` : ''}
                    {instr.comment ? ` ${instr.comment}` : ''}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
};

function highlightInstruction(instr: string): React.ReactNode {
  const labelMatch = instr.match(/^(\w+:)$/);
  if (labelMatch) return <span style={{ color: OP_COLORS.label }}>{instr}</span>;
  if (instr.startsWith('if ') || instr.startsWith('iffalse ') || instr.startsWith('goto ') || instr.startsWith('return')) {
    const keyword = instr.split(' ')[0];
    return <span><span style={{ color: (OP_COLORS[keyword] || '#c586c0') }}>{keyword}</span><span> {instr.slice(keyword.length)}</span></span>;
  }
  const assignMatch = instr.match(/^(\w+)\s*=\s*(.+)$/);
  if (assignMatch) {
    const [, result, expr] = assignMatch;
    const keywordMatch = expr.match(/^(getstatic|ldc|invokevirtual|binary|neg)\b/);
    if (keywordMatch) {
      const kw = keywordMatch[1];
      return <span><span style={{ color: '#9cdcfe' }}>{result}</span><span> = </span><span style={{ color: (OP_COLORS[kw] || '#4ec9b0') }}>{kw}</span><span> {expr.slice(kw.length)}</span></span>;
    }
    const binMatch = expr.match(/^(\S+)\s*([+\-*/%<>=!&|^]+)\s*(.+)$/);
    if (binMatch) {
      return <span><span style={{ color: '#9cdcfe' }}>{result}</span><span> = </span><span style={{ color: '#9cdcfe' }}>{binMatch[1]}</span><span style={{ color: OP_COLORS.binary }}> {binMatch[2]} </span><span style={{ color: '#9cdcfe' }}>{binMatch[3]}</span></span>;
    }
    return <span><span style={{ color: '#9cdcfe' }}>{result}</span><span> = </span><span style={{ color: '#ce9178' }}>{expr}</span></span>;
  }
  return <span style={{ color: '#d4d4d4' }}>{instr}</span>;
}

function formatInstructionColored(instr: TacInstruction): React.ReactNode {
  switch (instr.op) {
    case 'assign':
      return <span><span style={{ color: '#9cdcfe' }}>{instr.result}</span><span> = </span><span style={{ color: '#ce9178' }}>{instr.arg1}</span></span>;
    case 'binary':
      return <span><span style={{ color: '#9cdcfe' }}>{instr.result}</span><span> = </span><span style={{ color: '#9cdcfe' }}>{instr.arg1}</span><span style={{ color: '#dcdcaa' }}> {instr.operator} </span><span style={{ color: '#9cdcfe' }}>{instr.arg2}</span></span>;
    case 'neg':
      return <span><span style={{ color: '#9cdcfe' }}>{instr.result}</span><span> = </span><span style={{ color: '#dcdcaa' }}>{instr.operator}</span><span style={{ color: '#9cdcfe' }}>{instr.arg1}</span></span>;
    case 'ldc':
      return <span><span style={{ color: '#9cdcfe' }}>{instr.result}</span><span> = </span><span style={{ color: '#ce9178' }}>ldc</span><span> </span><span style={{ color: '#ce9178' }}>{instr.arg1}</span></span>;
    case 'getstatic':
      return <span><span style={{ color: '#9cdcfe' }}>{instr.result}</span><span> = </span><span style={{ color: '#4ec9b0' }}>getstatic</span><span> </span><span style={{ color: '#9cdcfe' }}>{instr.arg1}</span><span> : </span><span style={{ color: '#4ec9b0' }}>{instr.arg2}</span></span>;
    case 'invokevirtual':
      return <span>{instr.result && <><span style={{ color: '#9cdcfe' }}>{instr.result}</span><span> = </span></>}<span style={{ color: '#4ec9b0' }}>invokevirtual</span><span> </span><span style={{ color: '#dcdcaa' }}>{instr.arg1}</span><span>(</span><span style={{ color: '#ce9178' }}>{instr.arg2}</span><span>)</span></span>;
    case 'if':
      return <span><span style={{ color: '#c586c0' }}>if</span><span> </span><span style={{ color: '#9cdcfe' }}>{instr.arg1}</span><span style={{ color: '#c586c0' }}> goto </span><span style={{ color: '#6a9955' }}>{instr.target}</span></span>;
    case 'iffalse':
      return <span><span style={{ color: '#c586c0' }}>iffalse</span><span> </span><span style={{ color: '#9cdcfe' }}>{instr.arg1}</span><span style={{ color: '#c586c0' }}> goto </span><span style={{ color: '#6a9955' }}>{instr.target}</span></span>;
    case 'goto':
      return <span><span style={{ color: '#c586c0' }}>goto </span><span style={{ color: '#6a9955' }}>{instr.target}</span></span>;
    case 'return':
      return <span><span style={{ color: '#c586c0' }}>return</span>{instr.arg1 && <span> <span style={{ color: '#9cdcfe' }}>{instr.arg1}</span></span>}</span>;
    case 'label':
      return <span style={{ color: '#6a9955', fontWeight: 'bold' }}>{instr.result}:</span>;
    case 'method_start':
      return <span style={{ color: '#dcdcaa' }}>{instr.result}({instr.arg1}) {'{'}</span>;
    default:
      return <span style={{ color: '#d4d4d4' }}>{formatInstruction(instr)}</span>;
  }
}

export default ExpressionDecomposition;
