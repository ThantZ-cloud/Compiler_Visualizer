import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import type { TokenGroupDef } from '../../lib/lexer/tokenGroups';
import { buildNFAFromRE } from '../../lib/lexer/reParser';
import { subsetConstruction } from '../../lib/lexer/subsetConstruction';
import type { ReNode } from '../../lib/lexer/thompson';
import type { DFA } from '../../lib/lexer/types';
import { drawDfaGraph } from './drawDfaGraph';

const RE_PRESETS = ['new', 'not', 'new|not', 'while', 'new|not|while', 'a|b', 'a*b', 'a+b', 'a=b', 'a-b', 'a/b', 'a&b'] as const;

interface RegexTableProps {
  groups: TokenGroupDef[];
  isPlaying: boolean;
  isCompleted: boolean;
}



// ── Parse-tree pretty helpers ──
function ReNodeView({ node }: { node: ReNode }) {
  switch (node.kind) {
    case 'sym':
      return (
        <span className="inline-flex items-center justify-center px-2 py-1 rounded-full text-[11px] font-mono font-bold bg-[var(--color-neon-dim)] text-[var(--color-neon)] border border-[var(--color-neon)] min-w-[28px]">
          {node.label}
        </span>
      );
    case 'concat':
      return (
        <span className="inline-flex flex-wrap items-center gap-1.5 px-2 py-1.5 rounded-lg border border-[var(--color-border-bright)] bg-[var(--color-surface-2)]">
          <span className="text-[8px] font-mono font-bold tracking-widest text-[var(--color-text-muted)] uppercase mr-1">CONCAT</span>
          {node.children.map((c, i) => (
            <React.Fragment key={i}>
              <ReNodeView node={c as ReNode} />
              {i < node.children.length - 1 && <span className="text-[var(--color-text-dim)] text-[10px]">·</span>}
            </React.Fragment>
          ))}
        </span>
      );
    case 'alt':
      return (
        <span className="inline-flex flex-col gap-1.5 px-2 py-2 rounded-lg border border-dashed border-[var(--color-border-bright)] bg-[var(--color-card)]">
          <span className="text-[8px] font-mono font-bold tracking-widest text-[var(--color-text-muted)] uppercase">ALT ( | )</span>
          <span className="flex flex-col gap-1.5">
            {node.children.map((c, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <span className="text-[9px] font-mono text-[var(--color-text-muted)]">{i + 1}.</span>
                <ReNodeView node={c as ReNode} />
              </span>
            ))}
          </span>
        </span>
      );
    case 'star':
      return (
        <span className="inline-flex flex-col gap-1 px-2 py-2 rounded-lg border border-[var(--color-neon)]/30 bg-[var(--color-neon-dim)]/20">
          <span className="text-[8px] font-mono font-bold tracking-widest text-[var(--color-neon)] uppercase">STAR *</span>
          <ReNodeView node={node.child} />
        </span>
      );
    case 'opt':
      return (
        <span className="inline-flex flex-col gap-1 px-2 py-2 rounded-lg border border-[var(--color-cyan)]/30 bg-[var(--color-cyan-dim)]/15">
          <span className="text-[8px] font-mono font-bold tracking-widest text-[var(--color-cyan)] uppercase">OPT ?</span>
          <ReNodeView node={node.child} />
        </span>
      );
  }
}

function precedenceHint(t: (k: string) => string) {
  return t('lexical.step1.precedenceHint');
}

const RegexTable: React.FC<RegexTableProps> = ({ groups, isPlaying, isCompleted }) => {
  const { t } = useTranslation();
  const [active, setActive] = useState<string>('TABLE');
  const [customInput, setCustomInput] = useState('new|not');

  const customResult = useMemo(() => {
    const v = customInput.trim();
    if (!v) return null;
    return buildNFAFromRE(v);
  }, [customInput]);

  const customDfa: DFA | null = useMemo(() => {
    if (!customResult?.nfa || customResult.error) return null;
    try {
      const { dfa } = subsetConstruction(customResult.nfa);
      if (dfa.states.length > 30) return null;
      return dfa;
    } catch {
      return null;
    }
  }, [customResult]);

  const customRecognizerRef = useRef<SVGSVGElement>(null);

  // Draw custom recognizer for the typed RE (live) — if user writes a word, transition diagram updates
  useEffect(() => {
    if (active !== 'EXAMPLES') return;
    const el = customRecognizerRef.current;
    if (!el) return;
    if (!customDfa) {
      // clear stale diagram when RE is too large or invalid
      el.innerHTML = '';
      return;
    }
    drawDfaGraph(el, customDfa, { accent: 'var(--color-cyan)', accentDim: 'var(--color-cyan-dim)', animate: false });
  }, [active, customDfa]);

  const tabBtn = (label: string, key: string) => {
    const isActive = active === key;
    return (
      <button
        key={key}
        onClick={() => setActive(key)}
        className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold tracking-wide border transition-colors ${isActive ? 'bg-[var(--color-neon-dim)] text-[var(--color-neon)] border-[var(--color-neon)]' : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border-bright)] hover:text-[var(--color-text)]'}`}
      >
        {label}
      </button>
    );
  };

  const subtitle = active === 'EXAMPLES' ? t('lexical.step1.examplesHint') : t('lexical.step1.description');

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Description */}
      <div className="mb-4">
        <h2 className="text-lg font-bold text-[var(--color-neon)] font-display tracking-[0.1em] uppercase mb-1">
          {t('lexical.step1.title')}
        </h2>
        <p className="text-xs text-[var(--color-text-dim)] font-mono leading-relaxed">{subtitle}</p>
        {active === 'TABLE' && (
          <p className="text-[10px] text-[var(--color-text-muted)] font-mono mt-1">{t('lexical.step1.caption')}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {[
          { key: 'TABLE', labelKey: 'lexical.step1.tableView', fallback: 'Table' },
          { key: 'EXAMPLES', labelKey: 'lexical.step1.examplesView', fallback: 'Try It' },
        ].map(v => tabBtn(t(v.labelKey), v.key))}
      </div>

      {active === 'TABLE' ? (
        <>
          {/* Table */}
          <div className="border border-[var(--color-border-bright)] rounded-lg overflow-hidden bg-[var(--color-card)] overflow-x-auto">
            <div className="min-w-[320px]">
              {/* Header */}
              <div className="grid grid-cols-[110px_1fr_60px] sm:grid-cols-[140px_1fr_70px] lg:grid-cols-[180px_1fr_80px] gap-2 px-3 sm:px-4 py-3 bg-[var(--color-surface-2)] border-b border-[var(--color-border-bright)]">
                <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-[var(--color-text-muted)] font-display">
                  {t('lexical.step1.columnType')}
                </span>
                <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-[var(--color-text-muted)] font-display">
                  {t('lexical.step1.columnRegex')}
                </span>
                <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-[var(--color-text-muted)] font-display text-right">
                  {t('lexical.step1.columnCount')}
                </span>
              </div>

              {/* Rows */}
              {groups.map((group, i) => (
                <motion.div
                  key={group.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={isPlaying || isCompleted ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                  transition={{ delay: i * 0.15, duration: 0.4, ease: 'easeOut' }}
                  className={`grid grid-cols-[110px_1fr_60px] sm:grid-cols-[140px_1fr_70px] lg:grid-cols-[180px_1fr_80px] gap-2 px-3 sm:px-4 py-3 border-b border-[var(--color-border)] items-center ${group.found ? 'bg-[var(--color-card)]' : 'bg-[var(--color-card)] opacity-50'}`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: group.color }} />
                    <span className="text-xs font-bold font-mono" style={{ color: group.color }}>
                      {group.name}
                    </span>
                    {group.found && <span className="text-[8px] font-bold uppercase text-[var(--color-neon)] tracking-wider">●</span>}
                  </div>
                  <code className="text-xs font-mono text-[var(--color-text)] break-all">{group.regexPattern}</code>
                  <span className={`text-xs font-mono text-right ${group.found ? 'text-[var(--color-neon)]' : 'text-[var(--color-text-muted)]'}`}>{group.count}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-[10px] font-mono text-[var(--color-text-muted)]">
            <span className="flex items-center gap-1">
              <span className="text-[var(--color-neon)]">●</span>
              {t('lexical.step1.foundInCode')}
            </span>
            <span className="flex items-center gap-1 opacity-50">
              <span>○</span>
              {t('lexical.step1.notFoundInCode')}
            </span>
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Editable RE input — like NFA/DFA */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-wide text-[var(--color-text-muted)] font-mono whitespace-nowrap">
                {t('lexical.step1.tryOwnRe')}
              </span>
              <input
                value={customInput}
                onChange={e => setCustomInput(e.target.value)}
                placeholder="new, not, new|not, while — use | for or, * + ? for repetition"
                className="flex-1 min-w-0 px-2 py-1.5 rounded border border-[var(--color-border-bright)] bg-[var(--color-card)] text-xs font-mono text-[var(--color-text)] focus:outline-none focus:border-[var(--color-neon)]"
                maxLength={64}
              />
              <span className="text-[10px] font-mono text-[var(--color-text-muted)] whitespace-nowrap">
                {customResult?.root ? t('lexical.step1.nodesCount', { count: countNodes(customResult.root) }) : ''}
              </span>
            </div>

            {customResult?.error && (
              <div className="text-[10px] font-mono text-[var(--color-error)] bg-[var(--color-error-dim)]/20 border border-[var(--color-error-dim)] rounded px-2 py-1">
                {customResult.error}{' '}
                {customInput.includes('/') && !customInput.includes('|') ? t('lexical.step1.slashHint') : ''}
              </div>
            )}

            <div className="flex flex-wrap gap-1">
              {RE_PRESETS.map(p => (
                <button
                  key={p}
                  onClick={() => setCustomInput(p)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono border ${customInput === p ? 'bg-[var(--color-neon-dim)] text-[var(--color-neon)] border-[var(--color-neon)]' : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border-bright)] hover:text-[var(--color-text)]'}`}
                >
                  {p}
                </button>
              ))}
            </div>

            {customResult?.root && !customResult.error && (
              <div className="border border-[var(--color-neon)]/30 rounded-lg bg-[var(--color-card)] p-3 overflow-auto">
                <div className="text-[10px] font-mono text-[var(--color-neon)] font-bold mb-2">
                  {t('lexical.step1.yourRe', { re: customInput })} — {t('lexical.step1.parseTreeLabel')}
                </div>
                <div className="overflow-auto py-1">
                  <ReNodeView node={customResult.root} />
                </div>
                <div className="mt-2 text-[9px] font-mono text-[var(--color-text-muted)]">{precedenceHint(t)}</div>
              </div>
            )}
            {customDfa && !customResult?.error && (
              <div className="border border-[var(--color-cyan)]/30 rounded-lg bg-[var(--color-card)] p-3 overflow-auto flex flex-col gap-2">
                <div className="text-[10px] font-mono font-bold tracking-wide uppercase text-[var(--color-cyan)]">
                  {t('lexical.step1.recognizerTitle')} — {customInput}
                </div>
                <div className="border border-[var(--color-border-bright)] rounded-lg bg-[var(--color-surface-2)] p-2 overflow-auto max-h-[300px]">
                  <svg ref={customRecognizerRef} className="block" role="img" aria-label="Custom RE recognizer transition diagram" preserveAspectRatio="xMinYMin meet" />
                </div>
                <div className="text-[9px] font-mono text-[var(--color-text-muted)]">{t('lexical.step1.recognizerHint')}</div>
              </div>
            )}
            {customResult?.root && !customResult?.error && !customDfa && (
              <div className="text-[10px] font-mono text-[var(--color-text-muted)] border border-dashed border-[var(--color-border-bright)] rounded-lg p-2 text-center">
                {t('lexical.step1.recognizerTooLarge')}
              </div>
            )}
          </div>


        </div>
      )}
    </div>
  );
};

function countNodes(node: ReNode): number {
  switch (node.kind) {
    case 'sym':
      return 1;
    case 'concat':
    case 'alt':
      return 1 + node.children.reduce((acc, c) => acc + countNodes(c as ReNode), 0);
    case 'star':
    case 'opt':
      return 1 + countNodes(node.child);
  }
}

export default RegexTable;
