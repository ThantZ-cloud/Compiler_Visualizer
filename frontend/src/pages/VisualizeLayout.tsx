import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, NavLink, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useCompile } from '../context/CompileContext';
import { SAMPLE_JAVA_CODE } from '../data/sampleCode';
import { Braces, TreePine, Code2, Binary, Eye, Workflow, Search } from 'lucide-react';
import { useScrollMemory } from '../hooks/useScrollMemory';

const VisualizeLayout: React.FC = () => {
  const { t } = useTranslation();
  const { result, loading, compileSample } = useCompile();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const panelScrollRef = useRef<HTMLDivElement>(null);

  // Remember scroll position of the visualization panel across navigations
  useScrollMemory(panelScrollRef);

  const isLexical = location.pathname === '/visualize' || location.pathname.startsWith('/visualize/lexical') || location.pathname.startsWith('/visualize/tokens');
  const isSyntax = location.pathname.startsWith('/visualize/syntax') || location.pathname.startsWith('/visualize/ast');
  const isSemantic = location.pathname.startsWith('/visualize/semantic');
  const isCodegen = location.pathname.startsWith('/visualize/codegen');
  const isOptimizer = location.pathname.startsWith('/visualize/cfg') || location.pathname.startsWith('/visualize/optimizer');
  const isBytecode = location.pathname.startsWith('/visualize/bytecode');
  const activeView = searchParams.get('view') === 'static' ? 'static' : 'dynamic';

  const phaseInfo = isLexical || isSyntax || isSemantic
    ? { label: t('visualize.phaseBadge.frontEnd'), color: 'var(--color-cyan)', bg: 'var(--color-cyan-dim)' }
    : isOptimizer
      ? { label: t('visualize.phaseBadge.optimizer'), color: 'var(--color-neon)', bg: 'var(--color-neon-dim)' }
      : isCodegen || isBytecode
        ? { label: t('visualize.phaseBadge.backEnd'), color: 'var(--color-rose)', bg: 'var(--color-rose-dim)' }
        : null;

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
    { path: '/visualize/lexical', label: t('visualize.nav.lexical'), icon: Braces },
    { path: '/visualize/syntax', label: t('visualize.nav.syntax'), icon: TreePine },
    { path: '/visualize/semantic', label: t('visualize.nav.semantic'), icon: Search },
    { path: '/visualize/cfg', label: t('visualize.nav.optimizer'), icon: Workflow },
    { path: '/visualize/codegen', label: t('visualize.nav.codegen'), icon: Code2 },
    { path: '/visualize/bytecode', label: t('visualize.nav.bytecode'), icon: Binary },
  ];

  const isActivePhase = (path: string) =>
    location.pathname === '/visualize'
      ? path === '/visualize/lexical'
      : location.pathname.startsWith(path);

  const showViewToggle = isLexical || isSyntax || isSemantic || isCodegen || isOptimizer || isBytecode;

  // Shared class resolver so the mobile strip and desktop sidebar stay in sync
  const phaseLinkClass = (path: string) => {
    const isActive = isActivePhase(path);
    return `flex items-center justify-center gap-2 text-xs font-bold tracking-[0.12em] border transition-all font-display uppercase no-underline whitespace-nowrap ${
      isActive
        ? 'text-[var(--color-neon)] bg-[var(--color-neon-dim)] border-[var(--color-neon)] shadow-[0_0_10px_var(--color-neon-dim),inset_0_0_10px_var(--color-neon-dim)]'
        : 'text-[var(--color-text-muted)] bg-transparent border-transparent hover:text-[var(--color-text)] hover:border-[var(--color-border)]'
    }`;
  };

  const ViewToggle = () => (
    <div className="flex flex-col gap-0.5 bg-[var(--color-card)] border border-[var(--color-border)] p-0.5">
      <button
        onClick={() => setView('dynamic')}
        className={`px-3 py-[6px] text-[9px] font-bold tracking-[0.1em] uppercase font-display border-none cursor-pointer transition-all text-center whitespace-nowrap ${
          activeView === 'dynamic'
            ? 'text-[var(--color-neon)] bg-[var(--color-neon-dim)] shadow-[0_0_8px_var(--color-neon-dim)]'
            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
        }`}
      >
        {t('lexical.tabs.pipeline')}
      </button>
      <button
        onClick={() => setView('static')}
        className={`px-3 py-[6px] text-[9px] font-bold tracking-[0.1em] uppercase font-display border-none cursor-pointer transition-all text-center whitespace-nowrap ${
          activeView === 'static'
            ? 'text-[var(--color-neon)] bg-[var(--color-neon-dim)] shadow-[0_0_8px_var(--color-neon-dim)]'
            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
        }`}
      >
        {isSemantic ? t('semantic.symbolExplorer') : isCodegen ? t('codegen.tabs.static') : isOptimizer ? t('visualize.tabs.rawCfg') : isBytecode ? t('visualize.tabs.rawBytecode') : t('lexical.tabs.tokenBrowser')}
      </button>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
      {/* ── Mobile / tablet: horizontal scrollable phase strip ── */}
      <nav className="lg:hidden shrink-0 flex items-center gap-2 py-2.5 px-3 bg-[var(--color-card)] border-b border-[var(--color-border)] overflow-x-auto">
        <button
          className="shrink-0 px-3 py-2 text-[10px] font-bold tracking-[0.1em] text-[var(--color-text-muted)] bg-transparent border border-[var(--color-border)] cursor-pointer transition-all whitespace-nowrap font-display uppercase hover:text-[var(--color-neon)] hover:border-[var(--color-neon)]"
          onClick={() => navigate('/compiler')}
          aria-label={t('nav.compiler')}
        >
          ←
        </button>

        <div className="shrink-0 w-px h-6 bg-[var(--color-border)]" />

        {phases.map((phase) => (
          <NavLink
            key={phase.path}
            to={phase.path}
            className={() => `${phaseLinkClass(phase.path)} shrink-0 px-4 py-2`}
          >
            <span className="text-xs"><phase.icon size={12} /></span>
            {phase.label}
          </NavLink>
        ))}

        {showViewToggle && (
          <>
            <div className="shrink-0 w-px h-6 bg-[var(--color-border)]" />
            <div className="shrink-0 flex flex-row gap-0.5 bg-[var(--color-card)] border border-[var(--color-border)] p-0.5">
              <button
                onClick={() => setView('dynamic')}
                className={`px-3 py-[6px] text-[9px] font-bold tracking-[0.1em] uppercase font-display border-none cursor-pointer transition-all text-center whitespace-nowrap ${
                  activeView === 'dynamic'
                    ? 'text-[var(--color-neon)] bg-[var(--color-neon-dim)] shadow-[0_0_8px_var(--color-neon-dim)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                {t('lexical.tabs.pipeline')}
              </button>
              <button
                onClick={() => setView('static')}
                className={`px-3 py-[6px] text-[9px] font-bold tracking-[0.1em] uppercase font-display border-none cursor-pointer transition-all text-center whitespace-nowrap ${
                  activeView === 'static'
                    ? 'text-[var(--color-neon)] bg-[var(--color-neon-dim)] shadow-[0_0_8px_var(--color-neon-dim)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                {isSemantic ? t('semantic.symbolExplorer') : isCodegen ? t('codegen.tabs.static') : isOptimizer ? t('visualize.tabs.rawCfg') : isBytecode ? t('visualize.tabs.rawBytecode') : t('lexical.tabs.tokenBrowser')}
              </button>
            </div>
          </>
        )}

        {phaseInfo && (
          <div
            className="shrink-0 ml-auto text-center text-[9px] font-bold tracking-[0.25em] px-3 py-1.5 border font-display uppercase whitespace-nowrap self-center"
            style={{ color: phaseInfo.color, borderColor: `color-mix(in srgb, ${phaseInfo.color} 35%, transparent)`, background: (phaseInfo as unknown as { bg: string }).bg }}
          >
            {phaseInfo.label}
          </div>
        )}
      </nav>

      {/* ── Desktop: vertical phase sidebar ── */}
      <nav className="hidden lg:flex w-60 flex-col items-stretch gap-4 py-5 px-4 bg-[var(--color-card)] border-r border-[var(--color-border)] shrink-0 overflow-y-auto">
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
              className={() => `${phaseLinkClass(phase.path)} justify-center px-5 py-2.5`}
            >
              <span className="text-xs"><phase.icon size={12} /></span>
              {phase.label}
            </NavLink>
          ))}
        </div>

        {showViewToggle && <ViewToggle />}

        {phaseInfo && (
          <div
            className="text-center text-[9px] font-bold tracking-[0.25em] py-1.5 border font-display uppercase"
            style={{ color: phaseInfo.color, borderColor: `color-mix(in srgb, ${phaseInfo.color} 35%, transparent)`, background: (phaseInfo as unknown as { bg: string }).bg }}
          >
            {phaseInfo.label}
          </div>
        )}

        {result && (
          <div className="mt-auto text-center text-[10px] text-[var(--color-text-muted)] whitespace-nowrap font-mono">
            {result.tokens?.length} tokens • {result.compilationTimeMs}ms
          </div>
        )}
      </nav>

      <div
        ref={panelScrollRef}
        data-scroll-root="true"
        className="flex-1 min-h-0 overflow-auto p-3 sm:p-4 lg:p-6 bg-[var(--color-void)]"
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-muted)] text-center gap-3">
            <div className="text-sm font-mono animate-pulse">
              {t('editor.compiling')}...
            </div>
          </div>
        ) : result ? (
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
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                className="mt-3 px-6 py-3 text-[10px] font-bold tracking-[0.12em] text-[var(--color-void)] bg-[var(--color-neon)] border-none cursor-pointer transition-all font-display uppercase hover:shadow-[0_0_20px_var(--color-neon-dim)]"
                onClick={() => compileSample(SAMPLE_JAVA_CODE)}
              >
                {t('visualize.loadSample')}
              </button>
              <button
                className="mt-3 px-6 py-3 text-[10px] font-bold tracking-[0.12em] text-[var(--color-text-muted)] bg-transparent border border-[var(--color-border)] cursor-pointer transition-all font-display uppercase hover:text-[var(--color-neon)] hover:border-[var(--color-neon)]"
                onClick={() => navigate('/compiler')}
              >
                ← BACK TO COMPILER
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VisualizeLayout;
