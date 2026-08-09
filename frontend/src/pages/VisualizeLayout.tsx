import React from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, NavLink, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useCompile } from '../context/CompileContext';
import { Braces, TreePine, Code2, Binary, Eye, GitFork, Search } from 'lucide-react';

const VisualizeLayout: React.FC = () => {
  const { t } = useTranslation();
  const { result } = useCompile();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const isLexical = location.pathname.startsWith('/visualize/lexical') || location.pathname.startsWith('/visualize/tokens');
  const isSyntax = location.pathname.startsWith('/visualize/syntax') || location.pathname.startsWith('/visualize/ast');
  const isSemantic = location.pathname.startsWith('/visualize/semantic');
  const activeView = searchParams.get('view') === 'static' ? 'static' : 'dynamic';

  const setView = (view: 'dynamic' | 'static') => {
    const next = new URLSearchParams(searchParams);
    if (view === 'dynamic') {
      next.delete('view');
    } else {
      next.set('view', 'static');
    }
    setSearchParams(next, { replace: true });
  };

  const phases = [
    { path: '/visualize/lexical', label: 'Lexical Analysis', icon: Braces },
    { path: '/visualize/syntax', label: 'Syntax Analysis', icon: TreePine },
    { path: '/visualize/semantic', label: 'Semantic Analysis', icon: Search },
    { path: '/visualize/tac', label: 'TAC', icon: Code2 },
    { path: '/visualize/bytecode', label: 'Bytecode', icon: Binary },
    { path: '/visualize/cfg', label: 'CFG', icon: GitFork },
  ];

  return (
    <div className="flex-1 flex flex-row min-h-0 overflow-hidden">
      <nav className="w-60 flex flex-col items-stretch gap-4 py-5 px-4 bg-[var(--color-card)] border-r border-[var(--color-border)] shrink-0 overflow-y-auto">
        <button
          className="px-4 py-2 text-[10px] font-bold tracking-[0.1em] text-[var(--color-text-muted)] bg-transparent border border-[var(--color-border)] cursor-pointer transition-all whitespace-nowrap font-display uppercase hover:text-[var(--color-neon)] hover:border-[var(--color-neon)]"
          onClick={() => navigate('/compiler')}
        >
          ← COMPILER
        </button>

        <div className="w-full h-px bg-[var(--color-border)]" />

        <div className="flex flex-col gap-2">
          {phases.map((phase) => (
            <NavLink
              key={phase.path}
              to={phase.path}
              className={({ isActive }) =>
                `flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold tracking-[0.12em] border transition-all font-display uppercase no-underline whitespace-nowrap ${
                  isActive
                    ? 'text-[var(--color-neon)] bg-[rgba(0,255,136,0.05)] border-[var(--color-neon)] shadow-[0_0_10px_var(--color-neon-dim),inset_0_0_10px_var(--color-neon-dim)]'
                    : 'text-[var(--color-text-muted)] bg-transparent border-transparent hover:text-[var(--color-text)] hover:border-[var(--color-border)]'
                }`
              }
            >
              <span className="text-xs"><phase.icon size={12} /></span>
              {phase.label}
            </NavLink>
          ))}
        </div>

        {(isLexical || isSyntax || isSemantic) && (
          <div className="flex flex-col gap-0.5 bg-[var(--color-card)] border border-[var(--color-border)] p-0.5">
            <button
              onClick={() => setView('dynamic')}
              className={`px-3 py-[6px] text-[9px] font-bold tracking-[0.1em] uppercase font-display border-none cursor-pointer transition-all text-center ${
                activeView === 'dynamic'
                  ? 'text-[var(--color-neon)] bg-[rgba(0,255,136,0.1)] shadow-[0_0_8px_var(--color-neon-dim)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              {t('lexical.tabs.pipeline')}
            </button>
            <button
              onClick={() => setView('static')}
              className={`px-3 py-[6px] text-[9px] font-bold tracking-[0.1em] uppercase font-display border-none cursor-pointer transition-all text-center ${
                activeView === 'static'
                  ? 'text-[var(--color-neon)] bg-[rgba(0,255,136,0.1)] shadow-[0_0_8px_var(--color-neon-dim)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
}`}
            >
              {isSemantic ? t('semantic.symbolExplorer') : t('lexical.tabs.tokenBrowser')}
            </button>
          </div>
        )}

        {result && (
          <div className="mt-auto text-center text-[10px] text-[var(--color-text-muted)] whitespace-nowrap font-mono">
            {result.tokens?.length} tokens • {result.compilationTimeMs}ms
          </div>
        )}
      </nav>

      <div className="flex-1 min-h-0 overflow-auto p-6 bg-[var(--color-void)]">
        {result ? (
          <Outlet />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-muted)] text-center gap-3">
            <Eye size={48} className="text-[var(--color-neon)] opacity-30" />
            <h3 className="text-base font-bold text-[var(--color-text)] font-display tracking-[0.1em] uppercase">
              {t('visualize.noCompilationResults')}
            </h3>
            <p className="text-xs max-w-[400px] font-mono">
              {'// '}{t('visualize.selectPhase')}
            </p>
            <button
              className="mt-3 px-6 py-3 text-[10px] font-bold tracking-[0.12em] text-[var(--color-void)] bg-[var(--color-neon)] border-none cursor-pointer transition-all font-display uppercase hover:shadow-[0_0_20px_var(--color-neon-dim)]"
              onClick={() => navigate('/compiler')}
            >
              ← BACK TO COMPILER
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VisualizeLayout;
