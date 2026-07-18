import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronRight, Folder, FolderOpen, X, Circle, FilePlus, FolderPlus } from 'lucide-react';
import { useCompile } from '../context/CompileContext';
import { codeAPI, folderAPI } from '../services/api';
import type { SavedCode, Folder as FolderType } from '../types';

// ── Java file icon (stylized "J" in orange) ──

const JavaIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="2" y="2" width="20" height="20" rx="3" fill="#f89820" opacity="0.15" />
    <text x="12" y="17" textAnchor="middle" fill="#f89820" fontSize="14" fontWeight="bold"
      fontFamily="'JetBrains Mono', 'Consolas', monospace">J</text>
  </svg>
);

// ── Tree node types ──

interface TreeNode {
  id: number;
  name: string;
  type: 'folder' | 'file';
  parentId: number | null;
  children: TreeNode[];
  sourceCode?: string;
  folderId?: number;
}

// ── Build tree from flat API data ──

function buildTree(folders: FolderType[], files: SavedCode[]): TreeNode[] {
  const nodes: TreeNode[] = [];

  for (const f of folders) {
    nodes.push({
      id: f.id, name: f.name, type: 'folder',
      parentId: f.parentId ?? null, children: [],
    });
  }

  for (const node of nodes) {
    if (node.parentId !== null) {
      const parent = nodes.find(n => n.id === node.parentId);
      parent?.children.push(node);
    }
  }

  for (const f of files) {
    const fileNode: TreeNode = {
      id: f.id, name: f.title, type: 'file',
      parentId: f.folderId ?? null, children: [],
      sourceCode: f.sourceCode, folderId: f.folderId ?? undefined,
    };
    if (f.folderId != null) {
      const parent = nodes.find(n => n.id === f.folderId);
      parent?.children.push(fileNode);
    } else {
      nodes.push(fileNode);
    }
  }

  return nodes.filter(n => n.parentId === null);
}

function sortTree(nodes: TreeNode[]): TreeNode[] {
  return [...nodes].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

function findNodeInTree(nodes: TreeNode[], id: number, type: string): TreeNode | undefined {
  for (const n of nodes) {
    if (n.id === id && n.type === type) return n;
    const found = findNodeInTree(n.children, id, type);
    if (found) return found;
  }
  return undefined;
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

  // Create state — separate for root vs inside-folder
  const [creatingRoot, setCreatingRoot] = useState<'file' | 'folder' | null>(null);
  const [creatingInFolder, setCreatingInFolder] = useState<{ type: 'file' | 'folder'; folderId: number } | null>(null);
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

  const isCreating = creatingRoot !== null || creatingInFolder !== null;

  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreating]);

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

  // ── Cancel all creation state ──

  const cancelCreate = () => {
    setCreatingRoot(null);
    setCreatingInFolder(null);
    setNewName('');
  };

  // ── Start create at root ──

  const startCreateRoot = (type: 'file' | 'folder') => {
    if (!confirmDiscard()) return;
    if (type === 'file') newFile();
    cancelCreate();
    setCreatingRoot(type);
    setNewName('');
  };

  // ── Start create inside folder ──

  const startCreateInFolder = (type: 'file' | 'folder', folderId: number) => {
    if (type === 'file' && !confirmDiscard()) return;
    cancelCreate();
    setCreatingInFolder({ type, folderId });
    setNewName('');
    setExpandedIds(prev => new Set(prev).add(folderId));
  };

  // ── Handle create ──

  const handleCreate = async () => {
    if (!newName.trim()) { cancelCreate(); return; }

    try {
      if (creatingRoot === 'folder') {
        await folderAPI.create(newName.trim());
      } else if (creatingRoot === 'file') {
        const title = newName.endsWith('.java') ? newName : newName + '.java';
        await saveFile(title, undefined, '');
        setCurrentFileId(null);
      } else if (creatingInFolder) {
        if (creatingInFolder.type === 'folder') {
          await folderAPI.create(newName.trim(), creatingInFolder.folderId);
        } else {
          const title = newName.endsWith('.java') ? newName : newName + '.java';
          await saveFile(title, creatingInFolder.folderId, '');
          setCurrentFileId(null);
        }
      }
      cancelCreate();
      loadData();
    } catch (err) {
      console.error('Failed to create:', err);
    }
  };

  // ── Handle delete ──

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

  // ── Handle rename ──

  const handleRename = async (node: TreeNode) => {
    if (!renameValue.trim()) { setRenamingId(null); return; }
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

  // ── Handle file select ──

  const handleSelectFile = async (node: TreeNode) => {
    if (node.type === 'folder') { toggleExpand(node.id); return; }
    if (currentFileId === node.id) return;
    if (!confirmDiscard()) return;
    try {
      await loadFile(node.id);
      setSelectedId(node.id);
    } catch (err) {
      console.error('Failed to load file:', err);
    }
  };

  // ── Inline create input ──

  const renderCreateInput = (depth: number) => (
    <div
      className="flex items-center gap-2 h-[28px] pr-3"
      style={{ paddingLeft: `${depth * 16 + 12}px` }}
    >
      <span className="shrink-0 flex items-center">
        {(creatingRoot === 'folder' || creatingInFolder?.type === 'folder') ? (
          <Folder size={14} className="text-[var(--color-neon)]" />
        ) : (
          <JavaIcon size={14} />
        )}
      </span>
      <input
        ref={inputRef}
        className="h-6 flex-1 text-[12px] px-2 bg-[var(--color-void)] border border-[var(--color-neon)] text-[var(--color-neon)] outline-none rounded-none"
        style={{ fontFamily: 'var(--font-mono)' }}
        value={newName}
        onChange={(e) => setNewName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleCreate();
          if (e.key === 'Escape') cancelCreate();
        }}
        onBlur={() => {
          // Delay to allow button clicks to register before canceling
          setTimeout(() => {
            if (!newName.trim()) cancelCreate();
          }, 150);
        }}
        placeholder={
          (creatingRoot === 'folder' || creatingInFolder?.type === 'folder')
            ? 'New folder' : 'ClassName.java'
        }
      />
    </div>
  );

  // ── Recursive tree renderer ──

  const renderNode = (node: TreeNode, depth: number): React.ReactNode => {
    const isFolder = node.type === 'folder';
    const isExpanded = expandedIds.has(node.id);
    const isSelected = selectedId === node.id;
    const isRenaming = renamingId === node.id;
    const indent = depth * 16;

    const sortedChildren = sortTree(node.children);

    // Check if we're creating inside this folder
    const isCreatingHere = creatingInFolder?.folderId === node.id;

    return (
      <React.Fragment key={`${node.type}-${node.id}`}>
        {/* Node row */}
        <div
          className={`flex items-center gap-2 h-[28px] pr-3 cursor-pointer transition-colors duration-75 group rounded-sm
            ${isSelected && !isFolder
              ? 'bg-[var(--color-neon)]/8 text-[var(--color-neon)]'
              : 'text-[var(--color-text-dim)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]'}`}
          style={{ paddingLeft: `${indent + 12}px`, fontFamily: 'var(--font-mono)' }}
          onClick={() => handleSelectFile(node)}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setContextMenu({ nodeId: node.id, nodeType: node.type, x: e.clientX, y: e.clientY });
          }}
        >
          {/* Expand arrow */}
          {isFolder ? (
            <ChevronRight
              size={16}
              className={`shrink-0 transition-transform duration-100 text-[var(--color-text-muted)] cursor-pointer
                hover:text-[var(--color-text)] ${isExpanded ? 'rotate-90' : ''}`}
            />
          ) : (
            <span className="w-4 shrink-0" />
          )}

          {/* Icon */}
          <span className="shrink-0 flex items-center">
            {isFolder ? (
              isExpanded ? (
                <FolderOpen size={16} className="text-[var(--color-neon)]" />
              ) : (
                <Folder size={16} className="text-[var(--color-neon)]" />
              )
            ) : (
              <JavaIcon size={16} />
            )}
          </span>

          {/* Name or rename input */}
          {isRenaming ? (
            <input
              ref={renameRef}
              className="h-5 flex-1 text-[12px] px-1 bg-[var(--color-void)] border border-[var(--color-neon)] text-[var(--color-neon)] outline-none"
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
            <span className="text-[12px] flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
              {node.name}
              {currentFileId === node.id && isDirty && (
                <Circle size={7} className="inline fill-[var(--color-amber)] text-[var(--color-amber)] ml-1.5" />
              )}
            </span>
          )}

          {/* Delete button */}
          {!isRenaming && (
            <button
              className="bg-transparent border-none p-1 text-[var(--color-text-muted)] hover:text-[var(--color-rose)] transition-all shrink-0 opacity-0 group-hover:opacity-100"
              onClick={(e) => { e.stopPropagation(); handleDelete(node); }}
              title={`Delete ${node.name}`}
              aria-label={`Delete ${node.name}`}
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Inline create inside this folder */}
        {isFolder && isCreatingHere && renderCreateInput(depth + 1)}

        {/* Children */}
        {isFolder && isExpanded && sortedChildren.map(child => renderNode(child, depth + 1))}
      </React.Fragment>
    );
  };

  const sortedRoot = sortTree(tree);

  return (
    <div className="w-[260px] min-w-[220px] max-w-[400px] bg-[var(--color-card)] border-r border-[var(--color-border)] flex flex-col shrink-0 select-none">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-[var(--color-border)] flex items-center justify-between h-[36px]">
        <span
          className="text-[10px] font-bold text-[var(--color-text-dim)] tracking-[0.15em] uppercase"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Explorer
        </span>
        <div className="flex gap-0.5">
          <button
            className="p-1 rounded hover:bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            onClick={() => startCreateRoot('file')}
            title="New File"
            aria-label="Create new file"
          >
            <FilePlus size={15} />
          </button>
          <button
            className="p-1 rounded hover:bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            onClick={() => startCreateRoot('folder')}
            title="New Folder"
            aria-label="Create new folder"
          >
            <FolderPlus size={15} />
          </button>
        </div>
      </div>

      {/* Tree content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-1">
        {/* Section header */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 mb-1 select-none">
          <ChevronRight size={12} className="rotate-90 text-[var(--color-text-muted)]" />
          <span
            className="text-[11px] font-bold text-[var(--color-text-dim)] tracking-wide flex-1 uppercase"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Snippets
          </span>
        </div>

        {/* Create at root */}
        {creatingRoot && renderCreateInput(0)}

        {/* Tree nodes */}
        <div>
          {sortedRoot.map(node => renderNode(node, 0))}
        </div>

        {tree.length === 0 && !isCreating && (
          <div className="text-[11px] text-[var(--color-text-muted)] px-4 py-4" style={{ fontFamily: 'var(--font-mono)' }}>
            No files or folders yet
          </div>
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed bg-[var(--color-card)] border border-[var(--color-border)] shadow-2xl z-50 min-w-[180px] py-1.5 rounded"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.nodeType === 'folder' && (
            <>
              <button
                className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] text-[var(--color-text-dim)] bg-transparent border-none text-left hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] transition-colors"
                style={{ fontFamily: 'var(--font-mono)' }}
                onClick={() => {
                  startCreateInFolder('file', contextMenu.nodeId);
                  setContextMenu(null);
                }}
              >
                <FilePlus size={13} /> New File
              </button>
              <button
                className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] text-[var(--color-text-dim)] bg-transparent border-none text-left hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] transition-colors"
                style={{ fontFamily: 'var(--font-mono)' }}
                onClick={() => {
                  startCreateInFolder('folder', contextMenu.nodeId);
                  setContextMenu(null);
                }}
              >
                <FolderPlus size={13} /> New Folder
              </button>
              <div className="h-px bg-[var(--color-border)] my-1 mx-2" />
            </>
          )}
          <button
            className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] text-[var(--color-text-dim)] bg-transparent border-none text-left hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] transition-colors"
            style={{ fontFamily: 'var(--font-mono)' }}
            onClick={() => {
              const node = findNodeInTree(tree, contextMenu.nodeId, contextMenu.nodeType);
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
            className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] text-[var(--color-rose)] bg-transparent border-none text-left hover:bg-[var(--color-rose)]/10 transition-colors"
            style={{ fontFamily: 'var(--font-mono)' }}
            onClick={() => {
              const node = findNodeInTree(tree, contextMenu.nodeId, contextMenu.nodeType);
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
