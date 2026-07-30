import React, { useState, useEffect, useRef, useCallback } from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: (value?: string) => void;
  onCancel: () => void;
  /** "confirm" shows a standard yes/no dialog; "prompt" adds a text input field. */
  type?: 'confirm' | 'prompt';
  /** Placeholder text shown inside the prompt input (only when type="prompt"). */
  promptPlaceholder?: string;
  /** Pre-filled value for the prompt input (only when type="prompt"). */
  defaultValue?: string;
  /** Use rose/red accent instead of neon green (for destructive actions). */
  danger?: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'CONFIRM',
  cancelText = 'CANCEL',
  onConfirm,
  onCancel,
  type = 'confirm',
  promptPlaceholder = '',
  defaultValue = '',
  danger = false,
}) => {
  const [inputValue, setInputValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Reset input value when dialog opens
  useEffect(() => {
    if (isOpen) {
      setInputValue(defaultValue);
    }
  }, [isOpen, defaultValue]);

  // Focus input (prompt mode) or the dialog container when the dialog opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        if (type === 'prompt' && inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        } else if (dialogRef.current) {
          dialogRef.current.focus();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, type]);

  // Prevent body scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  // Keyboard handling
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
      if (e.key === 'Enter' && !e.defaultPrevented) {
        e.preventDefault();
        if (type === 'prompt') {
          if (inputValue.trim()) onConfirm(inputValue.trim());
        } else {
          onConfirm();
        }
      }
    },
    [onCancel, onConfirm, type, inputValue]
  );

  if (!isOpen) return null;

  const accentColor = danger ? 'var(--color-rose)' : 'var(--color-neon)';
  const accentDim = danger ? 'var(--color-rose-dim)' : 'var(--color-neon-dim)';

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Dialog card */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative z-10 w-full max-w-sm mx-4 bg-[var(--color-card)] border border-[var(--color-border)] outline-none"
        style={{
          boxShadow: `0 0 30px ${accentDim}, 0 0 60px ${accentDim}`,
        }}
      >
        {/* Corner accents */}
        <div
          className="absolute top-0 left-0 w-3 h-3 border-t border-l"
          style={{ borderColor: accentColor }}
        />
        <div
          className="absolute top-0 right-0 w-3 h-3 border-t border-r"
          style={{ borderColor: accentColor }}
        />
        <div
          className="absolute bottom-0 left-0 w-3 h-3 border-b border-l"
          style={{ borderColor: accentColor }}
        />
        <div
          className="absolute bottom-0 right-0 w-3 h-3 border-b border-r"
          style={{ borderColor: accentColor }}
        />

        <div className="p-6">
          {/* Title */}
          <h2
            id="confirm-dialog-title"
            className="text-sm font-bold tracking-[0.15em] uppercase mb-3"
            style={{
              fontFamily: 'var(--font-display)',
              color: accentColor,
              textShadow: `0 0 8px ${accentDim}`,
            }}
          >
            {title}
          </h2>

          {/* Message */}
          <p
            id="confirm-dialog-desc"
            className="text-[13px] leading-relaxed text-[var(--color-text-dim)] mb-5"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {message}
          </p>

          {/* Prompt input */}
          {type === 'prompt' && (
            <div className="mb-5">
              <input
                ref={inputRef}
                type="text"
                className="w-full h-9 px-3 text-[13px] bg-[var(--color-void)] border border-[var(--color-border)] text-[var(--color-neon)] outline-none focus:border-[var(--color-neon)] transition-colors"
                style={{ fontFamily: 'var(--font-mono)' }}
                placeholder={promptPlaceholder}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3">
            <button
              className="px-4 py-2 text-[11px] font-bold tracking-[0.1em] uppercase text-[var(--color-text-muted)] border border-[var(--color-border)] hover:border-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all"
              style={{ fontFamily: 'var(--font-display)' }}
              onClick={onCancel}
              type="button"
            >
              {cancelText}
            </button>

            <button
              className="px-4 py-2 text-[11px] font-bold tracking-[0.1em] uppercase transition-all"
              style={{
                fontFamily: 'var(--font-display)',
                color: accentColor,
                border: `1px solid ${accentColor}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = accentColor;
                e.currentTarget.style.color = 'var(--color-void)';
                e.currentTarget.style.boxShadow = `0 0 15px ${accentDim}, 0 0 30px ${accentDim}`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = accentColor;
                e.currentTarget.style.boxShadow = 'none';
              }}
              onClick={() => {
                if (type === 'prompt') {
                  if (inputValue.trim()) onConfirm(inputValue.trim());
                } else {
                  onConfirm();
                }
              }}
              type="button"
              disabled={type === 'prompt' && !inputValue.trim()}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
