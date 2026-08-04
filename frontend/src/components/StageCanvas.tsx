import React, { useMemo, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ScanSearch } from 'lucide-react';
import { useCompile } from '../context/CompileContext';
import { useStepper } from '../context/StepperContext';
import AstCanvas from './AstCanvas';
import { getTokenColor } from '../lib/colors';
import {
  getLexerItems,
  getSemanticItems,
  getIrItems,
  getCodegenItems,
} from '../lib/buildSteps';

/**
 * Right-hand visualizer canvas for the Studio. Shows the rich interactive AST
 * by default / during the parser stage, and a clean "reveal" view for the
 * other stages that unfurls items in lock-step with the playback engine.
 */
const StageCanvas: React.FC = () => {
  const { t } = useTranslation();
  const { result } = useCompile();
  const { currentStage, revealedCountForStage, hasSteps } = useStepper();

  // No compile yet — friendly empty state on the dot grid.
  if (!result) {
    return (
      <div className="dot-grid flex h-full w-full flex-col items-center justify-center gap-3 p-8 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-neon)]/10 text-[var(--color-neon)]">
          <ScanSearch size={24} />
        </span>
        <p className="text-sm font-medium text-[var(--color-text)]">{t('studio.emptyCanvas')}</p>
        <p className="max-w-xs text-[13px] text-[var(--color-text-muted)]">{t('studio.runHint')}</p>
      </div>
    );
  }

  // Parser stage (or the resting default) shows the interactive AST.
  if (!hasSteps || currentStage === null || currentStage === 'parser') {
    return <AstCanvas />;
  }

  return <RevealCanvas stage={currentStage} revealedCountForStage={revealedCountForStage} />;
};

interface RevealCanvasProps {
  stage: 'lexer' | 'semantic' | 'ir' | 'codegen';
  revealedCountForStage: (s: 'lexer' | 'parser' | 'semantic' | 'ir' | 'codegen') => number;
}

const RevealCanvas: React.FC<RevealCanvasProps> = ({ stage, revealedCountForStage }) => {
  const { result } = useCompile();
  const scrollRef = useRef<HTMLDivElement>(null);

  const revealed = revealedCountForStage(stage);

  const lexerItems = useMemo(() => (result && stage === 'lexer' ? getLexerItems(result) : []), [result, stage]);
  const semanticItems = useMemo(() => (result && stage === 'semantic' ? getSemanticItems(result) : []), [result, stage]);
  const irItems = useMemo(() => (result && stage === 'ir' ? getIrItems(result) : []), [result, stage]);
  const codegenItems = useMemo(() => (result && stage === 'codegen' ? getCodegenItems(result) : []), [result, stage]);

  // Keep the newest revealed item in view.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [revealed, stage]);

  return (
    <div className="dot-grid h-full w-full overflow-hidden p-5">
      <div ref={scrollRef} className="h-full overflow-auto pb-28">
        {stage === 'lexer' && (
          <div className="flex flex-wrap content-start gap-2">
            {lexerItems.slice(0, revealed).map((tok, i) => {
              const isLatest = i === revealed - 1;
              const color = getTokenColor(tok.type);
              return (
                <span
                  key={i}
                  className="rounded-lg border bg-[var(--color-card)] px-2.5 py-1 font-mono text-[12.5px] transition-all"
                  style={{
                    borderColor: isLatest ? 'var(--color-cyan)' : 'var(--color-border)',
                    color,
                    boxShadow: isLatest ? '0 0 0 2px var(--color-cyan-dim)' : 'var(--shadow-card)',
                    fontWeight: isLatest ? 600 : 500,
                  }}
                  title={tok.type}
                >
                  {tok.value}
                </span>
              );
            })}
          </div>
        )}

        {stage === 'semantic' && (
          <div className="flex flex-col gap-2">
            {semanticItems.slice(0, revealed).map((item, i) => {
              const isLatest = i === revealed - 1;
              return (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-[10px] border bg-[var(--color-card)] px-3 py-2 transition-all"
                  style={{
                    borderColor: isLatest ? 'var(--color-cyan)' : 'var(--color-border)',
                    boxShadow: isLatest ? '0 0 0 2px var(--color-cyan-dim)' : 'var(--shadow-card)',
                  }}
                >
                  <span className="rounded-md bg-[var(--color-neon)]/10 px-2 py-0.5 text-[11px] font-semibold text-[var(--color-neon)]">
                    {item.kind}
                  </span>
                  <span className="font-mono text-[12.5px] text-[var(--color-text)]">{item.label}</span>
                </div>
              );
            })}
          </div>
        )}

        {stage === 'ir' && (
          <div className="flex flex-col gap-2">
            {irItems.slice(0, revealed).map((item, i) => {
              const isLatest = i === revealed - 1;
              return (
                <div
                  key={i}
                  className="rounded-[10px] border bg-[var(--color-card)] px-3 py-2 transition-all"
                  style={{
                    borderColor: isLatest ? 'var(--color-cyan)' : 'var(--color-border)',
                    boxShadow: isLatest ? '0 0 0 2px var(--color-cyan-dim)' : 'var(--shadow-card)',
                  }}
                >
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                    {item.method}
                  </span>
                  <div className="font-mono text-[12.5px] text-[var(--color-text)]">
                    #{item.id} · {item.label}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {stage === 'codegen' && (
          <div className="overflow-hidden rounded-[10px] border border-[var(--color-border)] bg-[var(--color-card)] font-mono text-[12.5px]">
            {codegenItems.slice(0, revealed).map((line, i) => {
              const isLatest = i === revealed - 1;
              return (
                <div
                  key={i}
                  className="flex gap-3 px-3 py-1 transition-colors"
                  style={{
                    background: isLatest ? 'var(--color-cyan-dim)' : 'transparent',
                    color: isLatest ? 'var(--color-cyan)' : 'var(--color-text-dim)',
                  }}
                >
                  <span className="w-8 select-none text-right text-[var(--color-text-muted)]">{i + 1}</span>
                  <span>{line}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default StageCanvas;
