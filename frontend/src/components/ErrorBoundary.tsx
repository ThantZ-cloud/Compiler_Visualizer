import React, { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Optional name shown in the fallback header (e.g. "AST Visualization") */
  name?: string;
  /** When true, renders a compact inline fallback instead of a full-page one */
  inline?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.name ? ` — ${this.props.name}` : ''}]`, error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const { name, inline } = this.props;
      const errorMessage = this.state.error?.message ?? 'An unexpected error occurred.';

      if (inline) {
        return (
          <div
            className="flex flex-col items-center justify-center gap-4 p-6 h-full text-center"
            role="alert"
            aria-live="assertive"
          >
            <AlertTriangle
              size={36}
              className="text-[var(--color-rose)] opacity-80"
              aria-hidden="true"
            />
            <p
              className="text-[11px] font-bold text-[var(--color-rose)] tracking-[0.15em] uppercase"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {name ? `${name} Error` : 'Visualization Error'}
            </p>
            <p
              className="text-[11px] text-[var(--color-text-muted)] max-w-sm leading-relaxed"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {errorMessage}
            </p>
            <button
              className="flex items-center gap-2 px-4 py-2 text-[10px] font-bold text-[var(--color-neon)] border border-[var(--color-neon)] hover:bg-[var(--color-neon)] hover:text-[var(--color-void)] transition-all tracking-[0.12em] cursor-pointer bg-transparent"
              style={{ fontFamily: 'var(--font-display)' }}
              onClick={this.handleReset}
              aria-label="Try again"
            >
              <RefreshCw size={11} aria-hidden="true" />
              TRY AGAIN
            </button>
          </div>
        );
      }

      return (
        <div
          className="flex flex-col items-center justify-center h-full w-full gap-6 p-8 text-center"
          role="alert"
          aria-live="assertive"
          style={{
            background: 'var(--color-void)',
          }}
        >
          {/* Glowing border container */}
          <div
            className="flex flex-col items-center gap-5 p-10 max-w-md border"
            style={{
              background: 'var(--color-card)',
              borderColor: 'var(--color-rose)',
              boxShadow: '0 0 30px var(--color-rose-dim), inset 0 0 20px var(--color-rose-dim)',
            }}
          >
            <AlertTriangle
              size={48}
              className="text-[var(--color-rose)]"
              aria-hidden="true"
              style={{
                filter: 'drop-shadow(0 0 8px var(--color-rose))',
              }}
            />
            <h2
              className="text-lg font-black text-[var(--color-rose)] tracking-[0.2em] uppercase"
              style={{
                fontFamily: 'var(--font-display)',
                textShadow: '0 0 10px var(--color-rose-dim)',
              }}
            >
              {name ? `${name} Crashed` : 'System Error'}
            </h2>
            <p
              className="text-xs text-[var(--color-text-dim)] leading-relaxed"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {errorMessage}
            </p>
            <button
              className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-[var(--color-neon)] border border-[var(--color-neon)] hover:bg-[var(--color-neon)] hover:text-[var(--color-void)] transition-all tracking-[0.15em] cursor-pointer bg-transparent"
              style={{ fontFamily: 'var(--font-display)' }}
              onClick={this.handleReset}
              aria-label="Try again"
            >
              <RefreshCw size={12} aria-hidden="true" />
              TRY AGAIN
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
