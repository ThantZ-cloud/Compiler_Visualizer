import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToRegister: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onSwitchToRegister }) => {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-[rgba(10,10,15,0.85)] flex items-center justify-center z-[100] backdrop-blur-[4px]"
      onClick={onClose}
    >
      <div
        className="bg-[var(--color-card)] border border-[var(--color-neon)] w-full max-w-[400px] p-8 shadow-[0_0_30px_var(--color-neon-dim),inset_0_0_30px_var(--color-neon-dim)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-sm font-bold text-[var(--color-neon)] font-display tracking-[0.15em] uppercase">
            {t('auth.loginTitle')}
          </h2>
          <button
            className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-transparent border border-[var(--color-border)] text-[var(--color-text-muted)] text-lg cursor-pointer transition-all font-mono hover:text-[var(--color-rose)] hover:border-[var(--color-rose)]"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {error && (
            <div className="px-3 py-2.5 bg-[rgba(255,51,102,0.1)] border border-[var(--color-rose)] text-[var(--color-rose)] text-[11px] font-mono">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="login-username" className="text-[10px] font-bold text-[var(--color-text-dim)] font-display tracking-[0.12em] uppercase">
              {t('auth.username')}
            </label>
            <input
              id="login-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
              autoFocus
              className="px-3 py-2.5 bg-[var(--color-void)] text-[var(--color-neon)] border border-[var(--color-border)] text-[13px] font-mono transition-all focus:outline-none focus:border-[var(--color-neon)] focus:shadow-[0_0_10px_var(--color-neon-dim)] placeholder:text-[var(--color-text-muted)]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="login-password" className="text-[10px] font-bold text-[var(--color-text-dim)] font-display tracking-[0.12em] uppercase">
              {t('auth.password')}
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              className="px-3 py-2.5 bg-[var(--color-void)] text-[var(--color-neon)] border border-[var(--color-border)] text-[13px] font-mono transition-all focus:outline-none focus:border-[var(--color-neon)] focus:shadow-[0_0_10px_var(--color-neon-dim)] placeholder:text-[var(--color-text-muted)]"
            />
          </div>

          <button
            type="submit"
            className="px-5 py-3 text-sm font-bold tracking-[0.12em] text-[var(--color-void)] bg-[var(--color-neon)] border-none cursor-pointer transition-all mt-1 font-display uppercase disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_0_20px_var(--color-neon-dim)]"
            disabled={loading}
          >
            {loading ? '...' : t('auth.loginButton')}
          </button>

          <p className="text-center text-xs text-[var(--color-text-muted)] mt-2 font-mono">
            {t('auth.noAccount')}{' '}
            <button
              type="button"
              className="bg-transparent border-none text-[var(--color-neon)] cursor-pointer text-xs p-0 font-mono underline hover:text-[var(--color-cyan)]"
              onClick={onSwitchToRegister}
            >
              {t('auth.switchToRegister')}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
};

export default LoginModal;
