import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { CodeGenerationData, TacInstruction } from '../../types';

interface Props {
  data: CodeGenerationData;
  isPlaying: boolean;
  isCompleted: boolean;
}

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
      return `${instr.result ? instr.result + ' = ' : ''}${instr.arg1}(${instr.arg2})`;
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
    case 'method_start':
      return `${instr.result}(${instr.arg1}) {`;
    case 'method_end':
      return '}';
    default:
      return `${instr.op} ${instr.arg1 || ''}`.trim();
  }
}

const TacDisplay: React.FC<Props> = ({ data, isPlaying, isCompleted }) => {
  const { t } = useTranslation();
  const [revealCount, setRevealCount] = useState(0);

  // Filter out method_end for cleaner display
  const displayInstructions = data.instructions.filter(i => i.op !== 'method_end');

  useEffect(() => {
    if (!isPlaying) {
      setRevealCount(isCompleted ? Number.MAX_SAFE_INTEGER : 0);
      return;
    }
    setRevealCount(0);
    const interval = setInterval(() => {
      setRevealCount(prev => prev + 1);
    }, 150);
    return () => clearInterval(interval);
  }, [isPlaying, isCompleted]);

  const visibleCount = isPlaying ? revealCount : (isCompleted ? displayInstructions.length : 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-[var(--color-card)] border border-[var(--color-border)] p-4"
    >
      <div className="mb-3">
        <h3 className="text-sm font-bold text-[var(--color-text)] font-display tracking-[0.1em] uppercase">
          {t('codegen.step2.title')}
        </h3>
        <p className="text-xs text-[var(--color-text-muted)] font-mono mt-1">
          {t('codegen.step2.description')}
        </p>
      </div>

      {/* Instruction count */}
      <div className="mb-3 flex items-center gap-3 text-[10px] font-mono text-[var(--color-text-muted)]">
        <span>{data.totalInstructions} instructions</span>
        <span className="text-[var(--color-border)]">|</span>
        <span>{data.className}</span>
      </div>

      {/* Instructions table */}
      <div className="border border-[var(--color-border)] bg-[var(--color-void)] overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[40px_60px_1fr_1fr] gap-2 px-3 py-1.5 bg-[rgba(0,255,136,0.03)] border-b border-[var(--color-border)] text-[9px] font-bold text-[var(--color-text-muted)] font-display tracking-wider uppercase">
          <span>Line</span>
          <span>Type</span>
          <span>Instruction</span>
          <span>Source</span>
        </div>

        {/* Rows */}
        <div className="max-h-[400px] overflow-y-auto">
          {displayInstructions.slice(0, visibleCount).map((instr, idx) => {
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
                <span className="text-[var(--color-text-muted)] text-[10px]">
                  {instr.line}
                </span>
                <span>
                  <span
                    className="text-[9px] font-bold font-display px-1.5 py-0.5 tracking-wider"
                    style={{
                      color: badge.color,
                      backgroundColor: `${badge.color}15`,
                      border: `1px solid ${badge.color}30`,
                    }}
                  >
                    {badge.label}
                  </span>
                </span>
                <span className="text-[var(--color-text)]">
                  {formatInstructionColored(instr)}
                </span>
                <span className="text-[var(--color-text-muted)] text-[10px] truncate">
                  {instr.sourceLine >= 0 ? `L${instr.sourceLine + 1}` : ''}
                  {instr.comment ? ` ${instr.comment}` : ''}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

function formatInstructionColored(instr: TacInstruction): React.ReactNode {
  switch (instr.op) {
    case 'assign':
      return (
        <span>
          <span style={{ color: '#9cdcfe' }}>{instr.result}</span>
          <span> = </span>
          <span style={{ color: '#ce9178' }}>{instr.arg1}</span>
        </span>
      );
    case 'binary':
      return (
        <span>
          <span style={{ color: '#9cdcfe' }}>{instr.result}</span>
          <span> = </span>
          <span style={{ color: '#9cdcfe' }}>{instr.arg1}</span>
          <span style={{ color: '#dcdcaa' }}> {instr.operator} </span>
          <span style={{ color: '#9cdcfe' }}>{instr.arg2}</span>
        </span>
      );
    case 'neg':
      return (
        <span>
          <span style={{ color: '#9cdcfe' }}>{instr.result}</span>
          <span> = </span>
          <span style={{ color: '#dcdcaa' }}>{instr.operator}</span>
          <span style={{ color: '#9cdcfe' }}>{instr.arg1}</span>
        </span>
      );
    case 'ldc':
      return (
        <span>
          <span style={{ color: '#9cdcfe' }}>{instr.result}</span>
          <span> = </span>
          <span style={{ color: '#ce9178' }}>ldc</span>
          <span> </span>
          <span style={{ color: '#ce9178' }}>{instr.arg1}</span>
        </span>
      );
    case 'getstatic':
      return (
        <span>
          <span style={{ color: '#9cdcfe' }}>{instr.result}</span>
          <span> = </span>
          <span style={{ color: '#4ec9b0' }}>getstatic</span>
          <span> </span>
          <span style={{ color: '#9cdcfe' }}>{instr.arg1}</span>
          <span> : </span>
          <span style={{ color: '#4ec9b0' }}>{instr.arg2}</span>
        </span>
      );
    case 'invokevirtual':
      return (
        <span>
          {instr.result && <><span style={{ color: '#9cdcfe' }}>{instr.result}</span><span> = </span></>}
          <span style={{ color: '#4ec9b0' }}>invokevirtual</span>
          <span> </span>
          <span style={{ color: '#dcdcaa' }}>{instr.arg1}</span>
          <span>(</span>
          <span style={{ color: '#ce9178' }}>{instr.arg2}</span>
          <span>)</span>
        </span>
      );
    case 'if':
      return (
        <span>
          <span style={{ color: '#c586c0' }}>if</span>
          <span> </span>
          <span style={{ color: '#9cdcfe' }}>{instr.arg1}</span>
          <span style={{ color: '#c586c0' }}> goto </span>
          <span style={{ color: '#6a9955' }}>{instr.target}</span>
        </span>
      );
    case 'iffalse':
      return (
        <span>
          <span style={{ color: '#c586c0' }}>iffalse</span>
          <span> </span>
          <span style={{ color: '#9cdcfe' }}>{instr.arg1}</span>
          <span style={{ color: '#c586c0' }}> goto </span>
          <span style={{ color: '#6a9955' }}>{instr.target}</span>
        </span>
      );
    case 'goto':
      return (
        <span>
          <span style={{ color: '#c586c0' }}>goto </span>
          <span style={{ color: '#6a9955' }}>{instr.target}</span>
        </span>
      );
    case 'return':
      return (
        <span>
          <span style={{ color: '#c586c0' }}>return</span>
          {instr.arg1 && <span> <span style={{ color: '#9cdcfe' }}>{instr.arg1}</span></span>}
        </span>
      );
    case 'label':
      return (
        <span style={{ color: '#6a9955', fontWeight: 'bold' }}>
          {instr.result}:
        </span>
      );
    case 'method_start':
      return (
        <span style={{ color: '#dcdcaa' }}>
          {instr.result}({instr.arg1}) {'{'}
        </span>
      );
    default:
      return <span style={{ color: '#d4d4d4' }}>{formatInstruction(instr)}</span>;
  }
}

export default TacDisplay;
