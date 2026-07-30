import React, { useCallback, useState } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Save, Loader2, Circle, Play, Square, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCompile } from '../context/CompileContext';
import ConfirmDialog from '../components/ConfirmDialog';
import ErrorBoundary from '../components/ErrorBoundary';

const EditorPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { code, setCode, result, loading, error, stdinInput, setStdinInput, saveFile, currentFileId, currentFileName, isDirty, handleCompile, handleCancel } = useCompile();
  const [saving, setSaving] = useState(false);

  // Save-as prompt dialog state
  const [savePromptOpen, setSavePromptOpen] = useState(false);
  const [savePromptValue, setSavePromptValue] = useState('');

  const handleSave = useCallback(async () => {
    if (!currentFileId) {
      // New file — show prompt dialog for filename
      setSavePromptValue(currentFileName);
      setSavePromptOpen(true);
      return;
    }
    // Existing file — save directly
    setSaving(true);
    try {
      await saveFile(currentFileName);
      toast.success('Code saved');
    } catch {
      toast.error('Failed to save code');
    } finally {
      setSaving(false);
    }
  }, [saveFile, currentFileName, currentFileId]);

  const handleSaveConfirm = useCallback(async (value?: string) => {
    setSavePromptOpen(false);
    const name = value ?? '';
    if (!name) return;
    const title = name.endsWith('.java') ? name : name + '.java';
    setSaving(true);
    try {
      await saveFile(title);
      toast.success('Code saved');
    } catch {
      toast.error('Failed to save code');
    } finally {
      setSaving(false);
    }
  }, [saveFile]);

  const handleSaveCancel = useCallback(() => {
    setSavePromptOpen(false);
  }, []);

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
        <div className="flex justify-between items-center px-5 h-10 bg-[var(--color-card)] border-b border-[var(--color-border)] shrink-0">
          <div className="flex items-center gap-3">
            {/* File tab */}
            <div className="flex items-center gap-2 px-3 py-1 border border-[var(--color-border)] bg-[var(--color-surface)]">
              <span className="text-[var(--color-neon)]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 0h-9L7 1.5V6H2.5L1 7.5v15.07L2.5 24h12.07L16 22.57V18h4.7l1.3-1.43V4.5L17.5 0zm0 2.12l2.38 2.38H17.5V2.12zm-3 20.38h-12v-15H7v9.07L8.5 18h6v4.5zm6-6h-12v-15H16V6h4.5v10.5z"/></svg>
              </span>
              <span className="text-[11px] font-medium text-[var(--color-text)]"
                style={{ fontFamily: 'var(--font-mono)' }}>
                {currentFileName}
              </span>
              {isDirty && <Circle size={8} className="fill-[var(--color-amber)] text-[var(--color-amber)]" />}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Save button */}
            <button
              className="px-4 py-2 text-xs font-bold text-[var(--color-cyan)] border border-[var(--color-cyan)] hover:bg-[var(--color-cyan)] hover:text-[var(--color-void)] transition-all tracking-[0.1em] disabled:opacity-40 flex items-center gap-1.5"
              style={{ fontFamily: 'var(--font-display)' }}
              onClick={handleSave}
              disabled={saving}
              title="Save (Ctrl+S)"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              {t('editor.save')}
            </button>

            {/* Compile button */}
            <button
              className={`px-4 py-2 text-xs font-bold text-[var(--color-neon)] border border-[var(--color-neon)] hover:bg-[var(--color-neon)] hover:text-[var(--color-void)] transition-all tracking-[0.1em] disabled:opacity-40 flex items-center gap-1.5 ${loading ? 'opacity-70' : ''}`}
              style={{ fontFamily: 'var(--font-display)' }}
              onClick={handleCompile}
              disabled={loading}
            >
              {loading ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Play size={12} />
              )}
              {loading ? t('nav.compiling') : t('nav.compile')}
            </button>

            {/* Cancel button — only visible during compilation */}
            {loading && (
              <button
                className="px-4 py-2 text-xs tracking-[0.12em] flex items-center gap-1.5 border border-[var(--color-rose)] text-[var(--color-rose)] hover:bg-[var(--color-rose)] hover:text-[var(--color-void)] transition-all"
                style={{ fontFamily: 'var(--font-display)' }}
                onClick={handleCancel}
              >
                <Square size={10} />
                CANCEL
              </button>
            )}

            {/* Separator */}
            <div className="w-px h-5 bg-[var(--color-border)]" />

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
        <ErrorBoundary name="Code Editor" inline>
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
        </ErrorBoundary>
      </div>

      {/* Terminal section */}
      <div className="h-[220px] min-h-[120px] flex flex-col bg-[var(--color-card)] shrink-0 border-t border-[var(--color-neon)]/20">
        {/* Terminal header */}
        <div className="flex justify-between items-center px-5 h-8 border-b border-[var(--color-border)] shrink-0 bg-[var(--color-surface)]">
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

          {/* Visualizer button — shows after successful compilation */}
          {!loading && result && !result.error && (
            <button
              className="px-4 py-2 text-xs font-bold text-[var(--color-neon)] border border-[var(--color-neon)] hover:bg-[var(--color-neon)] hover:text-[var(--color-void)] transition-all tracking-[0.1em] flex items-center gap-1.5"
              style={{ fontFamily: 'var(--font-display)' }}
              onClick={() => navigate('/visualize/tokens')}
            >
              <Eye size={10} />
              VISUALIZER
            </button>
          )}
        </div>

        {/* Terminal body */}
        <div className="flex-1 px-5 py-3 overflow-auto text-[12px] leading-relaxed"
          style={{ fontFamily: 'var(--font-mono)' }}>
          {loading && (
            <div className="text-[var(--color-amber)] flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" />
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
              <span className="text-[var(--color-neon)]">$</span> Click <span className="text-[var(--color-neon)]">COMPILE</span> to run your code.
            </div>
          )}
        </div>
      </div>

      {/* Save-as prompt dialog */}
      <ConfirmDialog
        isOpen={savePromptOpen}
        title="Save File"
        message="Enter a name for your file:"
        confirmText="SAVE"
        cancelText="CANCEL"
        type="prompt"
        promptPlaceholder="ClassName.java"
        defaultValue={savePromptValue}
        onConfirm={handleSaveConfirm}
        onCancel={handleSaveCancel}
      />
    </div>
  );
};

export default EditorPage;
