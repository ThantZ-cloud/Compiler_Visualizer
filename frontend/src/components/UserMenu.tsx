import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const UserMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout, isAuthenticated } = useAuth();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isAuthenticated || !user) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        className="flex items-center gap-2 px-2.5 py-[5px] bg-transparent border border-[var(--color-border)] cursor-pointer transition-all hover:border-[var(--color-neon)]"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="w-[22px] h-[22px] bg-[var(--color-neon)] text-[var(--color-void)] flex items-center justify-center text-[10px] font-bold font-display">
          {user.username.charAt(0).toUpperCase()}
        </span>
        <span className="text-[10px] font-bold text-[var(--color-text)] font-display tracking-[0.08em] uppercase">
          {user.username}
        </span>
        <span className="text-[10px] text-[var(--color-text-muted)] transition-transform group-hover:text-[var(--color-neon)]">▾</span>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 min-w-[180px] bg-[var(--color-card)] border border-[var(--color-border)] shadow-[0_0_15px_rgba(0,0,0,0.5)] z-[100] overflow-hidden">
          <div className="p-3 flex flex-col gap-0.5 border-b border-[var(--color-border)]">
            <span className="text-[11px] font-bold text-[var(--color-neon)] font-display tracking-[0.1em] uppercase">
              {user.username}
            </span>
            {user.email && (
              <span className="text-[10px] text-[var(--color-text-muted)] font-mono">{user.email}</span>
            )}
          </div>
          <div className="h-px bg-[var(--color-border)]" />
          <button
            className="block w-full px-3 py-2.5 text-[11px] font-bold tracking-[0.1em] text-[var(--color-rose)] bg-transparent border-none text-left cursor-pointer transition-all font-display uppercase hover:bg-[rgba(255,51,102,0.1)] hover:border-l-2 hover:border-l-[var(--color-rose)]"
            onClick={() => { logout(); setIsOpen(false); }}
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
