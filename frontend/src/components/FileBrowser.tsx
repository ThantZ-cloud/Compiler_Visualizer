import React, { useState, useEffect, useRef } from 'react';
import { X, Circle } from 'lucide-react';
import { useCompile } from '../context/CompileContext';
import { codeAPI } from '../services/api';
import type { SavedCode } from '../types';

const FileBrowser: React.FC = () => {
  const { loadFile, saveFile, newFile, currentFileId, setCurrentFileId, setCurrentFileName, isDirty, confirmDiscard } = useCompile();
  const [files, setFiles] = useState<SavedCode[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [contextMenu, setContextMenu] = useState<{ id: number; x: number; y: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const renameRef = useRef<HTMLInputElement>(null);

  const loadFiles = async () => {
    try {
      const res = await codeAPI.getSaved();
      setFiles(res.data);
    } catch (err) {
      console.error('Failed to load files:', err);
    }
  };

  useEffect(() => { loadFiles(); }, []);

  useEffect(() => {
    if (isCreating && inputRef.current) inputRef.current.focus();
  }, [isCreating]);

  useEffect(() => {
    if (renamingId && renameRef.current) renameRef.current.focus();
  }, [renamingId]);

  const handleCreateFile = async () => {
    if (!newFileName.trim()) {
      setIsCreating(false);
      return;
    }
    try {
      const title = newFileName.endsWith('.java') ? newFileName : newFileName + '.java';
      await saveFile(title, undefined, '');
      setCurrentFileId(null);
      setNewFileName('');
      setIsCreating(false);
      loadFiles();
    } catch (err) {
      console.error('Failed to create file:', err);
    }
  };

  const handleDeleteFile = async (id: number) => {
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

  const handleRenameFile = async (id: number) => {
    if (!renameValue.trim()) {
      setRenamingId(null);
      return;
    }
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

  const handleStartCreate = () => {
    if (!confirmDiscard()) return;
    newFile();
    setIsCreating(true);
    setNewFileName('');
  };

  useEffect(() => {
    const handler = () => setContextMenu(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  return (
    <div className="w-56 min-w-[200px] bg-[var(--color-card)] border-r border-[var(--color-border)] flex flex-col shrink-0">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-[var(--color-border)]">
        <span className="text-[10px] font-bold text-[var(--color-neon)] tracking-[0.2em] uppercase"
          style={{ fontFamily: 'var(--font-display)' }}>
          {'< '}EXPLORER{' />'}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto py-2">
        {/* Root */}
        <div className="mb-1">
          <div className="flex items-center gap-2 px-3 py-1.5 select-none">
            <span className="text-[var(--color-neon)] text-xs" style={{ fontFamily: 'var(--font-mono)' }}>⌬</span>
            <span className="text-[10px] font-bold text-[var(--color-text-dim)] tracking-[0.12em] flex-1"
              style={{ fontFamily: 'var(--font-display)' }}>
              SNIPPETS
            </span>
            <button
              className="bg-transparent border-none p-1 text-xs cursor-pointer text-[var(--color-text-muted)] hover:text-[var(--color-neon)] transition-colors opacity-60 hover:opacity-100"
              onClick={handleStartCreate}
              title="New File"
              aria-label="Create new file"
            >+</button>
          </div>

          {/* Create input */}
          {isCreating && (
            <div className="flex items-center gap-2 pl-8 pr-3 py-1">
              <span className="text-[var(--color-neon)] text-xs shrink-0" style={{ fontFamily: 'var(--font-mono)' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 0h-9L7 1.5V6H2.5L1 7.5v15.07L2.5 24h12.07L16 22.57V18h4.7l1.3-1.43V4.5L17.5 0zm0 2.12l2.38 2.38H17.5V2.12zm-3 20.38h-12v-15H7v9.07L8.5 18h6v4.5zm6-6h-12v-15H16V6h4.5v10.5z"/></svg>
              </span>
              <input
                ref={inputRef}
                className="h-7 flex-1 text-[11px] px-2 bg-[var(--color-void)] border border-[var(--color-neon)] text-[var(--color-neon)] outline-none"
                style={{ fontFamily: 'var(--font-mono)' }}
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateFile();
                  if (e.key === 'Escape') { setIsCreating(false); setNewFileName(''); }
                }}
                onBlur={() => { if (!newFileName.trim()) setIsCreating(false); }}
                placeholder="FileName.java"
              />
            </div>
          )}

          {/* File list */}
          <div className="px-1.5">
            {files.map(file => (
              <div
                key={file.id}
                className={`flex items-center gap-2 px-2.5 py-[5px] mx-1 cursor-pointer transition-all duration-150
                  ${selectedId === file.id
                    ? 'bg-[var(--color-neon)]/5 text-[var(--color-neon)] border-l-2 border-[var(--color-neon)]'
                    : 'text-[var(--color-text-dim)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] border-l-2 border-transparent'}`}
                onClick={() => handleSelectFile(file)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({ id: file.id, x: e.clientX, y: e.clientY });
                }}
              >
                <span className="text-[var(--color-neon)] shrink-0">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 0h-9L7 1.5V6H2.5L1 7.5v15.07L2.5 24h12.07L16 22.57V18h4.7l1.3-1.43V4.5L17.5 0zm0 2.12l2.38 2.38H17.5V2.12zm-3 20.38h-12v-15H7v9.07L8.5 18h6v4.5zm6-6h-12v-15H16V6h4.5v10.5z"/></svg>
                </span>
                {renamingId === file.id ? (
                  <input
                    ref={renameRef}
                    className="h-6 flex-1 text-[11px] px-1 bg-[var(--color-void)] border border-[var(--color-neon)] text-[var(--color-neon)] outline-none"
                    style={{ fontFamily: 'var(--font-mono)' }}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameFile(file.id);
                      if (e.key === 'Escape') setRenamingId(null);
                    }}
                    onBlur={() => handleRenameFile(file.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="text-[11px] flex-1 overflow-hidden text-ellipsis whitespace-nowrap"
                    style={{ fontFamily: 'var(--font-mono)' }}>
                    {file.title}
                    {currentFileId === file.id && isDirty && (
                      <Circle size={6} className="inline fill-[var(--color-amber)] text-[var(--color-amber)] ml-1" />
                    )}
                  </span>
                )}
                <button
                  className="bg-transparent border-none p-0.5 px-1 text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-rose)] transition-all shrink-0 opacity-0 hover:opacity-100"
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
                  onClick={(e) => { e.stopPropagation(); handleDeleteFile(file.id); }}
                  title="Delete File"
                  aria-label={`Delete ${file.title}`}
                ><X size={10} /></button>
              </div>
            ))}
            {files.length === 0 && !isCreating && (
              <div className="text-[10px] text-[var(--color-text-muted)] px-2.5 py-2" style={{ fontFamily: 'var(--font-mono)' }}>
                {'// '}No files yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed bg-[var(--color-card)] border border-[var(--color-border)] shadow-2xl z-50 min-w-[140px] py-1"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="block w-full px-4 py-2 text-[11px] text-[var(--color-text-dim)] bg-transparent border-none text-left hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] transition-colors"
            style={{ fontFamily: 'var(--font-mono)' }}
            onClick={() => {
              const file = files.find(f => f.id === contextMenu.id);
              if (file) {
                setRenamingId(file.id);
                setRenameValue(file.title.replace('.java', ''));
              }
              setContextMenu(null);
            }}
          > Rename</button>
          <button
            className="block w-full px-4 py-2 text-[11px] text-[var(--color-rose)] bg-transparent border-none text-left hover:bg-[var(--color-rose)]/10 transition-colors"
            style={{ fontFamily: 'var(--font-mono)' }}
            onClick={() => { handleDeleteFile(contextMenu.id); setContextMenu(null); }}
          > Delete</button>
        </div>
      )}
    </div>
  );
};

export default FileBrowser;
