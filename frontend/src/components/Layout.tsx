import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sun, Moon, Eye, Workflow, Code, Terminal, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import LoginModal from './LoginModal';
import RegisterModal from './RegisterModal';
import UserMenu from './UserMenu';
import FileBrowser from './FileBrowser';
import { clearScrollMemory } from '../hooks/useScrollMemory';

const Layout: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close the mobile menu whenever the route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const cycleTheme = () => {
    const order: Array<'dark' | 'light'> = ['dark', 'light'];
    const next = order[(order.indexOf(theme) + 1) % order.length];
    setTheme(next);
  };

  const ThemeIcon = theme === 'dark' ? Moon : Sun;

  const isCompiler = location.pathname === '/compiler';
  const isVisualizing = location.pathname.startsWith('/visualize');
  const isPipeline = location.pathname === '/pipeline';
  const isLanding = location.pathname === '/';

  const navItems = [
    { path: '/pipeline', label: t('nav.pipeline'), icon: Workflow, active: isPipeline },
    { path: '/compiler', label: t('nav.compiler'), icon: Code, active: isCompiler },
    { path: '/visualize/lexical', label: t('nav.visualizer'), icon: Eye, active: isVisualizing },
  ];

  return (
    <div className="flex flex-col h-[100dvh] min-h-screen md:h-screen overflow-hidden bg-[var(--color-void)]">
      {/* Skip link for keyboard navigation */}
      <a href="#main-content" className="skip-link">
        {t('nav.skipToContent')}
      </a>

      {/* Header — terminal HUD style */}
      <header className="flex justify-between items-center px-3 sm:px-6 h-14 bg-[var(--color-card)] border-b border-[var(--color-border)] shrink-0 z-50"
        style={{ animation: 'crt-flicker 8s infinite' }}>
        <div className="flex items-center gap-2 sm:gap-5 min-w-0">
          {/* Logo */}
          <div
            className="flex items-center gap-2 cursor-pointer select-none group"
            onClick={() => { clearScrollMemory('/'); navigate('/'); }}
          >
            <div className="w-8 h-8 shrink-0 border border-[var(--color-neon)] flex items-center justify-center text-[var(--color-neon)] group-hover:bg-[var(--color-neon)] group-hover:text-[var(--color-void)] transition-all">
              <Terminal size={16} />
            </div>
            <span className="hidden lg:block text-xs font-bold text-[var(--color-text)] group-hover:text-[var(--color-neon)] transition-colors tracking-[0.12em] whitespace-nowrap"
              style={{ fontFamily: 'var(--font-display)' }}>
              Compiler Visualizer
            </span>
          </div>

          {/* Separator — desktop only */}
          <div className="hidden md:block w-px h-6 bg-[var(--color-border)]" />

          {/* Pipeline nav links — desktop */}
          <div className="hidden md:flex items-center gap-1 lg:gap-2">
            {navItems.map((item) => (
              <button
                key={item.path}
                className={`px-2 lg:px-3 xl:px-4 py-2 text-xs font-bold tracking-[0.1em] border transition-all flex items-center gap-1 lg:gap-1.5
                  ${item.active
                    ? 'text-[var(--color-neon)] border-[var(--color-neon)] bg-[var(--color-neon)]/5'
                    : 'text-[var(--color-text-muted)] border-transparent hover:text-[var(--color-text)] hover:border-[var(--color-border)]'}`}
                style={{ fontFamily: 'var(--font-display)' }}
                onClick={() => navigate(item.path)}
              >
                <item.icon size={12} />
                <span className="hidden xl:inline">{item.label}</span>
                <span className="xl:hidden sr-only">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Mobile hamburger menu */}
          <div className="md:hidden relative">
            <button
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[var(--color-text-dim)] hover:text-[var(--color-neon)] hover:bg-[var(--color-surface)] transition-colors"
              onClick={() => setMobileMenuOpen(open => !open)}
              aria-expanded={mobileMenuOpen}
              aria-label={t('nav.toggleMenu')}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {mobileMenuOpen && (
              <div className="fixed inset-x-0 top-14 mx-auto mt-2 w-52 bg-[var(--color-card)] border border-[var(--color-border-bright)] shadow-[0_16px_48px_rgba(0,0,0,0.5)] flex flex-col p-2 gap-1 z-[60]">
                {navItems.map((item) => (
                  <button
                    key={item.path}
                    className={`px-4 py-3 text-xs font-bold tracking-[0.12em] border transition-all flex items-center gap-2 text-left uppercase
                      ${item.active
                        ? 'text-[var(--color-neon)] border-[var(--color-neon)] bg-[var(--color-neon)]/5'
                        : 'text-[var(--color-text-muted)] border-transparent hover:text-[var(--color-text)] hover:border-[var(--color-border)]'}`}
                    style={{ fontFamily: 'var(--font-display)' }}
                    onClick={() => navigate(item.path)}
                  >
                    <item.icon size={14} />
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Separator — hidden on small screens */}
          <div className="hidden sm:block w-px h-6 bg-[var(--color-border)] mx-1" />

          {/* Theme toggle */}
          <button
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[var(--color-text-dim)] hover:text-[var(--color-neon)] hover:bg-[var(--color-surface)] transition-colors"
            onClick={cycleTheme}
            title={`${t('nav.themeLabel')}: ${theme}`}
          >
            <ThemeIcon size={18} />
          </button>

          {/* Language toggle */}
          <button
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-xs font-bold text-[var(--color-text-dim)] hover:text-[var(--color-neon)] transition-colors tracking-wider"
            style={{ fontFamily: 'var(--font-display)' }}
            onClick={() => setLanguage(language === 'en' ? 'my' : 'en')}
            title={language === 'en' ? t('nav.switchToMyanmar') : t('nav.switchToEnglish')}
          >
            {language === 'en' ? 'မြန်မာ' : 'EN'}
          </button>

          {/* Separator */}
          <div className="hidden sm:block w-px h-6 bg-[var(--color-border)]" />

          {isAuthenticated ? (
            <UserMenu />
          ) : (
            <button
              className="px-4 py-2 text-xs font-bold text-[var(--color-neon)] border border-[var(--color-neon)] hover:bg-[var(--color-neon)] hover:text-[var(--color-void)] transition-all tracking-[0.1em] cursor-pointer bg-transparent min-h-[44px]"
              style={{ fontFamily: 'var(--font-display)' }}
              onClick={() => setShowLoginModal(true)}
            >
              {t('nav.signIn')}
            </button>
          )}
        </div>
      </header>

      {/* Body */}
      <div className="relative flex flex-1 min-h-0 overflow-hidden">
        {isAuthenticated && isCompiler && <FileBrowser />}
        <main
          id="main-content"
          data-scroll-root={isLanding ? 'true' : undefined}
          className={`flex-1 flex flex-col min-h-0 ${isLanding ? 'overflow-y-auto' : 'overflow-hidden'}`}
          role="main"
        >
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
