import React, { useCallback, useState } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import { useNavigate } from 'react-router-dom';
import { useCompile } from '../context/CompileContext';

const EditorPage: React.FC = () => {
  const { code, setCode, result, loading, error, stdinInput, setStdinInput, saveFile, currentFileId, currentFileName, isDirty } = useCompile();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

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

  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSave();
    });
  }, [handleSave]);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[var(--color-void)]">
      {/* Editor section */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Toolbar — terminal tab bar */}
        <div className="flex justify-between items-center px-4 h-10 bg-[var(--color-card)] border-b border-[var(--color-border)] shrink-0">
          <div className="flex items-center gap-3">
            {/* File tab */}
            <div className="flex items-center gap-2 px-3 py-1 border border-[var(--color-border)] bg-[var(--color-surface)]">
              <span className="text-[10px] text-[var(--color-neon)]" style={{ fontFamily: 'var(--font-mono)' }}>☕</span>
              <span className="text-[11px] font-medium text-[var(--color-text)]"
                style={{ fontFamily: 'var(--font-mono)' }}>
                {currentFileName}
              </span>
              {isDirty && <span className="text-[var(--color-amber)] text-xs">●</span>}
            </div>
            {saveMessage && (
              <span className={`text-[10px] font-bold tracking-wider ${
                saveMessage === 'OK' ? 'text-[var(--color-neon)]' : 'text-[var(--color-rose)]'
              }`} style={{ fontFamily: 'var(--font-display)' }}>
                [{saveMessage}]
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* Save button */}
            <button
              className="px-3 py-1 text-[10px] font-bold text-[var(--color-cyan)] border border-[var(--color-cyan)] hover:bg-[var(--color-cyan)] hover:text-[var(--color-void)] transition-all tracking-[0.1em] disabled:opacity-40"
              style={{ fontFamily: 'var(--font-display)' }}
              onClick={handleSave}
              disabled={saving}
              title="Save (Ctrl+S)"
            >
              {saving ? '⟳' : '⊞'} SAVE
            </button>

            {/* Separator */}
            <div className="w-px h-4 bg-[var(--color-border)]" />

            {/* Stdin input */}
            <div className="flex items-center gap-2">
              <label htmlFor="stdin" className="text-[10px] text-[var(--color-text-muted)] tracking-wider"
                style={{ fontFamily: 'var(--font-display)' }}>
                STDIN:
              </label>
              <input
                id="stdin"
                type="text"
                className="h-7 w-56 px-3 text-[11px] bg-[var(--color-void)] border border-[var(--color-border)] text-[var(--color-neon)] outline-none focus:border-[var(--color-neon)] transition-colors"
                style={{ fontFamily: 'var(--font-mono)' }}
                placeholder="$ enter input..."
                value={stdinInput}
                onChange={(e) => setStdinInput(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Editor container */}
        <div className="flex-1 min-h-0 border-b border-[var(--color-border)] overflow-hidden">
          <Editor
            height="100%"
            defaultLanguage="java"
            theme="vs-dark"
            value={code}
            onChange={(value) => setCode(value || '')}
            onMount={handleEditorMount}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              padding: { top: 16 },
              renderLineHighlight: 'gutter',
              bracketPairColorization: { enabled: true },
              smoothScrolling: true,
              cursorBlinking: 'smooth',
              cursorSmoothCaretAnimation: 'on',
            }}
          />
        </div>
      </div>

      {/* Terminal section */}
      <div className="h-[220px] min-h-[120px] flex flex-col bg-[var(--color-card)] shrink-0 border-t border-[var(--color-neon)]/20">
        {/* Terminal header */}
        <div className="flex justify-between items-center px-4 h-8 border-b border-[var(--color-border)] shrink-0 bg-[var(--color-surface)]">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 bg-[var(--color-neon)]" />
            <span className="text-[10px] font-bold text-[var(--color-text-muted)] tracking-[0.2em] uppercase"
              style={{ fontFamily: 'var(--font-display)' }}>
              OUTPUT
            </span>
            {result?.compilationTimeMs && (
              <span className="text-[9px] text-[var(--color-text-muted)]"
                style={{ fontFamily: 'var(--font-mono)' }}>
                {result.compilationTimeMs}ms
              </span>
            )}
          </div>
          {result && (
            <button
              className="text-[10px] font-bold text-[var(--color-magenta)] border border-[var(--color-magenta)]/30 px-2.5 py-0.5 hover:bg-[var(--color-magenta)]/10 transition-all tracking-wider"
              style={{ fontFamily: 'var(--font-display)' }}
              onClick={() => navigate('/visualize/tokens')}
            >
              ◎ VISUALIZE →
            </button>
          )}
        </div>

        {/* Terminal body */}
        <div className="flex-1 px-4 py-3 overflow-auto text-[12px] leading-relaxed"
          style={{ fontFamily: 'var(--font-mono)' }}>
          {loading && (
            <div className="text-[var(--color-amber)] flex items-center gap-2">
              <span className="inline-block animate-spin">⟳</span>
              <span>Compiling<span className="animate-pulse">...</span></span>
            </div>
          )}
          {!loading && error && (
            <div>
              <pre className="text-[var(--color-rose)] m-0 whitespace-pre-wrap">
                <span className="text-[var(--color-text-muted)]">[ERROR] </span>{error}
              </pre>
            </div>
          )}
          {!loading && !error && result?.executionOutput && (
            <pre className="text-[var(--color-neon)] m-0 whitespace-pre-wrap">{result.executionOutput}</pre>
          )}
          {!loading && !error && result?.error && (
            <pre className="text-[var(--color-rose)] m-0 whitespace-pre-wrap">
              <span className="text-[var(--color-text-muted)]">[ERR] </span>{result.error}
            </pre>
          )}
          {!loading && !error && !result && (
            <div className="text-[var(--color-text-muted)]">
              <span className="text-[var(--color-neon)]">$</span> Click <span className="text-[var(--color-neon)]">▶ COMPILE</span> to run your code.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditorPage;
