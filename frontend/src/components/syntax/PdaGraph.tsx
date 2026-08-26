import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import type { ParseStep } from '../../lib/parser/types';
import { PDA_STATES, PDA_TRANSITIONS } from '../../lib/parser/javaGrammar';
import { buildPdaTryItData, RIGHT_RECURSIVE_GRAMMAR, PDA_TRYIT_PRESETS } from '../../lib/parser/pdaTryIt';
import TopDownTraceTable from './TopDownTraceTable';
import FirstFollowDisplay from './FirstFollowDisplay';
import Ll1Table from './Ll1Table';

interface PdaGraphProps {
  /** Parse steps used to drive the machine */
  steps: ParseStep[];
  isPlaying: boolean;
  isCompleted: boolean;
}

const VIEW_W = 560;
const VIEW_H = 280; // Increased height for better spacing

/** Straight line with a perpendicular bend for nicer edges */
function edgePath(x1: number, y1: number, x2: number, y2: number): { d: string; lx: number; ly: number } {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  return { d: `M ${x1} ${y1} L ${x2} ${y2}`, lx: midX, ly: midY };
}

const STAGES: Record<string, boolean> = {
  start: true,
  header: true,
  body: true,
  statement: true,
  accept: true,
};

const PdaGraph: React.FC<PdaGraphProps> = ({ steps, isPlaying, isCompleted }) => {
  const { t } = useTranslation();
  const [idx, setIdx] = useState(0);
  const [active, setActive] = useState<'TABLE' | 'TRYIT'>('TABLE');
  const [customInput, setCustomInput] = useState('a + b * c');
  const customResult = useMemo(() => buildPdaTryItData(customInput), [customInput]);

  const tabBtn = (label: string, key: 'TABLE' | 'TRYIT') => {
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

  // Animate through the parse steps while playing
  useEffect(() => {
    if (!isPlaying) {
      setIdx(isCompleted ? steps.length - 1 : 0);
      return;
    }
    setIdx(0);
    const interval = setInterval(() => {
      setIdx(prev => {
        if (prev >= steps.length - 1) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 220);
    return () => clearInterval(interval);
  }, [isPlaying, isCompleted, steps]);

  const current = steps[Math.min(idx, steps.length - 1)];
  const stage = current?.stage ?? 'start';
  const activeStage = STAGES[stage] ? stage : 'start';
  const stackItems = current?.stack.slice(-12) ?? [];

  const activeEdge = PDA_TRANSITIONS.find(tr => tr.to === activeStage && tr.from !== activeStage);
  const isVisible = isPlaying || isCompleted;

  const subtitle =
    active === 'TRYIT'
      ? t('syntax.step2.tryItHint', { defaultValue: 'Try It — type your own expression and watch the leftmost top-down parser predict, match, and accept. Example: a + b × c' })
      : t('syntax.step2.description');

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Description */}
      <div className="mb-4">
        <h2 className="text-lg font-bold text-[var(--color-amber)] font-display tracking-[0.1em] uppercase mb-1">
          {t('syntax.step2.title')}
        </h2>
        <p className="text-xs text-[var(--color-text-dim)] font-mono leading-relaxed">{subtitle}</p>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {[
          { key: 'TABLE' as const, labelKey: 'syntax.step2.tableView', fallback: 'Java Program' },
          { key: 'TRYIT' as const, labelKey: 'syntax.step2.tryItView', fallback: 'Try Yourself' },
        ].map(v => tabBtn(t(v.labelKey, { defaultValue: v.fallback }), v.key))}
      </div>

      {active === 'TABLE' ? (
        !isVisible ? (
          <div className="border border-[var(--color-border-bright)] rounded-lg bg-[var(--color-card)] h-[280px] flex items-center justify-center">
            <span className="text-[10px] font-mono text-[var(--color-text-muted)]">Press Play to animate the PDA</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
        {/* PDA state machine */}
        <div className="border border-[var(--color-border-bright)] rounded-lg bg-[var(--color-card)] p-3 min-w-0">
          <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H + 60}`} className="w-full h-auto" style={{ fontFamily: "'Consolas', 'Monaco', monospace" }}>
            <defs>
              <marker id="pda-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                <path d="M0,0 L8,4 L0,8 Z" fill="currentColor" />
              </marker>
            </defs>

            {/* Transitions */}
            {PDA_TRANSITIONS.map((tr, i) => {
              const from = PDA_STATES.find(s => s.id === tr.from)!;
              const to = PDA_STATES.find(s => s.id === tr.to)!;
              const active = tr.to === activeStage;
              const color = active ? 'var(--color-neon)' : 'var(--color-border-bright)';
              const { d, lx, ly } = edgePath(from.x, from.y, to.x, to.y);
              const labelOffset = tr.labelOffset ?? 0;
              const isCurrentTransition = active && tr.to === activeStage && tr.from !== activeStage;
              return (
                <g key={i} opacity={active ? 1 : 0.55} style={{ color }}>
                  <path
                    d={d}
                    fill="none"
                    stroke={color}
                    strokeWidth={isCurrentTransition ? 2.5 : 1.5}
                    markerEnd="url(#pda-arrow)"
                    strokeDasharray={isCurrentTransition ? '6 3' : 'none'}
                  />
                  <text
                    x={lx}
                    y={ly - 6 + labelOffset}
                    fill="var(--color-text-muted)"
                    fontSize="9"
                    textAnchor="middle"
                    fontWeight={isCurrentTransition ? 'bold' : 'normal'}
                  >
                    {tr.label}
                  </text>
                </g>
              );
            })}

            {/* States */}
            {PDA_STATES.map(state => {
              const isActiveState = state.id === activeStage;
              const radius = isActiveState ? 24 : 18;
              return (
                <g key={state.id} opacity={isActiveState ? 1 : 0.65} style={{ transition: 'opacity 0.35s ease' }}>
                  {isActiveState && (
                    <circle
                      cx={state.x}
                      cy={state.y}
                      r={radius + 8}
                      fill="none"
                      stroke="var(--color-neon)"
                      strokeOpacity="0.35"
                    >
                      <animate
                        attributeName="r"
                        values={`${radius + 4};${radius + 12};${radius + 4}`}
                        dur="1.4s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="stroke-opacity"
                        values="0;0.35"
                        dur="0.45s"
                        fill="freeze"
                      />
                    </circle>
                  )}
                  <circle
                    cx={state.x}
                    cy={state.y}
                    r={radius}
                    fill="var(--color-card)"
                    stroke={isActiveState ? 'var(--color-neon)' : state.isAccept ? 'var(--color-amber)' : 'var(--color-border)'}
                    strokeWidth={isActiveState ? 3 : 1.5}
                    style={{ transition: 'r 0.35s ease, stroke-width 0.35s ease' }}
                  />
                  {state.isStart && (
                    <path
                      d={`M ${state.x - radius} ${state.y} h ${radius - 2}`}
                      stroke="var(--color-neon)"
                      fill="none"
                      markerEnd="url(#pda-arrow)"
                      strokeWidth={1.5}
                    />
                  )}
                  {state.isAccept && (
                    <circle
                      cx={state.x}
                      cy={state.y}
                      r={radius - 5}
                      fill="none"
                      stroke="var(--color-amber)"
                      strokeWidth="1.5"
                      style={{ transition: 'r 0.35s ease' }}
                    />
                  )}
                  <text
                    x={state.x}
                    y={state.y - radius - 10}
                    fill={isActiveState ? 'var(--color-neon)' : 'var(--color-text)'}
                    fontSize="11"
                    fontWeight="bold"
                    textAnchor="middle"
                    letterSpacing="1"
                  >
                    {state.label}
                  </text>
                  <text
                    x={state.x}
                    y={state.y + 5}
                    fill="var(--color-text-muted)"
                    fontSize="8"
                    textAnchor="middle"
                  >
                    {state.description}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Current action */}
          <div className="mt-2 px-3 py-2 border-t border-[var(--color-border)] flex items-center justify-between gap-2">
            <span className="text-[9px] font-mono text-[var(--color-text-muted)] truncate">
              {current?.action.detail ?? `${t('syntax.step2.awaitingInput')}…`}
            </span>
            {activeEdge && (
              <span className="text-[9px] font-mono text-[var(--color-neon)] shrink-0">
                → {activeEdge.label}
              </span>
            )}
          </div>
        </div>

        {/* Stack memory */}
        <div className="border border-[var(--color-border-bright)] rounded-lg bg-[var(--color-card)] flex flex-col max-h-[280px]">
          <div className="px-4 py-2 border-b border-[var(--color-border-bright)] flex items-center justify-between shrink-0">
            <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-[var(--color-text-muted)] font-display">
              {t('syntax.step2.stackMemory')}
            </span>
            <span className="text-[9px] font-mono text-[var(--color-amber)]">
              {stackItems.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <div className="flex flex-col items-center gap-1">
              <AnimatePresence mode="popLayout">
                {stackItems.slice(-12).reverse().map(item => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: -12, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 12, scale: 0.9 }}
                    className={`px-2 py-1 text-[10px] font-mono rounded border w-full text-center truncate ${
                      item.kind === 'nonterminal'
                        ? 'text-[var(--color-cyan)] border-[var(--color-cyan)]/40 bg-[rgba(0,212,255,0.06)]'
                        : 'text-[var(--color-neon)] border-[var(--color-neon)]/40 bg-[rgba(0,255,136,0.05)]'
                    }`}
                  >
                    {item.symbol}
                  </motion.div>
                ))}
              </AnimatePresence>
              {stackItems.length === 0 && (
                <div className="text-[10px] font-mono text-[var(--color-text-muted)] text-center py-4">
                  {t('syntax.step2.empty')}
                </div>
              )}
            </div>
          </div>
          {activeStage === 'accept' && (
            <div className="px-4 py-2 border-t border-[var(--color-border-bright)] shrink-0">
              <span className="text-[10px] font-bold text-[var(--color-neon)] font-mono">
                {t('syntax.step2.accepted')}
              </span>
            </div>
          )}
        </div>
      </div>
        )
      ) : (
        <div className="flex flex-col gap-3">
          {/* Editable input — textbook example a + b * c */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-wide text-[var(--color-text-muted)] font-mono whitespace-nowrap">
                {t('syntax.step2.tryOwnExpr', { defaultValue: 'Try your own expression:' })}
              </span>
              <input
                value={customInput}
                onChange={e => setCustomInput(e.target.value)}
                placeholder="a + b * c  or  (a + b) * c"
                className="flex-1 min-w-0 px-2 py-1.5 rounded border border-[var(--color-border-bright)] bg-[var(--color-card)] text-xs font-mono text-[var(--color-text)] focus:outline-none focus:border-[var(--color-neon)]"
                maxLength={48}
              />
              <span className="text-[10px] font-mono text-[var(--color-text-muted)] whitespace-nowrap">
                {customResult.steps.length > 0 ? `${customResult.steps.length - 1} steps` : ''}
              </span>
            </div>
            {customResult.error && (
              <div className="text-[10px] font-mono text-[var(--color-error)] bg-[var(--color-error-dim)]/20 border border-[var(--color-error-dim)] rounded px-2 py-1">
                {customResult.error}
              </div>
            )}
            <div className="flex flex-wrap gap-1">
              {PDA_TRYIT_PRESETS.map(p => (
                <button
                  key={p}
                  onClick={() => setCustomInput(p)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono border ${customInput === p ? 'bg-[var(--color-neon-dim)] text-[var(--color-neon)] border-[var(--color-neon)]' : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border-bright)] hover:text-[var(--color-text)]'}`}
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="border border-[var(--color-border-bright)] rounded-lg bg-[var(--color-card)] p-3">
              <div className="text-[10px] font-mono font-bold tracking-wide uppercase text-[var(--color-text-muted)] mb-2">
                {t('syntax.step2.tryGrammarTitle', { defaultValue: 'Example grammar — Right-recursive (LL(1))' })}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px] font-mono">
                {RIGHT_RECURSIVE_GRAMMAR.rules.map(r => (
                  <span key={r.id} className="text-[var(--color-text-dim)]">
                    {r.lhs} → {r.rhs.length === 0 ? 'ε' : r.rhs.join(' ')}  ({r.id})
                  </span>
                ))}
              </div>
              <div className="mt-2 text-[9px] font-mono text-[var(--color-text-muted)]">
                {t('syntax.step2.tryGrammarHint', { defaultValue: 'Start symbol is Goal. ε is empty. This grammar is naturally LL(1) — no left recursion, perfect for top-down.' })}
              </div>
            </div>
          </div>

          {/* Order: editable input (above) → leftmost top-down trace → FIRST/FOLLOW → LL(1) table */}
          {!customResult.error && customResult.steps.length > 0 && (
            <TopDownTraceTable steps={customResult.steps} isPlaying={isPlaying && active === 'TRYIT'} isCompleted={isCompleted || active === 'TRYIT'} />
          )}
          {!customResult.error && (
            <>
              <FirstFollowDisplay first={customResult.first} follow={customResult.follow} />
              <Ll1Table table={customResult.ll1Table} highlight={customResult.steps.length > 1 ? (() => { const s = customResult.steps[Math.min(1, customResult.steps.length - 1)]; const top = s.stack[s.stack.length - 1]; const la = s.lookahead; if (top && ['Goal',"Expr","Expr'","Term","Term'",'Factor'].includes(top)) return { nt: top, terminal: la }; return null; })() : null} />
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default PdaGraph;