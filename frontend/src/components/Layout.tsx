import React, { useState, useRef, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sun, Moon, Monitor, Eye, Compass, Share2, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCompile } from '../context/CompileContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import LoginModal from './LoginModal';
import RegisterModal from './RegisterModal';
import UserMenu from './UserMenu';
import FileBrowser from './FileBrowser';
import PresetSelect from './PresetSelect';

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
  const [helpOpen, setHelpOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const helpRef = useRef<HTMLDivElement>(null);

  const cycleTheme = () => {
    const order: Array<'dark' | 'light' | 'system'> = ['light', 'dark', 'system'];
    const next = order[(order.indexOf(theme) + 1) % order.length];
    setTheme(next);
  };

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  const isCompiler = location.pathname === '/compiler';
  const isVisualizing = location.pathname.startsWith('/visualize');

  // Close the help popover when clicking anywhere outside it.
  useEffect(() => {
    if (!helpOpen) return;
    const onClick = (e: MouseEvent) => {
      if (helpRef.current && !helpRef.current.contains(e.target as Node)) {
        setHelpOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [helpOpen]);

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard API unavailable — fall back to a prompt so the link is still shared.
      window.prompt('Copy this link:', url);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const navLink = (active: boolean) =>
    `rounded-[10px] px-3.5 py-2 text-[13px] font-medium transition-colors ${
      active
        ? 'bg-[var(--color-neon)]/10 text-[var(--color-neon)]'
        : 'text-[var(--color-text-dim)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]'
    }`;

  const iconBtn =
    'flex h-9 w-9 items-center justify-center rounded-[10px] text-[var(--color-text-dim)] ' +
    'hover:bg-[var(--color-surface)] hover:text-[var(--color-neon)] transition-colors';

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--color-void)]">
      {/* Skip link for keyboard navigation */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Top navigation bar */}
      <header className="z-50 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-card)] px-4">
        {/* Left: logo + primary nav */}
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            className="group flex cursor-pointer items-center gap-2.5"
            onClick={() => navigate('/')}
            aria-label={t('nav.brand')}
          >
            {/* Connected-nodes mark (emerald + blue) */}
            <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-gradient-to-br from-[#3B82F6] to-[#10B981] shadow-[var(--shadow-card)] transition-transform group-hover:scale-105">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                <path d="M12 5 L6 18 M12 5 L18 18" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" opacity="0.85" />
                <circle cx="12" cy="5" r="2.4" fill="#FFFFFF" />
                <circle cx="6" cy="18" r="2.4" fill="#FFFFFF" />
                <circle cx="18" cy="18" r="2.4" fill="#FFFFFF" />
              </svg>
            </span>
            <span className="text-[17px] font-bold tracking-tight text-[var(--color-text)]">
              {t('nav.brand')}
            </span>
          </button>

          <div className="h-6 w-px bg-[var(--color-border)]" />

          <button type="button" className={navLink(isCompiler)} onClick={() => navigate('/compiler')}>
            {t('nav.compiler')}
          </button>
          <button
            type="button"
            className={`${navLink(isVisualizing)} flex items-center gap-1.5`}
            onClick={() => navigate('/visualize/lexical')}
          >
            <Eye size={14} />
            {t('nav.visualize')}
          </button>
        </div>

        {/* Center: quick preset select (Studio route only) */}
        {isCompiler && (
          <div className="absolute left-1/2 hidden -translate-x-1/2 md:block">
            <PresetSelect />
          </div>
        )}

        {/* Right: actions */}
        <div className="flex shrink-0 items-center gap-1.5">
          {loading && (
            <button
              type="button"
              className="mr-1 rounded-full border border-[var(--color-rose)] px-3.5 py-1.5 text-[12px] font-semibold
                text-[var(--color-rose)] transition-colors hover:bg-[var(--color-rose)] hover:text-white"
              onClick={handleCancel}
              aria-label="Cancel compilation"
            >
              Cancel
            </button>
          )}

          {/* Tour / Help */}
          <div className="relative" ref={helpRef}>
            <button
              type="button"
              className={iconBtn}
              onClick={() => setHelpOpen(o => !o)}
              title={t('nav.help')}
              aria-label={t('nav.help')}
              aria-expanded={helpOpen}
            >
              <Compass size={18} />
            </button>
            {helpOpen && (
              <div className="card-soft absolute right-0 top-11 z-50 w-72 p-4">
                <p className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-text)]">
                  <Compass size={14} className="text-[var(--color-neon)]" />
                  {t('nav.tour')}
                </p>
                <ol className="list-decimal space-y-1.5 pl-4 text-[12.5px] leading-relaxed text-[var(--color-text-dim)]">
                  <li>Pick an example from the dropdown, or write your own Java.</li>
                  <li>Press <span className="font-semibold text-[var(--color-cyan)]">Compile &amp; Step</span>.</li>
                  <li>Watch each pipeline stage light up as it runs.</li>
                  <li>Use the playback deck to play, pause, and step through it.</li>
                </ol>
              </div>
            )}
          </div>

          {/* Theme toggle */}
          <button
            type="button"
            className={iconBtn}
            onClick={cycleTheme}
            title={`Theme: ${theme}`}
            aria-label="Toggle theme"
          >
            <ThemeIcon size={18} />
          </button>

          {/* Language toggle */}
          <button
            type="button"
            className={`${iconBtn} w-auto px-2 text-[12px] font-semibold`}
            onClick={() => setLanguage(language === 'en' ? 'my' : 'en')}
            title={language === 'en' ? 'Switch to Myanmar' : 'Switch to English'}
          >
            {language === 'en' ? 'မြန်မာ' : 'EN'}
          </button>

          {/* Share Visualizer — primary pill */}
          <button
            type="button"
            onClick={handleShare}
            className="ml-1 flex items-center gap-1.5 rounded-full bg-[var(--color-neon)] px-4 py-2 text-[12.5px]
              font-semibold text-white shadow-[var(--shadow-soft)] transition-colors hover:bg-[#2563EB]"
          >
            {copied ? <Check size={14} /> : <Share2 size={14} />}
            {copied ? 'Copied!' : t('nav.share')}
          </button>

          <div className="mx-1 h-6 w-px bg-[var(--color-border)]" />

          {isAuthenticated ? (
            <UserMenu />
          ) : (
            <>
              <button
                type="button"
                className="rounded-[10px] px-3 py-2 text-[13px] font-medium text-[var(--color-text-dim)]
                  transition-colors hover:text-[var(--color-neon)]"
                onClick={() => setShowLoginModal(true)}
              >
                {t('nav.signIn')}
              </button>
              <button
                type="button"
                className="rounded-full border border-[var(--color-neon)] px-4 py-2 text-[12.5px] font-semibold
                  text-[var(--color-neon)] transition-colors hover:bg-[var(--color-neon)] hover:text-white"
                onClick={() => setShowRegisterModal(true)}
              >
                {t('nav.register')}
              </button>
            </>
          )}
        </div>
      </header>

      {/* Body */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {isAuthenticated && isCompiler && <FileBrowser />}
        <main id="main-content" className="flex min-h-0 flex-1 flex-col overflow-hidden" role="main">
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
