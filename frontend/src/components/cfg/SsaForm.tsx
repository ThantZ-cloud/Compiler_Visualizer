import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { CfgMethod, TacInstruction } from '../../types';
import type { SsaResult, PhiFunction, VarDefinition } from '../../lib/cfg/ssa';
import { Binary } from 'lucide-react';

interface SsaFormProps {
  method: CfgMethod;
  ssa: SsaResult;
  instructions: TacInstruction[];
  isPlaying: boolean;
  isCompleted: boolean;
}

const SsaForm: React.FC<SsaFormProps> = ({ method, ssa, instructions, isPlaying, isCompleted }) => {
  const { t } = useTranslation();
  const [visiblePhis, setVisiblePhis] = useState<Set<number>>(new Set());
  const [visibleRenames, setVisibleRenames] = useState<Set<number>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isPlaying) {
      if (isCompleted) {
        setVisiblePhis(new Set(ssa.phiFunctions.map((_, i) => i)));
        setVisibleRenames(new Set(ssa.varDefs.map((_, i) => i)));
      } else {
        setVisiblePhis(new Set());
        setVisibleRenames(new Set());
      }
      return;
    }
    setVisiblePhis(new Set());
    setVisibleRenames(new Set());

    // First: animate phi-functions appearing
    let phiIdx = 0;
    const showPhi = () => {
      if (phiIdx >= ssa.phiFunctions.length) {
        // Then: animate renames
        let renameIdx = 0;
        const showRename = () => {
          if (renameIdx >= ssa.varDefs.length) return;
          setVisibleRenames(prev => new Set([...prev, renameIdx]));
          renameIdx++;
          timerRef.current = setTimeout(showRename, 120);
        };
        timerRef.current = setTimeout(showRename, 400);
        return;
      }
      setVisiblePhis(prev => new Set([...prev, phiIdx]));
      phiIdx++;
      timerRef.current = setTimeout(showPhi, 200);
    };
    timerRef.current = setTimeout(showPhi, 200);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isPlaying, isCompleted, ssa]);

  // Build a map from block id → instructions in that block
  const blockInstrs = new Map<number, TacInstruction[]>();
  for (const block of method.blocks) {
    // Match by checking if the instruction line falls within the block's statement range
    blockInstrs.set(block.id, instructions.filter(i => {
      return block.statements.some(s => s.includes(`${i.result || ''} =`) || s.includes(i.op));
    }));
  }

  // Build phi lookup: blockId → phi functions
  const phisByBlock = new Map<number, PhiFunction[]>();
  for (const phi of ssa.phiFunctions) {
    if (!phisByBlock.has(phi.blockId)) phisByBlock.set(phi.blockId, []);
    phisByBlock.get(phi.blockId)!.push(phi);
  }

  // Build rename lookup: instrIndex → renamed version
  const renameMap = new Map<number, VarDefinition>();
  for (const def of ssa.varDefs) {
    renameMap.set(def.instrIndex, def);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 px-1">
        <Binary size={14} className="text-[var(--color-cyan)]" />
        <h4 className="text-[11px] font-bold text-[var(--color-text)] font-display tracking-[0.1em] uppercase m-0">
          {t('optimizer.step3.title', 'SSA Form')}
        </h4>
        <span className="text-[9px] text-[var(--color-text-muted)] font-mono">
          ({ssa.phiFunctions.length} φ-functions, {ssa.varDefs.length} renames)
        </span>
      </div>
      <p className="text-[10px] text-[var(--color-text-dim)] font-mono px-1 -mt-1">
        {t('optimizer.step3.description', 'In Static Single Assignment form, every variable is assigned exactly once. φ-functions merge values at control-flow join points, and each definition gets a unique subscript.')}
      </p>

      {/* Phi-functions table */}
      {ssa.phiFunctions.length > 0 && (
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] p-3">
          <div className="text-[9px] text-[#00D4FF] font-bold font-display tracking-[0.1em] uppercase mb-2">
            φ-Function Insertion
          </div>
          <div className="flex flex-col gap-1.5">
            {[...phisByBlock.entries()].map(([blockId, phis]) => (
              <div key={blockId} className="flex flex-col gap-1">
                {phis.map((phi, pi) => {
                  const globalIdx = ssa.phiFunctions.indexOf(phi);
                  const visible = visiblePhis.has(globalIdx);
                  return (
                    <div
                      key={pi}
                      className={`flex items-center gap-2 text-[10px] font-mono transition-all duration-300 ${
                        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
                      }`}
                    >
                      <span className="text-[var(--color-text-muted)] w-[44px] shrink-0">B{blockId}:</span>
                      <span className="text-[var(--color-cyan)]">{phi.variable}₁ = φ(</span>
                      <span className="text-[var(--color-text-dim)]">
                        {phi.args.map(a => `${a.varName}@B${a.blockId}`).join(', ')}
                      </span>
                      <span className="text-[var(--color-cyan)]">)</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Renamed instructions */}
      <div className="bg-[var(--color-card)] border border-[var(--color-border)] p-3">
        <div className="text-[9px] text-[var(--color-neon)] font-bold font-display tracking-[0.1em] uppercase mb-2">
          Variable Renaming
        </div>
        <div className="flex flex-col gap-0.5 max-h-[300px] overflow-y-auto">
          {instructions.map((instr, i) => {
            const rename = renameMap.get(instr.line);
            const visible = visibleRenames.has(i);
            // Build the display line
            const result = rename ? rename.renamedTo : instr.result || '';
            const arg1 = instr.arg1 || '';
            const op = instr.operator || '';
            const arg2 = instr.arg2 || '';
            const target = instr.target || '';

            let display: string;
            if (instr.op === 'label') {
              display = `${instr.target || ''}:`;
            } else if (instr.op === 'goto' || instr.op === 'if' || instr.op === 'iffalse') {
              display = `${instr.op === 'iffalse' ? 'ifFalse' : instr.op} ${arg1} ${op} ${arg2} goto ${target}`;
            } else if (instr.op === 'return') {
              display = `return ${arg1}`;
            } else if (instr.op === 'method_start' || instr.op === 'method_end') {
              display = `// ${instr.op}`;
            } else if (instr.result) {
              display = `${result} = ${arg1} ${op} ${arg2}`.trim();
            } else {
              display = `${instr.op} ${arg1} ${op} ${arg2}`.trim();
            }

            return (
              <div
                key={instr.line}
                className={`flex items-center gap-2 text-[10px] font-mono transition-all duration-200 ${
                  visible ? 'opacity-100' : 'opacity-0'
                } ${rename ? 'bg-[rgba(0,212,255,0.05)]' : ''}`}
              >
                <span className="text-[var(--color-text-muted)] w-6 text-right shrink-0">{instr.line}:</span>
                <span className={rename ? 'text-[var(--color-cyan)]' : 'text-[var(--color-text-dim)]'}>
                  {display}
                </span>
                {rename && (
                  <span className="text-[8px] text-[#FFB000] ml-auto shrink-0">
                    {rename.variable} → {rename.renamedTo}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SsaForm;
