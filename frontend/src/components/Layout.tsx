import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sun, Moon, Monitor, Eye } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCompile } from '../context/CompileContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import LoginModal from './LoginModal';
import RegisterModal from './RegisterModal';
import UserMenu from './UserMenu';
import FileBrowser from './FileBrowser';

const Layout: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { loading, handleCancel } = useCompile();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  const cycleTheme = () => {
    const order: Array<'dark' | 'light' | 'system'> = ['dark', 'light', 'system'];
    const next = order[(order.indexOf(theme) + 1) % order.length];
    setTheme(next);
  };

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  const isCompiler = location.pathname === '/compiler';
  const isVisualizing = location.pathname.startsWith('/visualize');

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[var(--color-void)]">
      {/* Skip link for keyboard navigation */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Header — terminal HUD style */}
      <header className="flex justify-between items-center px-6 h-14 bg-[var(--color-card)] border-b border-[var(--color-border)] shrink-0 z-50"
        style={{ animation: 'crt-flicker 8s infinite' }}>
        <div className="flex items-center gap-5">
          {/* Logo */}
          <div
            className="flex items-center gap-2 cursor-pointer select-none group"
            onClick={() => navigate('/')}
          >
            <div className="w-8 h-8 border border-[var(--color-neon)] flex items-center justify-center text-[var(--color-neon)] group-hover:bg-[var(--color-neon)] group-hover:text-[var(--color-void)] transition-all">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3" />
                <path d="M18 2l4 4-10 10H8v-4L18 2z" />
              </svg>
            </div>
            <span className="text-xs font-bold text-[var(--color-text)] group-hover:text-[var(--color-neon)] transition-colors tracking-[0.12em]"
              style={{ fontFamily: 'var(--font-display)' }}>
              Compilation Visualizer
            </span>
          </div>

          {/* Separator */}
          <div className="w-px h-6 bg-[var(--color-border)]" />

          {/* Compiler nav link */}
          <button
            className={`px-4 py-2 text-xs font-bold tracking-[0.1em] border transition-all
              ${isCompiler
                ? 'text-[var(--color-neon)] border-[var(--color-neon)] bg-[var(--color-neon)]/5'
                : 'text-[var(--color-text-muted)] border-transparent hover:text-[var(--color-text)] hover:border-[var(--color-border)]'}`}
            style={{ fontFamily: 'var(--font-display)' }}
            onClick={() => navigate('/compiler')}
          >
            {t('nav.compiler')}
          </button>

          {/* Visualizer nav link */}
          <button
            className={`px-4 py-2 text-xs font-bold tracking-[0.1em] border transition-all flex items-center gap-1.5
              ${isVisualizing
                ? 'text-[var(--color-neon)] border-[var(--color-neon)] bg-[var(--color-neon)]/5'
                : 'text-[var(--color-text-muted)] border-transparent hover:text-[var(--color-text)] hover:border-[var(--color-border)]'}`}
            style={{ fontFamily: 'var(--font-display)' }}
            onClick={() => navigate('/visualize/tokens')}
          >
            <Eye size={12} />
            Visualizer
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Cancel button — shows when compiling */}
          {loading && (
            <button
              className="btn-neon px-4 py-2 text-xs tracking-[0.12em] border-[var(--color-rose)] text-[var(--color-rose)] hover:bg-[var(--color-rose)] hover:text-[var(--color-void)]"
              style={{ fontFamily: 'var(--font-display)' }}
              onClick={handleCancel}
              aria-label="Cancel compilation"
            >
              CANCEL
            </button>
          )}

          {/* Separator */}
          <div className="w-px h-6 bg-[var(--color-border)] mx-1" />

          {/* Theme toggle */}
          <button
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[var(--color-text-dim)] hover:text-[var(--color-neon)] hover:bg-[var(--color-surface)] transition-colors"
            onClick={cycleTheme}
            title={`Theme: ${theme}`}
          >
            <ThemeIcon size={18} />
          </button>

          {/* Language toggle */}
          <button
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-xs font-bold text-[var(--color-text-dim)] hover:text-[var(--color-neon)] transition-colors tracking-wider"
            style={{ fontFamily: 'var(--font-display)' }}
            onClick={() => setLanguage(language === 'en' ? 'my' : 'en')}
            title={language === 'en' ? 'Switch to Myanmar' : 'Switch to English'}
          >
            {language === 'en' ? 'မြန်မာ' : 'EN'}
          </button>

          {/* Separator */}
          <div className="w-px h-6 bg-[var(--color-border)]" />

          {isAuthenticated ? (
            <UserMenu />
          ) : (
            <>
              <button
                className="px-4 py-2 text-xs font-bold text-[var(--color-text-muted)] hover:text-[var(--color-neon)] transition-colors tracking-[0.1em]"
                style={{ fontFamily: 'var(--font-display)' }}
                onClick={() => setShowLoginModal(true)}
              >
                {t('nav.signIn')}
              </button>
              <button
                className="px-4 py-2 text-xs font-bold text-[var(--color-neon)] border border-[var(--color-neon)] hover:bg-[var(--color-neon)] hover:text-[var(--color-void)] transition-all tracking-[0.1em]"
                style={{ fontFamily: 'var(--font-display)' }}
                onClick={() => setShowRegisterModal(true)}
              >
                {t('nav.register')}
              </button>
            </>
          )}
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {isAuthenticated && isCompiler && <FileBrowser />}
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
