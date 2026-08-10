import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, Circle, FilePlus, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { useCompile } from '../context/CompileContext';
import { codeAPI } from '../services/api';
import type { SavedCode } from '../types';
import ConfirmDialog from './ConfirmDialog';

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
  const { t } = useTranslation();
  const {
    loadFile, saveFile, newFile, currentFileId,
    setCurrentFileName, isDirty,
    showDiscardDialog,
  } = useCompile();

  const [files, setFiles] = useState<SavedCode[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Create state
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  // Rename state
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [pendingDeleteName, setPendingDeleteName] = useState('');

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const renameRef = useRef<HTMLInputElement>(null);

  // ── Data loading ──

  const loadFiles = useCallback(async () => {
    try {
      const res = await codeAPI.getSaved();
      setFiles(res.data.data ?? []);
    } catch (err) {
      console.error('Failed to load files:', err);
      toast.error(t('fileBrowser.loadFail'));
    }
  }, [t]);

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
      setNewName('');
      setCreating(false);
      loadFiles();
      toast.success(t('fileBrowser.fileCreated'));
    } catch (err) {
      console.error('Failed to create file:', err);
      toast.error(t('fileBrowser.fileCreatedFail'));
    }
  };

  // ── Delete file ──

  const handleDelete = async (id: number) => {
    const file = files.find(f => f.id === id);
    setPendingDeleteId(id);
    setPendingDeleteName(file?.title ?? '');
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (pendingDeleteId === null) return;
    try {
      await codeAPI.delete(pendingDeleteId);
      if (currentFileId === pendingDeleteId) newFile();
      if (selectedId === pendingDeleteId) setSelectedId(null);
      loadFiles();
      toast.success(t('fileBrowser.fileDeleted'));
    } catch (err) {
      console.error('Failed to delete file:', err);
      toast.error(t('fileBrowser.fileDeletedFail'));
    } finally {
      setDeleteDialogOpen(false);
      setPendingDeleteId(null);
    }
  };

  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setPendingDeleteId(null);
  };

  // ── Rename file ──

  const handleStartRename = (file: SavedCode) => {
    setRenamingId(file.id);
    setRenameValue(file.title.replace(/\.java$/i, ''));
  };

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
      toast.success(t('fileBrowser.fileRenamed'));
    } catch (err) {
      console.error('Failed to rename file:', err);
      toast.error(t('fileBrowser.fileRenamedFail'));
    }
  };

  // ── Select file ──

  const handleSelectFile = async (file: SavedCode) => {
    if (currentFileId === file.id) return;
    if (isDirty) {
      showDiscardDialog(async () => {
        try {
          await loadFile(file.id);
          setSelectedId(file.id);
        } catch (err) {
          console.error('Failed to load file:', err);
        }
      });
      return;
    }
    try {
      await loadFile(file.id);
      setSelectedId(file.id);
    } catch (err) {
      console.error('Failed to load file:', err);
    }
  };

  // ── Start create ──

  const handleStartCreate = () => {
    if (isDirty) {
      showDiscardDialog(() => {
        newFile();
        setCreating(true);
        setNewName('');
      });
      return;
    }
    newFile();
    setCreating(true);
    setNewName('');
  };

  return (
    <div className="w-[260px] min-w-[220px] max-w-[400px] bg-[var(--color-card)] border-r border-[var(--color-border)] flex flex-col shrink-0 select-none">
      {/* Header */}
      <div className="px-5 py-2.5 border-b border-[var(--color-border)] flex items-center justify-around h-[36px]">
        <span
          className="text-[10px] font-bold text-[var(--color-text-dim)] tracking-[0.15em] uppercase"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {t('fileBrowser.explorer')}
        </span>
        <button
          className="p-1.5  rounded hover:bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
          onClick={handleStartCreate}
          title={t('fileBrowser.newFile')}
          aria-label={t('fileBrowser.newFile')}
        >
          <FilePlus size={15} />
        </button>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto  py-2 px-2">
        {/* Section header */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 mb-1 select-none justify-around">
          <span
            className="text-[11px]  font-bold text-[var(--color-text-dim)] tracking-wide flex-1 uppercase"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {t('fileBrowser.snippets')}
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
              placeholder={t('fileBrowser.classNamePlaceholder')}
            />
          </div>
        )}

        {/* File list */}
        {files.map(file => (
          <div
            key={file.id}
            className={`flex items-center gap-2 h-[28px] pr-1 pl-3 cursor-pointer transition-colors duration-75 group rounded-sm
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
                placeholder={t('fileBrowser.classNamePlaceholder')}
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onFocus={(e) => e.currentTarget.select()}
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
              <div className="flex items-center shrink-0 w-0 overflow-hidden opacity-0 group-hover:w-auto group-hover:opacity-100 transition-all duration-100">
                <button
                  className="bg-transparent border-none p-1.5 ml-2 text-[var(--color-text-muted)] hover:text-[var(--color-neon)] transition-colors"
                  onClick={(e) => { e.stopPropagation(); handleStartRename(file); }}
                  title={t('fileBrowser.rename')}
                  aria-label={t('fileBrowser.rename')}
                >
                  <Pencil size={13} />
                </button>
                <button
                  className="bg-transparent border-none p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-rose)] transition-colors"
                  onClick={(e) => { e.stopPropagation(); handleDelete(file.id); }}
                  title={`${t('fileBrowser.delete')} ${file.title}`}
                  aria-label={`${t('fileBrowser.delete')} ${file.title}`}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            )}
          </div>
        ))}

        {files.length === 0 && !creating && (
          <div className="text-[11px] text-[var(--color-text-muted)] px-3 py-4" style={{ fontFamily: 'var(--font-mono)' }}>
            {t('fileBrowser.noFiles')}
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        title={t('fileBrowser.deleteConfirmTitle')}
        message={t('fileBrowser.deleteConfirmMessage', { name: pendingDeleteName })}
        confirmText={t('fileBrowser.deleteConfirmAction')}
        cancelText={t('fileBrowser.cancel')}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        danger
      />
    </div>
  );
};

export default FileBrowser;
