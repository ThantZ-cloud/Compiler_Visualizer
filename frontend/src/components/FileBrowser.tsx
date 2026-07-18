import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronRight, FileText, Folder, FolderOpen, X, Circle, Plus } from 'lucide-react';
import { useCompile } from '../context/CompileContext';
import { codeAPI, folderAPI } from '../services/api';
import type { SavedCode, Folder as FolderType } from '../types';

// ── Tree node types ──

interface TreeNode {
  id: number;
  name: string;
  type: 'folder' | 'file';
  parentId: number | null;
  children: TreeNode[];
  // file-specific
  sourceCode?: string;
  folderId?: number;
}

// ── Build tree from flat API data ──

function buildTree(folders: FolderType[], files: SavedCode[]): TreeNode[] {
  const nodes: TreeNode[] = [];

  // Create folder nodes
  for (const f of folders) {
    nodes.push({
      id: f.id,
      name: f.name,
      type: 'folder',
      parentId: f.parentId ?? null,
      children: [],
    });
  }

  // Link children to parents
  for (const node of nodes) {
    if (node.parentId !== null) {
      const parent = nodes.find(n => n.id === node.parentId);
      parent?.children.push(node);
    }
  }

  // Add files
  for (const f of files) {
    const fileNode: TreeNode = {
      id: f.id,
      name: f.title,
      type: 'file',
      parentId: f.folderId ?? null,
      children: [],
      sourceCode: f.sourceCode,
      folderId: f.folderId ?? undefined,
    };
    if (f.folderId != null) {
      const parent = nodes.find(n => n.id === f.folderId);
      parent?.children.push(fileNode);
    } else {
      nodes.push(fileNode); // unfiled — root level
    }
  }

  // Return root nodes only
  return nodes.filter(n => n.parentId === null);
}

// ── Sort: folders first, then alphabetical ──

function sortTree(nodes: TreeNode[]): TreeNode[] {
  return [...nodes].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

// ── Context menu type ──

interface ContextMenu {
  nodeId: number;
  nodeType: 'folder' | 'file';
  x: number;
  y: number;
}

// ── Main component ──

const FileBrowser: React.FC = () => {
  const {
    loadFile, saveFile, newFile, currentFileId,
    setCurrentFileId, setCurrentFileName, isDirty, confirmDiscard,
  } = useCompile();

  const [tree, setTree] = useState<TreeNode[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Create state
  const [creating, setCreating] = useState<{ type: 'folder' | 'file'; parentId: number | null } | null>(null);
  const [newName, setNewName] = useState('');

  // Rename state
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Context menu
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const renameRef = useRef<HTMLInputElement>(null);

  // ── Data loading ──

  const loadData = useCallback(async () => {
    try {
      const [folderRes, fileRes] = await Promise.all([
        folderAPI.list(),
        codeAPI.getSaved(),
      ]);
      const treeData = buildTree(folderRes.data, fileRes.data);
      setTree(sortTree(treeData));
    } catch (err) {
      console.error('Failed to load explorer data:', err);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Focus management ──

  useEffect(() => {
    if (creating && inputRef.current) inputRef.current.focus();
  }, [creating]);

  useEffect(() => {
    if (renamingId && renameRef.current) renameRef.current.focus();
  }, [renamingId]);

  // ── Close context menu on outside click ──

  useEffect(() => {
    const handler = () => setContextMenu(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // ── Expand/collapse ──

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── File operations ──

  const handleSelectFile = async (node: TreeNode) => {
    if (node.type === 'folder') {
      toggleExpand(node.id);
      return;
    }
    if (currentFileId === node.id) return;
    if (!confirmDiscard()) return;
    try {
      await loadFile(node.id);
      setSelectedId(node.id);
    } catch (err) {
      console.error('Failed to load file:', err);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim() || !creating) {
      setCreating(null);
      return;
    }
    try {
      if (creating.type === 'folder') {
        await folderAPI.create(newName.trim(), creating.parentId ?? undefined);
      } else {
        const title = newName.endsWith('.java') ? newName : newName + '.java';
        await saveFile(title, creating.parentId ?? undefined, '');
        setCurrentFileId(null);
      }
      setNewName('');
      setCreating(null);
      // Expand parent if creating inside a folder
      if (creating.parentId) {
        setExpandedIds(prev => new Set(prev).add(creating.parentId!));
      }
      loadData();
    } catch (err) {
      console.error('Failed to create:', err);
    }
  };

  const handleDelete = async (node: TreeNode) => {
    const label = node.type === 'folder' ? `folder "${node.name}"` : `file "${node.name}"`;
    if (!window.confirm(`Delete ${label}?`)) return;
    try {
      if (node.type === 'folder') {
        await folderAPI.delete(node.id);
      } else {
        await codeAPI.delete(node.id);
        if (currentFileId === node.id) newFile();
        if (selectedId === node.id) setSelectedId(null);
      }
      loadData();
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const handleRename = async (node: TreeNode) => {
    if (!renameValue.trim()) {
      setRenamingId(null);
      return;
    }
    try {
      if (node.type === 'folder') {
        await folderAPI.rename(node.id, renameValue.trim());
      } else {
        const newTitle = renameValue.endsWith('.java') ? renameValue : renameValue + '.java';
        await codeAPI.update(node.id, newTitle, node.sourceCode || '');
        if (currentFileId === node.id) setCurrentFileName(newTitle);
      }
      setRenamingId(null);
      loadData();
    } catch (err) {
      console.error('Failed to rename:', err);
    }
  };

  // ── Recursive tree renderer ──

  const renderNode = (node: TreeNode, depth: number) => {
    const isFolder = node.type === 'folder';
    const isExpanded = expandedIds.has(node.id);
    const isSelected = selectedId === node.id;
    const isRenaming = renamingId === node.id;
    const isCreatingHere = creating?.parentId === node.id;
    const indent = depth * 12;

    const sortedChildren = sortTree(node.children);

    return (
      <React.Fragment key={`${node.type}-${node.id}`}>
        {/* Node row */}
        <div
          className={`flex items-center gap-1.5 py-[4px] pr-2 cursor-pointer transition-all duration-100 group
            ${isSelected
              ? 'bg-[var(--color-neon)]/5 text-[var(--color-neon)] border-l-2 border-[var(--color-neon)]'
              : 'text-[var(--color-text-dim)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] border-l-2 border-transparent'}`}
          style={{ paddingLeft: `${indent + 8}px`, fontFamily: 'var(--font-mono)' }}
          onClick={() => handleSelectFile(node)}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setContextMenu({ nodeId: node.id, nodeType: node.type, x: e.clientX, y: e.clientY });
          }}
        >
          {/* Expand arrow (folders only) */}
          {isFolder && (
            <ChevronRight
              size={12}
              className={`shrink-0 transition-transform duration-150 text-[var(--color-text-muted)]
                ${isExpanded ? 'rotate-90' : ''}`}
            />
          )}
          {!isFolder && <span className="w-3 shrink-0" />}

          {/* Icon */}
          <span className="shrink-0">
            {isFolder ? (
              isExpanded ? (
                <FolderOpen size={13} className="text-[var(--color-neon)]" />
              ) : (
                <Folder size={13} className="text-[var(--color-neon)]" />
              )
            ) : (
              <FileText size={13} className="text-[var(--color-amber)]" />
            )}
          </span>

          {/* Name or rename input */}
          {isRenaming ? (
            <input
              ref={renameRef}
              className="h-5 flex-1 text-[11px] px-1 bg-[var(--color-void)] border border-[var(--color-neon)] text-[var(--color-neon)] outline-none"
              style={{ fontFamily: 'var(--font-mono)' }}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename(node);
                if (e.key === 'Escape') setRenamingId(null);
              }}
              onBlur={() => handleRename(node)}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="text-[11px] flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
              {node.name}
              {currentFileId === node.id && isDirty && (
                <Circle size={6} className="inline fill-[var(--color-amber)] text-[var(--color-amber)] ml-1" />
              )}
            </span>
          )}

          {/* Delete button (hover) */}
          {!isRenaming && (
            <button
              className="bg-transparent border-none p-0.5 text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-rose)] transition-all shrink-0 opacity-0 group-hover:opacity-100"
              onClick={(e) => { e.stopPropagation(); handleDelete(node); }}
              title={`Delete ${node.name}`}
              aria-label={`Delete ${node.name}`}
            >
              <X size={10} />
            </button>
          )}
        </div>

        {/* Inline create input inside this folder */}
        {isFolder && isCreatingHere && (
          <div
            className="flex items-center gap-2 py-1"
            style={{ paddingLeft: `${(depth + 1) * 12 + 8 + 20}px` }}
          >
            <span className="text-[var(--color-neon)] shrink-0">
              {creating.type === 'folder' ? <Folder size={13} /> : <FileText size={13} />}
            </span>
            <input
              ref={inputRef}
              className="h-5 flex-1 text-[11px] px-1 bg-[var(--color-void)] border border-[var(--color-neon)] text-[var(--color-neon)] outline-none"
              style={{ fontFamily: 'var(--font-mono)' }}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') { setCreating(null); setNewName(''); }
              }}
              onBlur={() => { if (!newName.trim()) setCreating(null); }}
              placeholder={creating.type === 'folder' ? 'Folder name' : 'FileName.java'}
            />
          </div>
        )}

        {/* Render children if expanded */}
        {isFolder && isExpanded && sortedChildren.map(child => renderNode(child, depth + 1))}
      </React.Fragment>
    );
  };

  // ── Root level ──

  const sortedRoot = sortTree(tree);

  return (
    <div className="w-56 min-w-[200px] bg-[var(--color-card)] border-r border-[var(--color-border)] flex flex-col shrink-0">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-[var(--color-border)] flex items-center justify-between">
        <span
          className="text-[10px] font-bold text-[var(--color-neon)] tracking-[0.2em] uppercase"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {'< '}EXPLORER{' />'}
        </span>
        <div className="flex gap-1">
          <button
            className="bg-transparent border-none p-1 text-xs cursor-pointer text-[var(--color-text-muted)] hover:text-[var(--color-neon)] transition-colors"
            onClick={() => {
              if (!confirmDiscard()) return;
              newFile();
              setCreating({ type: 'file', parentId: null });
              setNewName('');
            }}
            title="New File"
            aria-label="Create new file"
          >
            <FileText size={13} />
          </button>
          <button
            className="bg-transparent border-none p-1 text-xs cursor-pointer text-[var(--color-text-muted)] hover:text-[var(--color-neon)] transition-colors"
            onClick={() => {
              setCreating({ type: 'folder', parentId: null });
              setNewName('');
            }}
            title="New Folder"
            aria-label="Create new folder"
          >
            <Folder size={13} />
          </button>
        </div>
      </div>

      {/* Tree content */}
      <div className="flex-1 overflow-y-auto py-1">
        {/* Root label */}
        <div className="flex items-center gap-2 px-3 py-1.5 select-none">
          <span className="text-[var(--color-neon)] text-xs" style={{ fontFamily: 'var(--font-mono)' }}>⌬</span>
          <span
            className="text-[10px] font-bold text-[var(--color-text-dim)] tracking-[0.12em] flex-1"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            SNIPPETS
          </span>
        </div>

        {/* Inline create at root */}
        {creating?.parentId === null && (
          <div className="flex items-center gap-2 py-1" style={{ paddingLeft: '20px' }}>
            <span className="text-[var(--color-neon)] shrink-0">
              {creating.type === 'folder' ? <Folder size={13} /> : <FileText size={13} />}
            </span>
            <input
              ref={inputRef}
              className="h-5 flex-1 text-[11px] px-1 bg-[var(--color-void)] border border-[var(--color-neon)] text-[var(--color-neon)] outline-none"
              style={{ fontFamily: 'var(--font-mono)' }}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') { setCreating(null); setNewName(''); }
              }}
              onBlur={() => { if (!newName.trim()) setCreating(null); }}
              placeholder={creating.type === 'folder' ? 'Folder name' : 'FileName.java'}
            />
          </div>
        )}

        {/* Tree */}
        <div className="px-1">
          {sortedRoot.map(node => renderNode(node, 0))}
        </div>

        {tree.length === 0 && !creating && (
          <div className="text-[10px] text-[var(--color-text-muted)] px-5 py-2" style={{ fontFamily: 'var(--font-mono)' }}>
            {'// '}No files yet
          </div>
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed bg-[var(--color-card)] border border-[var(--color-border)] shadow-2xl z-50 min-w-[160px] py-1"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.nodeType === 'folder' && (
            <button
              className="block w-full px-4 py-2 text-[11px] text-[var(--color-text-dim)] bg-transparent border-none text-left hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] transition-colors"
              style={{ fontFamily: 'var(--font-mono)' }}
              onClick={() => {
                setCreating({ type: 'file', parentId: contextMenu.nodeId });
                setNewName('');
                setExpandedIds(prev => new Set(prev).add(contextMenu.nodeId));
                setContextMenu(null);
              }}
            >
              <Plus size={11} className="inline mr-1.5 -mt-0.5" />
              New File
            </button>
          )}
          {contextMenu.nodeType === 'folder' && (
            <button
              className="block w-full px-4 py-2 text-[11px] text-[var(--color-text-dim)] bg-transparent border-none text-left hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] transition-colors"
              style={{ fontFamily: 'var(--font-mono)' }}
              onClick={() => {
                setCreating({ type: 'folder', parentId: contextMenu.nodeId });
                setNewName('');
                setExpandedIds(prev => new Set(prev).add(contextMenu.nodeId));
                setContextMenu(null);
              }}
            >
              <Folder size={11} className="inline mr-1.5 -mt-0.5" />
              New Folder
            </button>
          )}
          {contextMenu.nodeType === 'folder' && <div className="h-px bg-[var(--color-border)] my-1" />}
          <button
            className="block w-full px-4 py-2 text-[11px] text-[var(--color-text-dim)] bg-transparent border-none text-left hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] transition-colors"
            style={{ fontFamily: 'var(--font-mono)' }}
            onClick={() => {
              // Find node in tree
              const findNode = (nodes: TreeNode[]): TreeNode | undefined => {
                for (const n of nodes) {
                  if (n.id === contextMenu.nodeId && n.type === contextMenu.nodeType) return n;
                  const found = findNode(n.children);
                  if (found) return found;
                }
                return undefined;
              };
              const node = findNode(tree);
              if (node) {
                setRenamingId(node.id);
                setRenameValue(node.type === 'file' ? node.name.replace('.java', '') : node.name);
              }
              setContextMenu(null);
            }}
          >
            Rename
          </button>
          <button
            className="block w-full px-4 py-2 text-[11px] text-[var(--color-rose)] bg-transparent border-none text-left hover:bg-[var(--color-rose)]/10 transition-colors"
            style={{ fontFamily: 'var(--font-mono)' }}
            onClick={() => {
              const findNode = (nodes: TreeNode[]): TreeNode | undefined => {
                for (const n of nodes) {
                  if (n.id === contextMenu.nodeId && n.type === contextMenu.nodeType) return n;
                  const found = findNode(n.children);
                  if (found) return found;
                }
                return undefined;
              };
              const node = findNode(tree);
              if (node) handleDelete(node);
              setContextMenu(null);
            }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
};

export default FileBrowser;
