import React, { useState, useEffect, useRef } from 'react';
import { useCompile } from '../context/CompileContext';
import { folderAPI, codeAPI } from '../services/api';
import type { Folder, SavedCode } from '../types';
import './FileBrowser.css';

interface FolderWithFiles extends Folder {
  files: SavedCode[];
  expanded: boolean;
}

const FileBrowser: React.FC = () => {
  const { loadFile, saveFile, newFile, currentFileId } = useCompile();
  const [folders, setFolders] = useState<FolderWithFiles[]>([]);
  const [unfiledFiles, setUnfiledFiles] = useState<SavedCode[]>([]);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFileName, setNewFileName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [contextMenu, setContextMenu] = useState<{ type: 'folder' | 'file'; id: number; x: number; y: number } | null>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    try {
      const [foldersRes, filesRes] = await Promise.all([
        folderAPI.list(),
        codeAPI.getSaved(),
      ]);
      const folderList = foldersRes.data.map((f: Folder) => ({ ...f, files: [], expanded: true }));
      const allFiles: SavedCode[] = filesRes.data;

      const unfiled: SavedCode[] = [];
      allFiles.forEach((file: SavedCode) => {
        if (file.folderId) {
          const folder = folderList.find((f: FolderWithFiles) => f.id === file.folderId);
          if (folder) {
            folder.files.push(file);
          } else {
            unfiled.push(file);
          }
        } else {
          unfiled.push(file);
        }
      });

      setFolders(folderList);
      setUnfiledFiles(unfiled);
    } catch (err) {
      console.error('Failed to load files:', err);
    }
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (isCreatingFolder && folderInputRef.current) {
      folderInputRef.current.focus();
    }
  }, [isCreatingFolder]);

  useEffect(() => {
    if (isCreatingFile && fileInputRef.current) {
      fileInputRef.current.focus();
    }
  }, [isCreatingFile]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      setIsCreatingFolder(false);
      return;
    }
    try {
      await folderAPI.create(newFolderName.trim());
      setNewFolderName('');
      setIsCreatingFolder(false);
      loadData();
    } catch (err) {
      console.error('Failed to create folder:', err);
    }
  };

  const handleCreateFile = async () => {
    if (!newFileName.trim()) {
      setIsCreatingFile(false);
      return;
    }
    try {
      const title = newFileName.endsWith('.java') ? newFileName : newFileName + '.java';
      await saveFile(title);
      setNewFileName('');
      setIsCreatingFile(false);
      loadData();
    } catch (err) {
      console.error('Failed to create file:', err);
    }
  };

  const handleRenameFolder = async (id: number) => {
    if (!renameValue.trim()) {
      setRenamingId(null);
      return;
    }
    try {
      await folderAPI.rename(id, renameValue.trim());
      setRenamingId(null);
      loadData();
    } catch (err) {
      console.error('Failed to rename folder:', err);
    }
  };

  const handleDeleteFolder = async (id: number) => {
    try {
      await folderAPI.delete(id);
      loadData();
    } catch (err) {
      console.error('Failed to delete folder:', err);
    }
  };

  const handleDeleteFile = async (id: number) => {
    try {
      await codeAPI.delete(id);
      if (currentFileId === id) newFile();
      loadData();
    } catch (err) {
      console.error('Failed to delete file:', err);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, type: 'folder' | 'file', id: number) => {
    e.preventDefault();
    setContextMenu({ type, id, x: e.clientX, y: e.clientY });
  };

  useEffect(() => {
    const handler = () => setContextMenu(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const toggleFolder = (id: number) => {
    setFolders(prev => prev.map(f => f.id === id ? { ...f, expanded: !f.expanded } : f));
  };

  return (
    <div className="file-browser">
      <div className="file-browser-header">
        <span className="file-browser-title">EXPLORER</span>
      </div>

      <div className="file-browser-content">
        {/* Root section with action buttons */}
        <div className="root-section">
          <div className="root-header">
            <span className="folder-icon">📂</span>
            <span className="folder-name root-name">MY SNIPPETS</span>
            <div className="root-actions">
              <button
                className="root-action"
                onClick={() => { setIsCreatingFile(true); setIsCreatingFolder(false); }}
                title="New File"
              >
                📄
              </button>
              <button
                className="root-action"
                onClick={() => { setIsCreatingFolder(true); setIsCreatingFile(false); }}
                title="New Folder"
              >
                📁
              </button>
            </div>
          </div>

          {/* New file input (inline) */}
          {isCreatingFile && (
            <div className="inline-input">
              <span className="file-icon">☕</span>
              <input
                ref={fileInputRef}
                className="inline-input-field"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateFile();
                  if (e.key === 'Escape') { setIsCreatingFile(false); setNewFileName(''); }
                }}
                onBlur={() => { if (!newFileName.trim()) setIsCreatingFile(false); }}
                placeholder="FileName.java"
              />
            </div>
          )}

          {/* Unfiled files */}
          <div className="file-list">
            {unfiledFiles.map(file => (
              <div
                key={file.id}
                className={`file-item ${currentFileId === file.id ? 'active' : ''}`}
                onClick={() => loadFile(file.id)}
                onContextMenu={(e) => handleContextMenu(e, 'file', file.id)}
              >
                <span className="file-icon">☕</span>
                <span className="file-name">{file.title}</span>
              </div>
            ))}
          </div>

          {/* New folder input (inline) */}
          {isCreatingFolder && (
            <div className="inline-input">
              <span className="folder-icon">📁</span>
              <input
                ref={folderInputRef}
                className="inline-input-field"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateFolder();
                  if (e.key === 'Escape') { setIsCreatingFolder(false); setNewFolderName(''); }
                }}
                onBlur={() => { if (!newFolderName.trim()) setIsCreatingFolder(false); }}
                placeholder="Folder name"
              />
            </div>
          )}

          {/* Custom folders */}
          {folders.map(folder => (
            <div key={folder.id} className="folder-item">
              <div
                className="folder-header"
                onClick={() => toggleFolder(folder.id)}
                onContextMenu={(e) => handleContextMenu(e, 'folder', folder.id)}
              >
                <span className="folder-arrow">{folder.expanded ? '▾' : '▸'}</span>
                <span className="folder-icon">📁</span>
                {renamingId === folder.id ? (
                  <input
                    className="rename-input"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameFolder(folder.id);
                      if (e.key === 'Escape') setRenamingId(null);
                    }}
                    onBlur={() => handleRenameFolder(folder.id)}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="folder-name">{folder.name}</span>
                )}
              </div>
              {folder.expanded && (
                <div className="file-list">
                  {folder.files.map(file => (
                    <div
                      key={file.id}
                      className={`file-item ${currentFileId === file.id ? 'active' : ''}`}
                      onClick={() => loadFile(file.id)}
                      onContextMenu={(e) => handleContextMenu(e, 'file', file.id)}
                    >
                      <span className="file-icon">☕</span>
                      <span className="file-name">{file.title}</span>
                    </div>
                  ))}
                  {folder.files.length === 0 && (
                    <div className="empty-folder">No files</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.type === 'folder' && (
            <>
              <button onClick={() => {
                const folder = folders.find(f => f.id === contextMenu.id);
                if (folder) { setRenamingId(folder.id); setRenameValue(folder.name); }
                setContextMenu(null);
              }}>Rename</button>
              <button onClick={() => { handleDeleteFolder(contextMenu.id); setContextMenu(null); }}>Delete</button>
            </>
          )}
          {contextMenu.type === 'file' && (
            <>
              <button onClick={() => {
                const file = [...unfiledFiles, ...folders.flatMap(f => f.files)].find(f => f.id === contextMenu.id);
                if (file) loadFile(file.id);
                setContextMenu(null);
              }}>Open</button>
              <button onClick={() => { handleDeleteFile(contextMenu.id); setContextMenu(null); }}>Delete</button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default FileBrowser;
