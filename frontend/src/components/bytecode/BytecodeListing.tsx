import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FileCode } from 'lucide-react';
import type { BytecodeClass } from '../../lib/cfg/bytecodeParser';
import { getOpcodeDetails } from '../../lib/cfg/bytecodeParser';
import PeepholePatternCard from './PeepholePatternCard';

interface BytecodeListingProps {
  bytecode: BytecodeClass;
  isPlaying: boolean;
  isCompleted: boolean;
  isIdle?: boolean;
}

const BytecodeListing: React.FC<BytecodeListingProps> = ({ bytecode, isPlaying, isCompleted }) => {
  const { t } = useTranslation();
  const [visibleMethods, setVisibleMethods] = useState<Set<number>>(new Set());
  const [hoveredInstr, setHoveredInstr] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isPlaying) {
      if (isCompleted) {
        setVisibleMethods(new Set(bytecode.methods.map((_, i) => i)));
      } else {
        setVisibleMethods(new Set());
      }
      return;
    }
    setVisibleMethods(new Set());
    let i = 0;
    const show = () => {
      if (i >= bytecode.methods.length) return;
      setVisibleMethods(prev => new Set([...prev, i]));
      i++;
      timerRef.current = setTimeout(show, 400);
    };
    timerRef.current = setTimeout(show, 200);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isPlaying, isCompleted, bytecode]);

  const getOpcodeColor = (opcode: string): string => {
    if (opcode.startsWith('if') || opcode === 'goto') return '#FF3366';
    if (opcode.startsWith('invoke') || opcode === 'invokespecial') return '#FFB000';
    if (opcode.startsWith('load') || opcode.includes('load')) return '#00D4FF';
    if (opcode.startsWith('store') || opcode.includes('store')) return '#00FF88';
    if (opcode.startsWith('const') || opcode === 'bipush' || opcode === 'sipush' || opcode === 'ldc') return '#8A2BE2';
    if (opcode === 'return' || opcode === 'ireturn' || opcode === 'areturn') return '#FF00FF';
    if (opcode === 'pop' || opcode === 'dup' || opcode === 'swap') return '#FFB000';
    return '#E0E0F0';
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 px-1">
        <FileCode size={14} className="text-[var(--color-neon)]" />
        <h4 className="text-[11px] font-bold text-[var(--color-text)] font-display tracking-[0.1em] uppercase m-0">
          {t('bytecode.pipeline.listing.title', 'Bytecode Listing')}
        </h4>
        <span className="text-[9px] text-[var(--color-text-muted)] font-mono">
          ({bytecode.methods.length} methods, {bytecode.className})
        </span>
      </div>
      <p className="text-[10px] text-[var(--color-text-dim)] font-mono px-1 -mt-1">
        {t('bytecode.pipeline.listing.description', 'Parsed javap output showing class structure, constant pool, and method bytecode instructions with opcode descriptions.')}
      </p>

      {/* Class info */}
      <div className="bg-[var(--color-card)] border border-[var(--color-border)] p-3">
        <div className="text-[9px] text-[var(--color-neon)] font-bold font-display tracking-[0.1em] uppercase mb-2">
          Class: {bytecode.className}
        </div>
        {bytecode.constantPool.length > 0 && (
          <div className="text-[9px] font-mono text-[var(--color-text-muted)] mb-1">
            Constant Pool: {bytecode.constantPool.length} entries
          </div>
        )}
      </div>

      {/* Methods */}
      {bytecode.methods.map((method, mi) => {
        const visible = visibleMethods.has(mi);
        return (
          <div
            key={mi}
            className={`bg-[var(--color-card)] border border-[var(--color-border)] transition-all duration-300 ${
              visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
            }`}
          >
            <div className="px-3 py-2 border-b border-[var(--color-border)] flex items-center gap-2">
              <span className="text-[9px] text-[#FFB000] font-bold font-display uppercase">{method.access}</span>
              <span className="text-[10px] text-[var(--color-text)] font-mono font-bold">{method.name}</span>
              <span className="text-[8px] text-[var(--color-text-muted)] font-mono">
                max_stack={method.maxStack}, max_locals={method.maxLocals}
              </span>
            </div>
            <div className="p-2">
              {method.instructions.map((instr, ii) => (
                <div
                  key={ii}
                  className={`flex items-center gap-3 text-[10px] font-mono py-0.5 px-2 transition-colors ${
                    hoveredInstr === ii ? 'bg-[rgba(0,255,136,0.06)]' : ''
                  }`}
                  onMouseEnter={() => setHoveredInstr(ii)}
                  onMouseLeave={() => setHoveredInstr(null)}
                >
                  <span className="text-[var(--color-text-muted)] w-8 text-right shrink-0 text-[9px] sm:text-[10px]">{instr.offset}:</span>
                  <span className="w-20 sm:w-28 shrink-0 text-[9px] sm:text-[10px]" style={{ color: getOpcodeColor(instr.opcode) }}>
                    {instr.opcode}
                  </span>
                  <span className="text-[var(--color-text-dim)] break-all text-[9px] sm:text-[10px]">{instr.operands}</span>
                  {hoveredInstr === ii && (
                    <span className="hidden lg:ml-auto lg:flex flex-col items-end gap-0.5 text-[8px] font-mono min-w-[180px] xl:min-w-[220px]">
                      <span className="text-[var(--color-text)]">
                        {getOpcodeDetails(instr.opcode).description}
                      </span>
                      <span className="text-[#FFB000]">
                        {getOpcodeDetails(instr.opcode).category}
                      </span>
                      <span className="text-[var(--color-text-dim)] italic leading-snug text-right">
                        {getOpcodeDetails(instr.opcode).pattern}
                      </span>
                      <span className="text-[var(--color-text-muted)]">
                        selection cost: {getOpcodeDetails(instr.opcode).cost}
                        {getOpcodeDetails(instr.opcode).example && ` · e.g. ${getOpcodeDetails(instr.opcode).example}`}
                      </span>
                    </span>
                  )}
                </div>
              ))}
              {method.instructions.length === 0 && (
                <div className="text-[9px] text-[var(--color-text-muted)] font-mono px-2 py-1">
                  (no instructions)
                </div>
              )}
              <PeepholePatternCard patterns={method.patterns ?? []} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default BytecodeListing;
