import React, { useState, useEffect } from 'react';
import { useCompile } from '../context/CompileContext';
import { folderAPI, codeAPI } from '../services/api';
import type { Folder, SavedCode } from '../types';
import './FileBrowser.css';

interface FolderWithFiles extends Folder {
  files: SavedCode[];
  expanded: boolean;
}

const FileBrowser: React.FC = () => {
  const { loadFile, saveFile, newFile, currentFileId, currentFileName } = useCompile();
  const [folders, setFolders] = useState<FolderWithFiles[]>([]);
  const [unfiledFiles, setUnfiledFiles] = useState<SavedCode[]>([]);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [contextMenu, setContextMenu] = useState<{ type: 'folder' | 'file'; id: number; x: number; y: number } | null>(null);

  const loadData = async () => {
    try {
      const [foldersRes, filesRes] = await Promise.all([
        folderAPI.list(),
        codeAPI.getSaved(),
      ]);
      const folderList = foldersRes.data.map((f: Folder) => ({ ...f, files: [], expanded: true }));
      const allFiles: SavedCode[] = filesRes.data;

      // Distribute files into folders
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

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await folderAPI.create(newFolderName.trim());
      setNewFolderName('');
      setIsCreatingFolder(false);
      loadData();
    } catch (err) {
      console.error('Failed to create folder:', err);
    }
  };

  const handleRenameFolder = async (id: number) => {
    if (!renameValue.trim()) return;
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
      if (currentFileId === id) {
        newFile();
      }
      loadData();
    } catch (err) {
      console.error('Failed to delete file:', err);
    }
  };

  const handleSave = async () => {
    try {
      await saveFile(currentFileName);
      loadData();
    } catch (err) {
      console.error('Failed to save:', err);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, type: 'folder' | 'file', id: number) => {
    e.preventDefault();
    setContextMenu({ type, id, x: e.clientX, y: e.clientY });
  };

  const closeContextMenu = () => setContextMenu(null);

  useEffect(() => {
    const handleClick = () => closeContextMenu();
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const toggleFolder = (id: number) => {
    setFolders(prev => prev.map(f => f.id === id ? { ...f, expanded: !f.expanded } : f));
  };

  return (
    <div className="file-browser">
      <div className="file-browser-header">
        <span className="file-browser-title">EXPLORER</span>
        <div className="file-browser-actions">
          <button className="fb-action" onClick={handleSave} title="Save file">
            💾
          </button>
          <button className="fb-action" onClick={newFile} title="New file">
            📄
          </button>
          <button className="fb-action" onClick={() => setIsCreatingFolder(true)} title="New folder">
            📁
          </button>
        </div>
      </div>

      <div className="file-browser-content">
        {/* Unfiled files section */}
        <div className="folder-section">
          <div className="folder-header" onClick={() => {}}>
            <span className="folder-icon">📂</span>
            <span className="folder-name">My Snippets</span>
          </div>
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
        </div>

        {/* Custom folders */}
        {folders.map(folder => (
          <div key={folder.id} className="folder-section">
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

        {/* New folder input */}
        {isCreatingFolder && (
          <div className="new-folder-input">
            <span className="folder-icon">📁</span>
            <input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolder();
                if (e.key === 'Escape') { setIsCreatingFolder(false); setNewFolderName(''); }
              }}
              placeholder="Folder name..."
              autoFocus
            />
          </div>
        )}
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
                if (folder) {
                  setRenamingId(folder.id);
                  setRenameValue(folder.name);
                }
                closeContextMenu();
              }}>Rename</button>
              <button onClick={() => { handleDeleteFolder(contextMenu.id); closeContextMenu(); }}>Delete</button>
            </>
          )}
          {contextMenu.type === 'file' && (
            <>
              <button onClick={() => {
                const file = [...unfiledFiles, ...folders.flatMap(f => f.files)].find(f => f.id === contextMenu.id);
                if (file) loadFile(file.id);
                closeContextMenu();
              }}>Open</button>
              <button onClick={() => { handleDeleteFile(contextMenu.id); closeContextMenu(); }}>Delete</button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default FileBrowser;
