import React from 'react';
import type { CodeGenerationData, TacInstruction } from '../../types';

interface Props {
  data: CodeGenerationData;
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
  method_start: '#dcdcaa',
  method_end: '#dcdcaa',
};

function formatInstruction(instr: TacInstruction): string {
  switch (instr.op) {
    case 'assign': return `${instr.result} = ${instr.arg1}`;
    case 'binary': return `${instr.result} = ${instr.arg1} ${instr.operator} ${instr.arg2}`;
    case 'neg': return `${instr.result} = ${instr.operator}${instr.arg1}`;
    case 'ldc': return `${instr.result} = ldc ${instr.arg1}`;
    case 'getstatic': return `${instr.result} = getstatic ${instr.arg1} : ${instr.arg2}`;
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

const TacCodeViewer: React.FC<Props> = ({ data }) => {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-3">
        <h3 className="text-sm font-bold text-[var(--color-text)] font-display tracking-[0.1em] uppercase">
          Three-Address Code
        </h3>
        <p className="text-xs text-[var(--color-text-muted)] font-mono mt-1">
          {data.packageName ? `${data.packageName}.` : ''}{data.className}
          {' '}- {data.totalInstructions} instructions, {data.totalBlocks} blocks
        </p>
      </div>

      {/* Code viewer */}
      <div className="flex-1 min-h-0 overflow-auto border border-[var(--color-border)] bg-[var(--color-void)]">
        <pre className="p-4 text-xs font-mono leading-relaxed m-0">
          {data.instructions.map((instr, idx) => (
            <div
              key={idx}
              className="flex hover:bg-[rgba(0,255,136,0.03)]"
            >
              {/* Line number */}
              <span className="w-8 text-right pr-3 text-[var(--color-text-muted)] select-none shrink-0">
                {instr.line}
              </span>

              {/* Instruction */}
              <span className="flex-1">
                {instr.op === 'label' ? (
                  <span style={{ color: OP_COLORS.label, fontWeight: 'bold' }}>
                    {instr.result}:
                  </span>
                ) : instr.op === 'method_start' ? (
                  <span style={{ color: OP_COLORS.method_start }}>
                    {instr.result}({instr.arg1}) {'{'}
                  </span>
                ) : instr.op === 'method_end' ? (
                  <span style={{ color: OP_COLORS.method_end }}>{'}'}</span>
                ) : (
                  <InstructionHighlight instr={instr} />
                )}
              </span>

              {/* Source comment */}
              {instr.comment && (
                <span className="text-[var(--color-text-muted)] ml-4">
                  {instr.comment}
                </span>
              )}
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
};

const InstructionHighlight: React.FC<{ instr: TacInstruction }> = ({ instr }) => {
  const color = OP_COLORS[instr.op] || '#d4d4d4';

  switch (instr.op) {
    case 'assign':
      return (
        <span>
          <span style={{ color: '#9cdcfe' }}>{instr.result}</span>
          <span style={{ color: '#d4d4d4' }}> = </span>
          <span style={{ color: '#ce9178' }}>{instr.arg1}</span>
        </span>
      );
    case 'binary':
      return (
        <span>
          <span style={{ color: '#9cdcfe' }}>{instr.result}</span>
          <span style={{ color: '#d4d4d4' }}> = </span>
          <span style={{ color: '#9cdcfe' }}>{instr.arg1}</span>
          <span style={{ color }}> {instr.operator} </span>
          <span style={{ color: '#9cdcfe' }}>{instr.arg2}</span>
        </span>
      );
    case 'neg':
      return (
        <span>
          <span style={{ color: '#9cdcfe' }}>{instr.result}</span>
          <span style={{ color: '#d4d4d4' }}> = </span>
          <span style={{ color }}>{instr.operator}</span>
          <span style={{ color: '#9cdcfe' }}>{instr.arg1}</span>
        </span>
      );
    case 'ldc':
      return (
        <span>
          <span style={{ color: '#9cdcfe' }}>{instr.result}</span>
          <span style={{ color: '#d4d4d4' }}> = </span>
          <span style={{ color }}>ldc </span>
          <span style={{ color: '#ce9178' }}>{instr.arg1}</span>
        </span>
      );
    case 'getstatic':
      return (
        <span>
          <span style={{ color: '#9cdcfe' }}>{instr.result}</span>
          <span style={{ color: '#d4d4d4' }}> = </span>
          <span style={{ color }}>getstatic </span>
          <span style={{ color: '#9cdcfe' }}>{instr.arg1}</span>
          <span style={{ color: '#d4d4d4' }}> : </span>
          <span style={{ color: '#4ec9b0' }}>{instr.arg2}</span>
        </span>
      );
    case 'invokevirtual':
      return (
        <span>
          {instr.result && (
            <>
              <span style={{ color: '#9cdcfe' }}>{instr.result}</span>
              <span style={{ color: '#d4d4d4' }}> = </span>
            </>
          )}
          <span style={{ color }}>invokevirtual </span>
          <span style={{ color: '#dcdcaa' }}>{instr.arg1}</span>
          <span style={{ color: '#d4d4d4' }}>(</span>
          <span style={{ color: '#ce9178' }}>{instr.arg2}</span>
          <span style={{ color: '#d4d4d4' }}>)</span>
        </span>
      );
    case 'if':
      return (
        <span>
          <span style={{ color }}>if </span>
          <span style={{ color: '#9cdcfe' }}>{instr.arg1}</span>
          <span style={{ color }}> goto </span>
          <span style={{ color: '#6a9955' }}>{instr.target}</span>
        </span>
      );
    case 'iffalse':
      return (
        <span>
          <span style={{ color }}>iffalse </span>
          <span style={{ color: '#9cdcfe' }}>{instr.arg1}</span>
          <span style={{ color }}> goto </span>
          <span style={{ color: '#6a9955' }}>{instr.target}</span>
        </span>
      );
    case 'goto':
      return (
        <span>
          <span style={{ color }}>goto </span>
          <span style={{ color: '#6a9955' }}>{instr.target}</span>
        </span>
      );
    case 'return':
      return (
        <span>
          <span style={{ color }}>return</span>
          {instr.arg1 && (
            <>
              <span style={{ color: '#d4d4d4' }}> </span>
              <span style={{ color: '#9cdcfe' }}>{instr.arg1}</span>
            </>
          )}
        </span>
      );
    default:
      return <span style={{ color: '#d4d4d4' }}>{formatInstruction(instr)}</span>;
  }
};

export default TacCodeViewer;
