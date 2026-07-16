import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCompile } from '../context/CompileContext';
import LoginModal from './LoginModal';
import RegisterModal from './RegisterModal';
import UserMenu from './UserMenu';
import FileBrowser from './FileBrowser';

const Layout: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { handleCompile, loading, handleCancel } = useCompile();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  const isLanding = location.pathname === '/';
  const isCompiler = location.pathname === '/compiler';
  const isVisualizing = location.pathname.startsWith('/visualize');
  const isEditor = isCompiler || isVisualizing;

  return (
    <div className="scanlines flex flex-col h-screen overflow-hidden bg-[var(--color-void)]">
      {/* Skip link for keyboard navigation */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Header — terminal HUD style */}
      <header className="flex justify-between items-center px-5 h-12 bg-[var(--color-card)] border-b border-[var(--color-border)] shrink-0 z-50"
        style={{ animation: 'crt-flicker 8s infinite' }}>
        <div className="flex items-center gap-4">
          {/* Logo — ASCII style */}
          <div
            className="flex items-center gap-2 cursor-pointer select-none group"
            onClick={() => navigate('/')}
          >
            <div className="w-7 h-7 border border-[var(--color-neon)] flex items-center justify-center text-[var(--color-neon)] text-[10px] font-bold group-hover:bg-[var(--color-neon)] group-hover:text-[var(--color-void)] transition-all"
              style={{ fontFamily: 'var(--font-display)' }}>
              CV
            </div>
            <span className="text-[11px] font-bold text-[var(--color-text)] group-hover:text-[var(--color-neon)] transition-colors tracking-[0.12em]"
              style={{ fontFamily: 'var(--font-display)' }}>
              COMPILER VIZ
            </span>
          </div>

          {/* Separator */}
          <div className="w-px h-5 bg-[var(--color-border)]" />

          {/* Nav link — terminal prompt style */}
          {isEditor && (
            <button
              className={`px-3 py-1 text-[10px] font-bold tracking-[0.1em] border transition-all
                ${isCompiler
                  ? 'text-[var(--color-neon)] border-[var(--color-neon)] bg-[var(--color-neon)]/5'
                  : 'text-[var(--color-text-muted)] border-transparent hover:text-[var(--color-text)] hover:border-[var(--color-border)]'}`}
              style={{ fontFamily: 'var(--font-display)' }}
              onClick={() => navigate('/compiler')}
            >
              {'> '}EDITOR
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isEditor && (
            <>
              {/* Compile button — neon style */}
              <button
                className={`btn-neon px-5 py-1.5 text-[10px] tracking-[0.12em] ${loading ? 'opacity-70' : ''}`}
                onClick={handleCompile}
                disabled={loading}
              >
                <span>
                  {loading ? (
                    <span className="flex items-center gap-1.5">
                      <span className="animate-spin">⟳</span> COMPILING...
                    </span>
                  ) : (
                    '▶ COMPILE'
                  )}
                </span>
              </button>
              {loading && (
                <button
                  className="px-2.5 py-1.5 text-[10px] font-bold text-[var(--color-rose)] border border-[var(--color-rose)] hover:bg-[var(--color-rose)] hover:text-[var(--color-void)] transition-all tracking-wider"
                  style={{ fontFamily: 'var(--font-display)' }}
                  onClick={handleCancel}
                  aria-label="Cancel compilation"
                >
                  ✕
                </button>
              )}
              <button
                className={`px-3 py-1.5 text-[10px] font-bold tracking-[0.1em] border transition-all
                  ${isVisualizing
                    ? 'text-[var(--color-magenta)] border-[var(--color-magenta)] bg-[var(--color-magenta)]/5'
                    : 'text-[var(--color-text-muted)] border-[var(--color-border)] hover:text-[var(--color-text)] hover:border-[var(--color-text-muted)]'}`}
                style={{ fontFamily: 'var(--font-display)' }}
                onClick={() => navigate('/visualize/tokens')}
              >
                ◎ VISUALIZE
              </button>
            </>
          )}
          {!isEditor && !isLanding && (
            <button
              className="px-3 py-1.5 text-[10px] font-bold text-[var(--color-text-muted)] border border-[var(--color-border)] hover:text-[var(--color-text)] hover:border-[var(--color-text-muted)] transition-all tracking-[0.1em]"
              style={{ fontFamily: 'var(--font-display)' }}
              onClick={() => navigate('/compiler')}
            >
              {'> '}EDITOR
            </button>
          )}

          {/* Separator */}
          <div className="w-px h-5 bg-[var(--color-border)] mx-1" />

          {isAuthenticated ? (
            <UserMenu />
          ) : (
            <>
              <button
                className="px-3 py-1.5 text-[10px] font-bold text-[var(--color-text-muted)] hover:text-[var(--color-neon)] transition-colors tracking-[0.1em]"
                style={{ fontFamily: 'var(--font-display)' }}
                onClick={() => setShowLoginModal(true)}
              >
                SIGN IN
              </button>
              <button
                className="px-3 py-1.5 text-[10px] font-bold text-[var(--color-neon)] border border-[var(--color-neon)] hover:bg-[var(--color-neon)] hover:text-[var(--color-void)] transition-all tracking-[0.1em]"
                style={{ fontFamily: 'var(--font-display)' }}
                onClick={() => setShowRegisterModal(true)}
              >
                REGISTER
              </button>
            </>
          )}
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {isAuthenticated && isEditor && <FileBrowser />}
        <main id="main-content" className="flex-1 flex flex-col min-h-0 overflow-hidden" role="main">
          <Outlet />
        </main>
      </div>

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSwitchToRegister={() => { setShowLoginModal(false); setShowRegisterModal(true); }}
      />
      <RegisterModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onSwitchToLogin={() => { setShowRegisterModal(false); setShowLoginModal(true); }}
      />
    </div>
  );
};

export default Layout;
