import React, { useRef, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import type { DFA, SubsetConstructionStep } from '../../lib/lexer/types';
import { drawDfaGraph } from './drawDfaGraph';
import { subsetConstruction } from '../../lib/lexer/subsetConstruction';
import { buildNFAFromRE, PRESET_RES } from '../../lib/lexer/reParser';

interface DfaGraphProps {
  dfa: DFA;
  steps: SubsetConstructionStep[];
  nfaStatesCount?: number;
  groupCounts?: Record<string, number>;
  isPlaying: boolean;
  isCompleted: boolean;
}

interface CustomResult {
  dfa?: DFA;
  steps?: SubsetConstructionStep[];
  error?: string;
}

const VIEW_TABS = [
  { key: 'OVERVIEW', fallback: 'OVERVIEW' },
  { key: 'FULL', fallback: 'FULL' },
  { key: 'EXAMPLES', fallback: 'TRY IT' },
] as const;

const DfaGraph: React.FC<DfaGraphProps> = ({ dfa, steps, nfaStatesCount = 0, groupCounts = {}, isPlaying, isCompleted }) => {
  const { t } = useTranslation();
  const svgRef = useRef<SVGSVGElement>(null);
  const customSvgRef = useRef<SVGSVGElement>(null);
  const [visibleSteps, setVisibleSteps] = useState(0);
  const [active, setActive] = useState<string>('FULL');
  const [customInput, setCustomInput] = useState('(a|b)*');

  // Fully editable example RE → NFA → DFA (tighter caps than NFA view)
  const customResult = useMemo<CustomResult>(() => {
    const v = customInput.trim();
    if (!v) return {};
    if (v.length > 24) return { error: 'Expression too long (max 24 characters for DFA examples)' };
    const parsed = buildNFAFromRE(v);
    if (parsed.error || !parsed.nfa || !parsed.root) return { error: parsed.error ?? 'Invalid expression' };
    const built = subsetConstruction(parsed.nfa);
    if (built.dfa.states.length > 30) return { error: `DFA too large (${built.dfa.states.length} states) — try a shorter expression` };
    return { dfa: built.dfa, steps: built.steps };
  }, [customInput]);

  // Animate steps appearing one by one
  useEffect(() => {
    if (!isPlaying && !isCompleted) {
      setVisibleSteps(0);
      return;
    }
    if (isCompleted) {
      setVisibleSteps(steps.length);
      return;
    }
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setVisibleSteps(i);
      if (i >= steps.length) clearInterval(interval);
    }, 600);
    return () => clearInterval(interval);
  }, [isPlaying, isCompleted, steps.length]);

  // Draw full token DFA graph — always render for inspection (like NFA flat view)
  useEffect(() => {
    if (active !== 'FULL') return;
    const svgEl = svgRef.current;
    if (!svgEl) return;
    drawDfaGraph(svgEl, dfa, {
      accent: 'var(--color-cyan)',
      accentDim: 'var(--color-cyan-dim)',
      animate: isPlaying,
    });
    return () => {
      while (svgEl.firstChild) svgEl.removeChild(svgEl.firstChild);
    };
  }, [dfa, isPlaying, isCompleted, active]);

  // Draw custom small DFA graph
  useEffect(() => {
    if (active !== 'EXAMPLES' || !customResult?.dfa) return;
    const svgEl = customSvgRef.current;
    if (!svgEl) return;
    drawDfaGraph(svgEl, customResult.dfa, {
      accent: 'var(--color-cyan)',
      accentDim: 'var(--color-cyan-dim)',
      animate: false,
    });
    return () => {
      while (svgEl.firstChild) svgEl.removeChild(svgEl.firstChild);
    };
  }, [active, customResult]);

  // Overview derived values from existing pipeline data
  const startClosureSize = useMemo(() => steps.find(s => s.inputSymbol === 'ε-closure')?.nfaSubset.length ?? 0, [steps]);
  const alphabetGroups = useMemo(() => {
    const seen = new Set<string>();
    for (const s of dfa.states) void s.id;
    for (const tr of dfa.transitions) {
      for (const cls of tr.classIds ?? []) seen.add(`c${cls}`);
      if (!tr.classIds?.length) seen.add(tr.symbol);
    }
    return seen.size;
  }, [dfa]);
  const deadTransitions = useMemo(() => steps.filter(s => !s.isNewState && s.resultingNFAStates.length === 0 && s.dfaStateId !== -1).length, [steps]);
  const acceptTypes = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of dfa.states) if (s.isAccept && s.acceptType) m.set(s.acceptType, (m.get(s.acceptType) ?? 0) + 1);
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [dfa]);

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-[var(--color-cyan)] font-display tracking-[0.1em] uppercase mb-2">
          {t('lexical.step3.title')}
        </h2>
        <p className="text-xs text-[var(--color-text-dim)] font-mono leading-relaxed">
          {t('lexical.step3.description')}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {VIEW_TABS.map(v => (
          <button key={v.key} onClick={() => setActive(v.key)} className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold tracking-wide border transition-colors ${active === v.key ? 'bg-[var(--color-cyan-dim)] text-[var(--color-cyan)] border-[var(--color-cyan)]' : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border-bright)] hover:text-[var(--color-text)]'}`}>
            {v.fallback}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {active === 'OVERVIEW' && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="border border-[var(--color-border-bright)] rounded-lg bg-[var(--color-card)] p-3 text-center">
              <div className="text-lg font-bold font-mono text-[var(--color-neon)]">{nfaStatesCount}</div>
              <div className="text-[9px] uppercase tracking-wider text-[var(--color-text-muted)] font-display">NFA states</div>
            </div>
            <div className="border border-[var(--color-border-bright)] rounded-lg bg-[var(--color-card)] p-3 text-center">
              <div className="text-lg font-bold font-mono text-[var(--color-cyan)]">{dfa.states.length}</div>
              <div className="text-[9px] uppercase tracking-wider text-[var(--color-text-muted)] font-display">DFA states</div>
            </div>
            <div className="border border-[var(--color-border-bright)] rounded-lg bg-[var(--color-card)] p-3 text-center">
              <div className="text-lg font-bold font-mono text-[var(--color-text)]">{alphabetGroups}</div>
              <div className="text-[9px] uppercase tracking-wider text-[var(--color-text-muted)] font-display">char groups</div>
            </div>
            <div className="border border-[var(--color-border-bright)] rounded-lg bg-[var(--color-card)] p-3 text-center">
              <div className="text-lg font-bold font-mono text-[var(--color-text)]">{startClosureSize}</div>
              <div className="text-[9px] uppercase tracking-wider text-[var(--color-text-muted)] font-display">start ε-closure</div>
            </div>
          </div>

          {/* Token badges */}
          <div className="flex flex-wrap items-center gap-2">
            {Object.entries(groupCounts).map(([name, count]) => (
              <span key={name} className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${count > 0 ? 'border-[var(--color-neon)] text-[var(--color-neon)] bg-[rgba(0,255,136,0.05)]' : 'border-[var(--color-border)] text-[var(--color-text-muted)] opacity-50'}`}>
                {name.slice(0, 6)} · {count} tok
              </span>
            ))}
          </div>

          {/* ε-closure table preview + first 3 subset steps */}
          <div className="grid md:grid-cols-2 gap-3">
            <div className="border border-[var(--color-border-bright)] rounded-lg bg-[var(--color-card)] overflow-auto">
              <div className="px-3 py-2 border-b border-[var(--color-border-bright)]">
                <span className="text-[10px] font-bold tracking-wide uppercase text-[var(--color-text-muted)] font-display">ε-closure table (first 8)</span>
              </div>
              <table className="w-full text-[10px] font-mono">
                <thead><tr className="text-left text-[var(--color-text-muted)]"><th className="px-3 py-1.5">DFA</th><th className="px-3 py-1.5">NFA subset</th></tr></thead>
                <tbody>
                  {steps.filter(s => s.inputSymbol === 'ε-closure').slice(0, 8).map((s, i) => (
                    <tr key={i} className="border-t border-[var(--color-border)]"><td className="px-3 py-1.5 text-[var(--color-cyan)]">D{s.dfaStateId}</td><td className="px-3 py-1.5">{`{${s.nfaSubset.map(n => `q${n}`).join(',')}}`}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border border-[var(--color-border-bright)] rounded-lg bg-[var(--color-card)] p-3 flex flex-col gap-2">
              <span className="text-[10px] font-bold tracking-wide uppercase text-[var(--color-text-muted)] font-display">First subset steps</span>
              {steps.slice(0, 3).map((s, i) => (
                <div key={i} className={`text-[10px] font-mono p-2 rounded ${s.isNewState ? 'bg-[var(--color-cyan-dim)] text-[var(--color-cyan)]' : 'text-[var(--color-text-dim)]'}`}>{s.description}</div>
              ))}
            </div>
          </div>

          {/* Accept-type summary */}
          <div className="flex flex-wrap gap-2">
            {acceptTypes.map(([type, count]) => (
              <span key={type} className="px-2 py-0.5 rounded-full text-[10px] font-mono border border-[var(--color-border)] text-[var(--color-text-dim)]">{type} · {count} states</span>
            ))}
          </div>
        </div>
      )}

      {/* FULL — existing graph + log */}
      {active === 'FULL' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
            <div className="border border-[var(--color-border-bright)] rounded-lg overflow-auto bg-[var(--color-card)] p-2 sm:p-4 max-h-[70vh]">
              <svg ref={svgRef} className="block" role="img" aria-label="DFA state diagram" preserveAspectRatio="xMinYMin meet" />
            </div>
            <div className="border border-[var(--color-border-bright)] rounded-lg bg-[var(--color-card)] flex flex-col max-h-[450px]">
              <div className="px-4 py-2 border-b border-[var(--color-border-bright)] shrink-0">
                <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-[var(--color-text-muted)] font-display">{t('lexical.step3.subsetLog')}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {steps.slice(0, visibleSteps).map((step, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className={`text-[10px] font-mono leading-relaxed p-2 rounded ${step.isNewState ? 'bg-[var(--color-cyan-dim)] text-[var(--color-cyan)]' : step.dfaStateId === -1 ? 'bg-[var(--color-neon-dim)] text-[var(--color-neon)] font-bold' : 'text-[var(--color-text-dim)]'}`}>
                    {step.description}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-4 text-[10px] font-mono text-[var(--color-text-muted)]">
            <span>{t('lexical.step3.dfaStates')}: <span className="text-[var(--color-cyan)]">{dfa.states.length}</span></span>
            {deadTransitions > 0 && <span>· {deadTransitions} dead-end moves skipped</span>}
            {visibleSteps >= steps.length && <span className="text-[var(--color-neon)]">{t('lexical.step3.fixedPointReached')}</span>}
          </div>
        </>
      )}

      {/* EXAMPLES — fully editable */}
      {active === 'EXAMPLES' && (
        <div className="flex flex-col gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold tracking-wide text-[var(--color-text-muted)] font-mono">Try your own RE:</span>
            <input value={customInput} onChange={e => setCustomInput(e.target.value)} placeholder="(a|b)* or a(b|c)*" maxLength={24} className="flex-1 px-2 py-1 rounded border border-[var(--color-border-bright)] bg-[var(--color-card)] text-xs font-mono text-[var(--color-text)] focus:outline-none focus:border-[var(--color-cyan)]" />
            <span className="text-[10px] font-mono text-[var(--color-text-muted)]">{customResult?.dfa ? `${customResult.dfa.states.length} DFA states` : ''}</span>
          </div>
          {customInput.includes('/') && !customInput.includes('|') && (
            <div className="text-[10px] font-mono text-[var(--color-error)]">Tip: use | for alternation — / is a literal character.</div>
          )}
          {customResult?.error ? (
            <div className="text-[10px] font-mono text-[var(--color-error)] bg-[rgba(255,51,102,0.08)] border border-[var(--color-error)]/40 rounded px-2 py-1">{customResult.error}</div>
          ) : (
            <div className="flex flex-wrap gap-1">
              {PRESET_RES.map(p => (
                <button key={p} onClick={() => setCustomInput(p)} className={`px-2 py-0.5 rounded text-[10px] font-mono border ${customInput === p ? 'bg-[var(--color-cyan-dim)] text-[var(--color-cyan)] border-[var(--color-cyan)]' : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border-bright)] hover:text-[var(--color-text)]'}`}>{p}</button>
              ))}
            </div>
          )}
          {!customResult?.error && customResult?.dfa && (
            <div className="border border-[var(--color-border-bright)] rounded-lg overflow-auto bg-[var(--color-card)] p-2 max-h-[60vh]">
              <div className="text-[10px] font-mono text-[var(--color-cyan)] mb-1">Your RE: {customInput} — Subset Construction DFA</div>
              <svg ref={customSvgRef} className="block" role="img" aria-label="Custom RE DFA" />
            </div>
          )}
          {!customResult?.error && customResult?.steps && (
            <div className="border border-[var(--color-border-bright)] rounded-lg bg-[var(--color-card)] p-3 max-h-[200px] overflow-y-auto space-y-1">
              <span className="text-[10px] font-bold tracking-wide uppercase text-[var(--color-text-muted)] font-display block">Subset steps</span>
              {customResult.steps.map((s, i) => (
                <div key={i} className={`text-[10px] font-mono p-1.5 rounded ${s.isNewState ? 'bg-[var(--color-cyan-dim)] text-[var(--color-cyan)]' : 'text-[var(--color-text-dim)]'}`}>{s.description}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DfaGraph;
