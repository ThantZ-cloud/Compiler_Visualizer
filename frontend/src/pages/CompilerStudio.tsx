import React, { useCallback, useEffect, useRef, useState } from 'react';
import Editor, { type OnMount, type BeforeMount } from '@monaco-editor/react';
import { useTranslation } from 'react-i18next';
import { Save, Loader2, Circle, Play, ChevronDown } from 'lucide-react';
import { useCompile } from '../context/CompileContext';
import { useTheme } from '../context/ThemeContext';
import PipelineStepper from '../components/PipelineStepper';
import StageCanvas from '../components/StageCanvas';
import PlaybackDeck from '../components/PlaybackDeck';
import type { Token } from '../types';

const LANGUAGES = [
  { id: 'java', label: 'Java', enabled: true },
  { id: 'python', label: 'Python', enabled: false },
  { id: 'c', label: 'C', enabled: false },
  { id: 'javascript', label: 'JavaScript', enabled: false },
];

const CompilerStudio: React.FC = () => {
  const { t } = useTranslation();
  const { resolvedTheme } = useTheme();
  const {
    code, setCode, result, loading, error, stdinInput, setStdinInput,
    saveFile, currentFileId, currentFileName, isDirty, handleCompile,
  } = useCompile();

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const tokensRef = useRef<Token[]>([]);
  const hoverDisposableRef = useRef<{ dispose: () => void } | null>(null);

  // Keep the latest tokens handy for the editor hover provider.
  useEffect(() => {
    tokensRef.current = result?.tokens ?? [];
  }, [result]);

  const handleSave = useCallback(async () => {
    let title = currentFileName;
    if (!currentFileId) {
      const name = window.prompt('Save as:', currentFileName);
      if (!name) return;
      title = name.endsWith('.java') ? name : name + '.java';
    }
    setSaving(true);
    setSaveMessage('');
    try {
      await saveFile(title);
      setSaveMessage('OK');
      setTimeout(() => setSaveMessage(''), 2000);
    } catch {
      setSaveMessage('FAIL');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setSaving(false);
    }
  }, [saveFile, currentFileName, currentFileId]);

  // Pastel light + soft-dark Monaco themes, registered before the editor mounts.
  const handleBeforeMount: BeforeMount = monaco => {
    monaco.editor.defineTheme('compili-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '0F766E', fontStyle: 'bold' },
        { token: 'string', foreground: '8B5CF6' },
        { token: 'number', foreground: '059669' },
        { token: 'comment', foreground: '94A3B8', fontStyle: 'italic' },
        { token: 'type', foreground: '0E7490' },
        { token: 'identifier', foreground: '1E293B' },
        { token: 'delimiter', foreground: '64748B' },
        { token: 'operator', foreground: '64748B' },
        { token: 'annotation', foreground: 'D97706' },
      ],
      colors: {
        'editor.background': '#FFFFFF',
        'editor.foreground': '#1E293B',
        'editorLineNumber.foreground': '#CBD5E1',
        'editorLineNumber.activeForeground': '#64748B',
        'editor.lineHighlightBackground': '#F8FAFC',
        'editorCursor.foreground': '#3B82F6',
        'editor.selectionBackground': '#DBEAFE',
        'editor.inactiveSelectionBackground': '#EFF6FF',
        'editorIndentGuide.background1': '#F1F5F9',
        'editorIndentGuide.activeBackground1': '#CBD5E1',
      },
    });
    monaco.editor.defineTheme('compili-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '5EEAD4', fontStyle: 'bold' },
        { token: 'string', foreground: 'C4B5FD' },
        { token: 'number', foreground: '6EE7B7' },
        { token: 'comment', foreground: '64748B', fontStyle: 'italic' },
        { token: 'type', foreground: '67E8F9' },
        { token: 'identifier', foreground: 'F1F5F9' },
        { token: 'delimiter', foreground: '94A3B8' },
        { token: 'operator', foreground: '94A3B8' },
      ],
      colors: {
        'editor.background': '#0F172A',
        'editor.foreground': '#F1F5F9',
        'editorLineNumber.foreground': '#334155',
        'editorLineNumber.activeForeground': '#94A3B8',
        'editor.lineHighlightBackground': '#16203A',
        'editorCursor.foreground': '#60A5FA',
        'editor.selectionBackground': '#1D4ED8',
      },
    });
  };

  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSave();
    });

    // Inline hover tooltip showing the token type under the cursor.
    hoverDisposableRef.current?.dispose();
    hoverDisposableRef.current = monaco.languages.registerHoverProvider('java', {
      provideHover: (
        _model: import('monaco-editor').editor.ITextModel,
        position: import('monaco-editor').Position,
      ) => {
        const tok = tokensRef.current.find(tk =>
          tk.line === position.lineNumber &&
          position.column >= tk.column &&
          position.column < tk.column + Math.max(tk.length, 1)
        );
        if (!tok) return null;
        return {
          contents: [
            { value: `**${tok.type}**` },
            { value: `\`${tok.value}\`  ·  line ${tok.line}, col ${tok.column}` },
          ],
        };
      },
    });
  }, [handleSave]);

  // Dispose the hover provider on unmount.
  useEffect(() => () => {
    hoverDisposableRef.current?.dispose();
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--color-void)]">
      {/* Pipeline stepper banner */}
      <div className="shrink-0 border-b border-[var(--color-border)] bg-[var(--color-card)]">
        <PipelineStepper />
      </div>

      {/* 40 / 60 split workspace */}
      <div className="flex min-h-0 flex-1">
        {/* ── Left pane: code editor (~40%) ── */}
        <div className="flex min-w-0 w-[40%] flex-col border-r border-[var(--color-border)] p-3">
          <div className="card-soft flex min-h-0 flex-1 flex-col overflow-hidden">
            {/* Editor top bar */}
            <div className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-[var(--color-border)] px-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex items-center gap-1.5 rounded-md bg-[var(--color-surface)] px-2 py-1">
                  <span className="text-[var(--color-neon)]">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 0h-9L7 1.5V6H2.5L1 7.5v15.07L2.5 24h12.07L16 22.57V18h4.7l1.3-1.43V4.5L17.5 0zm0 2.12l2.38 2.38H17.5V2.12zm-3 20.38h-12v-15H7v9.07L8.5 18h6v4.5zm6-6h-12v-15H16V6h4.5v10.5z"/></svg>
                  </span>
                  <span className="truncate font-mono text-[11px] font-medium text-[var(--color-text)]">
                    {currentFileName}
                  </span>
                  {isDirty && <Circle size={7} className="fill-[var(--color-amber)] text-[var(--color-amber)]" />}
                </span>
                {saveMessage && (
                  <span className={`text-[10px] font-semibold ${saveMessage === 'OK' ? 'text-[var(--color-cyan)]' : 'text-[var(--color-rose)]'}`}>
                    {saveMessage === 'OK' ? 'Saved' : 'Save failed'}
                  </span>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {/* Language selector */}
                <div className="relative">
                  <select
                    value="java"
                    onChange={() => { /* Java only for now */ }}
                    aria-label={t('studio.language')}
                    className="appearance-none cursor-pointer rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]
                      py-1.5 pl-2.5 pr-7 text-[12px] font-medium text-[var(--color-text-dim)] outline-none
                      hover:border-[var(--color-border-bright)] focus:border-[var(--color-neon)] transition-colors"
                  >
                    {LANGUAGES.map(l => (
                      <option key={l.id} value={l.id} disabled={!l.enabled}>
                        {l.label}{l.enabled ? '' : ` (${t('studio.soon')})`}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                </div>

                {/* Save */}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  title={`${t('editor.save')} (Ctrl+S)`}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)]
                    text-[var(--color-text-dim)] hover:border-[var(--color-neon)] hover:text-[var(--color-neon)]
                    transition-colors disabled:opacity-40"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                </button>

                {/* Compile & Step — primary emerald CTA */}
                <button
                  type="button"
                  onClick={handleCompile}
                  disabled={loading}
                  className="flex items-center gap-1.5 rounded-full bg-[var(--color-cyan)] px-4 py-2 text-[12.5px]
                    font-semibold text-white shadow-[var(--shadow-soft)] transition-colors hover:bg-[#059669]
                    disabled:opacity-50"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                  {loading ? t('nav.compiling') : t('studio.compileStep')}
                </button>
              </div>
            </div>

            {/* Monaco editor */}
            <div className="min-h-0 flex-1">
              <Editor
                height="100%"
                defaultLanguage="java"
                theme={resolvedTheme === 'dark' ? 'compili-dark' : 'compili-light'}
                value={code}
                onChange={value => setCode(value || '')}
                beforeMount={handleBeforeMount}
                onMount={handleEditorMount}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  padding: { top: 14 },
                  renderLineHighlight: 'gutter',
                  bracketPairColorization: { enabled: true },
                  smoothScrolling: true,
                  cursorBlinking: 'smooth',
                  cursorSmoothCaretAnimation: 'on',
                  roundedSelection: true,
                }}
              />
            </div>

            {/* Output terminal */}
            <div className="flex h-[150px] shrink-0 flex-col border-t border-[var(--color-border)]">
              <div className="flex h-8 shrink-0 items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-3">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[var(--color-cyan)]" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                    {t('studio.output')}
                  </span>
                  {result?.compilationTimeMs != null && (
                    <span className="font-mono text-[10px] text-[var(--color-text-muted)]">
                      {result.compilationTimeMs}ms
                    </span>
                  )}
                </span>
                <input
                  type="text"
                  value={stdinInput}
                  onChange={e => setStdinInput(e.target.value)}
                  placeholder={t('studio.stdinPlaceholder')}
                  aria-label={t('studio.stdinLabel')}
                  className="h-6 w-40 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-2
                    font-mono text-[11px] text-[var(--color-text)] outline-none focus:border-[var(--color-neon)] transition-colors"
                />
              </div>
              <div className="flex-1 overflow-auto px-3 py-2 font-mono text-[12px] leading-relaxed">
                {loading && (
                  <div className="flex items-center gap-2 text-[var(--color-amber)]">
                    <Loader2 size={13} className="animate-spin" />
                    <span>{t('nav.compiling')}</span>
                  </div>
                )}
                {!loading && error && (
                  <pre className="m-0 whitespace-pre-wrap text-[var(--color-rose)]">{error}</pre>
                )}
                {!loading && !error && result?.executionOutput && (
                  <pre className="m-0 whitespace-pre-wrap text-[var(--color-cyan)]">{result.executionOutput}</pre>
                )}
                {!loading && !error && result?.error && (
                  <pre className="m-0 whitespace-pre-wrap text-[var(--color-rose)]">{result.error}</pre>
                )}
                {!loading && !error && !result && (
                  <div className="text-[var(--color-text-muted)]">{t('studio.runHint')}</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Right pane: interactive canvas (~60%) ── */}
        <div className="relative min-w-0 w-[60%]">
          <StageCanvas />
          <PlaybackDeck />
        </div>
      </div>
    </div>
  );
};

export default CompilerStudio;
