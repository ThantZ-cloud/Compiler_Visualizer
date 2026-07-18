import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Trash2, Circle, FilePlus } from 'lucide-react';
import { useCompile } from '../context/CompileContext';
import { codeAPI } from '../services/api';
import type { SavedCode } from '../types';

// ── Java file icon (stylized "J" in orange) ──

const JavaIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="2" y="2" width="20" height="20" rx="3" fill="#f89820" opacity="0.15" />
    <text x="12" y="17" textAnchor="middle" fill="#f89820" fontSize="14" fontWeight="bold"
      fontFamily="'JetBrains Mono', 'Consolas', monospace">J</text>
  </svg>
);

// ── Main component ──

const FileBrowser: React.FC = () => {
  const {
    loadFile, saveFile, newFile, currentFileId,
    setCurrentFileId, setCurrentFileName, isDirty, confirmDiscard,
  } = useCompile();

  const [files, setFiles] = useState<SavedCode[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Create state
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  // Rename state
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const renameRef = useRef<HTMLInputElement>(null);

  // ── Data loading ──

  const loadFiles = useCallback(async () => {
    try {
      const res = await codeAPI.getSaved();
      setFiles(res.data);
    } catch (err) {
      console.error('Failed to load files:', err);
    }
  }, []);

  useEffect(() => { loadFiles(); }, [loadFiles]);

  // ── Focus management ──

  useEffect(() => {
    if (creating && inputRef.current) inputRef.current.focus();
  }, [creating]);

  useEffect(() => {
    if (renamingId && renameRef.current) renameRef.current.focus();
  }, [renamingId]);

  // ── Create file ──

  const handleCreate = async () => {
    if (!newName.trim()) { setCreating(false); return; }
    try {
      const title = newName.endsWith('.java') ? newName : newName + '.java';
      await saveFile(title);
      setCurrentFileId(null);
      setNewName('');
      setCreating(false);
      loadFiles();
    } catch (err) {
      console.error('Failed to create file:', err);
    }
  };

  // ── Delete file ──

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this file?')) return;
    try {
      await codeAPI.delete(id);
      if (currentFileId === id) newFile();
      if (selectedId === id) setSelectedId(null);
      loadFiles();
    } catch (err) {
      console.error('Failed to delete file:', err);
    }
  };

  // ── Rename file ──

  const handleRename = async (id: number) => {
    if (!renameValue.trim()) { setRenamingId(null); return; }
    try {
      const file = files.find(f => f.id === id);
      if (!file) return;
      const newTitle = renameValue.endsWith('.java') ? renameValue : renameValue + '.java';
      await codeAPI.update(id, newTitle, file.sourceCode);
      if (currentFileId === id) setCurrentFileName(newTitle);
      setRenamingId(null);
      loadFiles();
    } catch (err) {
      console.error('Failed to rename file:', err);
    }
  };

  // ── Select file ──

  const handleSelectFile = async (file: SavedCode) => {
    if (currentFileId === file.id) return;
    if (!confirmDiscard()) return;
    try {
      await loadFile(file.id);
      setSelectedId(file.id);
    } catch (err) {
      console.error('Failed to load file:', err);
    }
  };

  // ── Start create ──

  const handleStartCreate = () => {
    if (!confirmDiscard()) return;
    newFile();
    setCreating(true);
    setNewName('');
  };

  return (
    <div className="w-[260px] min-w-[220px] max-w-[400px] bg-[var(--color-card)] border-r border-[var(--color-border)] flex flex-col shrink-0 select-none">
      {/* Header */}
      <div className="px-5 py-2.5 border-b border-[var(--color-border)] flex items-center justify-between h-[36px]">
        <span
          className="text-[10px] font-bold text-[var(--color-text-dim)] tracking-[0.15em] uppercase"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Explorer
        </span>
        <button
          className="p-1.5 rounded hover:bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
          onClick={handleStartCreate}
          title="New File"
          aria-label="Create new file"
        >
          <FilePlus size={15} />
        </button>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto py-2 px-2">
        {/* Section header */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 mb-1 select-none">
          <span
            className="text-[11px] font-bold text-[var(--color-text-dim)] tracking-wide flex-1 uppercase"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Snippets
          </span>
        </div>

        {/* Create input */}
        {creating && (
          <div className="flex items-center gap-2 h-[28px] pr-4 pl-3">
            <span className="shrink-0 flex items-center">
              <JavaIcon size={14} />
            </span>
            <input
              ref={inputRef}
              className="h-6 flex-1 text-[12px] px-2 bg-[var(--color-void)] border border-[var(--color-neon)] text-[var(--color-neon)] outline-none rounded-none"
              style={{ fontFamily: 'var(--font-mono)' }}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') { setCreating(false); setNewName(''); }
              }}
              onBlur={() => {
                setTimeout(() => {
                  if (!newName.trim()) setCreating(false);
                }, 150);
              }}
              placeholder="ClassName.java"
            />
          </div>
        )}

        {/* File list */}
        {files.map(file => (
          <div
            key={file.id}
            className={`flex items-center gap-2 h-[28px] pr-4 pl-3 cursor-pointer transition-colors duration-75 group rounded-sm
              ${selectedId === file.id
                ? 'bg-[var(--color-neon)]/8 text-[var(--color-neon)]'
                : 'text-[var(--color-text-dim)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]'}`}
            style={{ fontFamily: 'var(--font-mono)' }}
            onClick={() => handleSelectFile(file)}
          >
            <span className="shrink-0 flex items-center">
              <JavaIcon size={16} />
            </span>

            {renamingId === file.id ? (
              <input
                ref={renameRef}
                className="h-5 flex-1 text-[12px] px-1 bg-[var(--color-void)] border border-[var(--color-neon)] text-[var(--color-neon)] outline-none"
                style={{ fontFamily: 'var(--font-mono)' }}
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename(file.id);
                  if (e.key === 'Escape') setRenamingId(null);
                }}
                onBlur={() => handleRename(file.id)}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="text-[12px] flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                {file.title}
                {currentFileId === file.id && isDirty && (
                  <Circle size={7} className="inline fill-[var(--color-amber)] text-[var(--color-amber)] ml-1.5" />
                )}
              </span>
            )}

            {!renamingId && (
              <button
                className="bg-transparent border-none p-1.5 mr-5 text-[var(--color-text-muted)] hover:text-[var(--color-rose)] transition-all shrink-0 opacity-0 group-hover:opacity-100"
                onClick={(e) => { e.stopPropagation(); handleDelete(file.id); }}
                title={`Delete ${file.title}`}
                aria-label={`Delete ${file.title}`}
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        ))}

        {files.length === 0 && !creating && (
          <div className="text-[11px] text-[var(--color-text-muted)] px-3 py-4" style={{ fontFamily: 'var(--font-mono)' }}>
            No files yet
          </div>
        )}
      </div>
    </div>
  );
};

export default FileBrowser;
