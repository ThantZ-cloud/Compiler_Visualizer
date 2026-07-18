import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useCompile } from '../context/CompileContext';
import { Eye, LayoutGrid, CircleDot } from 'lucide-react';
import TokenChart from '../components/TokenChart';
import Skeleton from '../components/Skeleton';

const TOKEN_BADGE_CLASSES: Record<string, string> = {
  KEYWORD: 'bg-[rgba(255,0,255,0.1)] text-[var(--color-magenta)] border border-[var(--color-magenta)]',
  TYPE: 'bg-[rgba(0,212,255,0.1)] text-[var(--color-cyan)] border border-[var(--color-cyan)]',
  IDENTIFIER: 'bg-[rgba(0,255,136,0.1)] text-[var(--color-neon)] border border-[var(--color-neon)]',
  STRING_LITERAL: 'bg-[rgba(255,176,0,0.1)] text-[var(--color-amber)] border border-[var(--color-amber)]',
  CHAR_LITERAL: 'bg-[rgba(255,176,0,0.1)] text-[var(--color-amber)] border border-[var(--color-amber)]',
  INTEGER_LITERAL: 'bg-[rgba(255,176,0,0.1)] text-[var(--color-amber)] border border-[var(--color-amber)]',
  LONG_LITERAL: 'bg-[rgba(255,176,0,0.1)] text-[var(--color-amber)] border border-[var(--color-amber)]',
  FLOAT_LITERAL: 'bg-[rgba(255,176,0,0.1)] text-[var(--color-amber)] border border-[var(--color-amber)]',
  DOUBLE_LITERAL: 'bg-[rgba(255,176,0,0.1)] text-[var(--color-amber)] border border-[var(--color-amber)]',
  BOOLEAN_LITERAL: 'bg-[rgba(255,176,0,0.1)] text-[var(--color-amber)] border border-[var(--color-amber)]',
  NULL_LITERAL: 'bg-[rgba(255,176,0,0.1)] text-[var(--color-amber)] border border-[var(--color-amber)]',
  SEPARATOR: 'bg-[rgba(224,224,240,0.1)] text-[var(--color-text-dim)] border border-[var(--color-border-bright)]',
  OPERATOR: 'bg-[rgba(224,224,240,0.1)] text-[var(--color-text-dim)] border border-[var(--color-border-bright)]',
  WHITESPACE: 'bg-[rgba(85,85,112,0.1)] text-[var(--color-text-muted)] border border-[var(--color-border)]',
};

function getBadgeClass(type: string): string {
  const upper = type.toUpperCase();
  for (const [key, cls] of Object.entries(TOKEN_BADGE_CLASSES)) {
    if (upper.includes(key)) return cls;
  }
  return TOKEN_BADGE_CLASSES.SEPARATOR;
}

const TOKEN_BORDER_CLASSES: Record<string, string> = {
  KEYWORD: 'border-l-[var(--color-magenta)]',
  TYPE: 'border-l-[var(--color-cyan)]',
  IDENTIFIER: 'border-l-[var(--color-neon)]',
  LITERAL: 'border-l-[var(--color-amber)]',
  WHITESPACE: 'border-l-[var(--color-text-muted)]',
  SEPARATOR: 'border-l-[var(--color-text-dim)]',
  OPERATOR: 'border-l-[var(--color-text-dim)]',
};

function getBorderClass(type: string): string {
  const upper = type.toUpperCase();
  for (const [key, cls] of Object.entries(TOKEN_BORDER_CLASSES)) {
    if (upper.includes(key)) return cls;
  }
  return 'border-l-[var(--color-neon)]';
}

const TokensPanel: React.FC = () => {
  const { result, loading } = useCompile();
  const [filter, setFilter] = useState('');
  const [view, setView] = useState<'chart' | 'grid'>('chart');

  if (loading) {
    return (
      <div className="flex flex-col h-full gap-4">
        <div className="flex justify-between items-center">
          <Skeleton width="200px" height="20px" />
          <div className="flex items-center gap-3">
            <Skeleton width="120px" height="32px" />
            <Skeleton width="250px" height="32px" />
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Skeleton count={5} width="80px" height="24px" />
        </div>
        <div className="flex flex-col gap-2 p-4 bg-[var(--color-card)] border border-[var(--color-border)]">
          <Skeleton count={8} height="26px" />
        </div>
      </div>
    );
  }

  if (!result?.tokens) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-muted)] text-[13px] font-mono">
        <CircleDot size={48} className="text-[var(--color-neon)] opacity-30 mb-4" />
        No tokens generated
      </div>
    );
  }

  const tokens = result.tokens;
  const filtered = filter
    ? tokens.filter(t => t.type.toLowerCase().includes(filter.toLowerCase()) || t.value.toLowerCase().includes(filter.toLowerCase()))
    : tokens;

  // Group by type
  const grouped = filtered.reduce((acc, token) => {
    acc[token.type] = (acc[token.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-bold text-[var(--color-text)] font-display tracking-[0.12em] uppercase">
          Tokens — {tokens.length} total, {filtered.length} shown
        </h2>
        <div className="flex items-center gap-3">
          <div className="flex gap-0.5 bg-[var(--color-card)] border border-[var(--color-border)] p-0.5">
            <button
              className={`px-3 py-[5px] text-[10px] font-bold tracking-[0.1em] bg-transparent border-none cursor-pointer transition-all font-display uppercase flex items-center gap-1 ${
                view === 'chart' ? 'text-[var(--color-neon)] bg-[rgba(0,255,136,0.1)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
              onClick={() => setView('chart')}
            >
              <Eye size={10} />
              Chart
            </button>
            <button
              className={`px-3 py-[5px] text-[10px] font-bold tracking-[0.1em] bg-transparent border-none cursor-pointer transition-all font-display uppercase flex items-center gap-1 ${
                view === 'grid' ? 'text-[var(--color-neon)] bg-[rgba(0,255,136,0.1)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
              onClick={() => setView('grid')}
            >
              <LayoutGrid size={10} />
              Grid
            </button>
          </div>
          <input
            type="text"
            className="px-3 py-[5px] text-[11px] text-[var(--color-neon)] bg-[var(--color-card)] border border-[var(--color-border)] w-[250px] font-mono placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-neon)] focus:shadow-[0_0_8px_var(--color-neon-dim)]"
            placeholder="$ filter tokens..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {Object.entries(grouped).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
          <span key={type} className={`px-2.5 py-[3px] text-[9px] font-bold tracking-[0.1em] uppercase font-display ${getBadgeClass(type)}`}>
            {type}: {count}
          </span>
        ))}
      </div>

      {view === 'chart' ? (
        <TokenChart tokens={tokens} />
      ) : (
        <motion.div
          className="flex flex-wrap gap-1.5 overflow-auto"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.01 } },
          }}
        >
          {filtered.map((token, index) => (
            <motion.div
              key={index}
              className={`flex flex-col px-3 py-2 bg-[var(--color-card)] border-l-2 min-w-[120px] transition-all hover:border-[var(--color-cyan)] hover:shadow-[0_0_10px_var(--color-cyan-dim)] ${getBorderClass(token.type)}`}
              variants={{
                hidden: { opacity: 0, scale: 0.9 },
                visible: { opacity: 1, scale: 1 },
              }}
            >
              <span className="text-[9px] font-bold text-[var(--color-cyan)] uppercase tracking-[0.1em] mb-0.5 font-display">{token.type}</span>
              <span className="text-xs text-[var(--color-amber)] font-mono break-all">"{token.value}"</span>
              <span className="text-[9px] text-[var(--color-text-muted)] mt-0.5 font-mono">L{token.line}:C{token.column}</span>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
};

export default TokensPanel;
