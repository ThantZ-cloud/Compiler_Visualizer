import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { CodeGenerationData, TacInstruction, BasicBlockInfo } from '../../types';

interface Props {
  data: CodeGenerationData;
  isPlaying: boolean;
  isCompleted: boolean;
}

const BLOCK_COLORS: Record<string, string> = {
  entry: '#4ec9b0',
  exit: '#f44747',
  branch: '#c586c0',
  loop: '#dcdcaa',
  merge: '#569cd6',
  normal: '#6a9955',
};

function formatInstruction(instr: TacInstruction): string {
  switch (instr.op) {
    case 'assign': return `${instr.result} = ${instr.arg1}`;
    case 'binary': return `${instr.result} = ${instr.arg1} ${instr.operator} ${instr.arg2}`;
    case 'neg': return `${instr.result} = ${instr.operator}${instr.arg1}`;
    case 'ldc': return `${instr.result} = ldc ${instr.arg1}`;
    case 'getstatic': return `${instr.result} = getstatic ${instr.arg1}`;
    case 'invokevirtual': return `${instr.result ? instr.result + ' = ' : ''}invokevirtual ${instr.arg1}(${instr.arg2})`;
    case 'if': return `if ${instr.arg1} goto ${instr.target}`;
    case 'iffalse': return `iffalse ${instr.arg1} goto ${instr.target}`;
    case 'goto': return `goto ${instr.target}`;
    case 'return': return `return${instr.arg1 ? ' ' + instr.arg1 : ''}`;
    case 'label': return `${instr.result}:`;
    case 'method_start': return `${instr.result}(${instr.arg1}) {`;
    case 'method_end': return '}';
    default: return `${instr.op} ${instr.arg1 || ''}`.trim();
  }
}

const BasicBlockBuilder: React.FC<Props> = ({ data, isPlaying }) => {
  const { t } = useTranslation();
  const [revealCount, setRevealCount] = useState(0);

  useEffect(() => {
    if (!isPlaying) {
      setRevealCount(Number.MAX_SAFE_INTEGER);
      return;
    }
    setRevealCount(0);
    const interval = setInterval(() => {
      setRevealCount(prev => prev + 1);
    }, 600);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const visibleCount = isPlaying ? revealCount : data.basicBlocks.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-[var(--color-card)] border border-[var(--color-border)] p-4"
    >
      <div className="mb-3">
        <h3 className="text-sm font-bold text-[var(--color-text)] font-display tracking-[0.1em] uppercase">
          {t('codegen.step3.title')}
        </h3>
        <p className="text-xs text-[var(--color-text-muted)] font-mono mt-1">
          {t('codegen.step3.description')}
        </p>
      </div>

      {/* Summary */}
      <div className="mb-3 flex items-center gap-3 text-[10px] font-mono text-[var(--color-text-muted)]">
        <span>{data.totalBlocks} blocks</span>
        <span className="text-[var(--color-border)]">|</span>
        <span>{data.totalInstructions} instructions</span>
      </div>

      {/* Block legend */}
      <div className="mb-3 flex flex-wrap gap-2">
        {Object.entries(BLOCK_COLORS).filter(([k]) => k !== 'normal').map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5" style={{ backgroundColor: color }} />
            <span className="text-[9px] font-mono text-[var(--color-text-muted)] uppercase">{type}</span>
          </div>
        ))}
      </div>

      {/* Blocks */}
      <div className="space-y-2">
        <AnimatePresence>
          {data.basicBlocks.slice(0, visibleCount).map((block) => (
            <BlockCard
              key={block.id}
              block={block}
              instructions={data.instructions}
            />
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

const BlockCard: React.FC<{ block: BasicBlockInfo; instructions: TacInstruction[] }> = ({ block, instructions }) => {
  const color = BLOCK_COLORS[block.type] || BLOCK_COLORS.normal;
  const blockInstrs = block.instructions
    .map(idx => instructions[idx])
    .filter(i => i && i.op !== 'method_start' && i.op !== 'method_end');

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="border bg-[var(--color-void)] overflow-hidden"
      style={{ borderColor: `${color}40` }}
    >
      {/* Block header */}
      <div
        className="flex items-center justify-between px-3 py-1.5"
        style={{ backgroundColor: `${color}10`, borderBottom: `1px solid ${color}30` }}
      >
        <div className="flex items-center gap-2">
          <span
            className="text-[9px] font-bold font-display px-1.5 py-0.5 tracking-wider uppercase"
            style={{ color, border: `1px solid ${color}40` }}
          >
            B{block.id}
          </span>
          {block.label && (
            <span className="text-[10px] font-mono" style={{ color }}>
              {block.label}:
            </span>
          )}
          <span
            className="text-[9px] font-mono uppercase"
            style={{ color: `${color}90` }}
          >
            {block.type}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {block.edges.map((edge, i) => (
            <span
              key={i}
              className="text-[8px] font-mono px-1 py-0.5"
              style={{
                color: edge.kind.includes('true') ? '#4ec9b0' :
                       edge.kind.includes('false') ? '#f44747' :
                       edge.kind === 'loop_back' ? '#dcdcaa' : '#569cd6',
                backgroundColor: 'rgba(255,255,255,0.03)',
              }}
            >
              {edge.kind === 'fallthrough' ? '->B' + edge.targetBlockId :
               edge.kind === 'loop_back' ? '<-B' + edge.targetBlockId :
               edge.kind.includes('true') ? 'T->B' + edge.targetBlockId :
               'F->B' + edge.targetBlockId}
            </span>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="px-3 py-2 space-y-0.5">
        {blockInstrs.map((instr, i) => (
          <div key={i} className="flex items-center gap-2 text-[11px] font-mono">
            <span className="text-[var(--color-text-muted)] text-[9px] w-4 text-right">
              {instr.line}
            </span>
            <span className="text-[var(--color-text)]">
              {formatInstruction(instr)}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default BasicBlockBuilder;
