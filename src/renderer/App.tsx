import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Note, Tag, Folder, Settings, ViewType, defaultSettings } from './types';
import * as db from './utils/database';
import { backupManager } from './utils/googleDrive';
import TitleBar from './components/TitleBar';
import Sidebar from './components/Sidebar';
import NoteList from './components/NoteList';
import Editor, { BackupStatus } from './components/Editor';
import PasswordModal from './components/PasswordModal';
import SettingsModal from './components/SettingsModal';
import ExportModal from './components/ExportModal';
import { ThemeProvider } from './contexts/ThemeContext';
import { EncryptionProvider } from './contexts/EncryptionContext';
import { I18nProvider } from './contexts/I18nContext';

const App: React.FC = () => {
  // State
  const [notes, setNotes] = useState<Note[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>('all');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [backupStatus, setBackupStatus] = useState<BackupStatus>('none');
  const [isNoteListCollapsed, setIsNoteListCollapsed] = useState(false);
  const [lastBackupTime, setLastBackupTime] = useState<Date | null>(null);
  
  // Auto backup timer ref
  const backupTimeoutRef = useRef<NodeJS.Timeout>();
  const autoBackupIntervalRef = useRef<NodeJS.Timeout>();

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  // Auto backup interval based on settings
  useEffect(() => {
    // Clear existing interval
    if (autoBackupIntervalRef.current) {
      clearInterval(autoBackupIntervalRef.current);
      autoBackupIntervalRef.current = undefined;
    }

    // Set up new interval if autoBackup is enabled
    if (settings.autoBackup && settings.syncFolderPath && settings.autoBackupInterval > 0) {
      autoBackupIntervalRef.current = setInterval(async () => {
        try {
          await window.electronAPI.kolpSaveLocal(settings.syncFolderPath!);
          setLastBackupTime(new Date());
        } catch (error) {
          console.error('Auto backup failed:', error);
        }
      }, settings.autoBackupInterval);
    }

    return () => {
      if (autoBackupIntervalRef.current) {
        clearInterval(autoBackupIntervalRef.current);
      }
    };
  }, [settings.autoBackup, settings.syncFolderPath, settings.autoBackupInterval]);

  // Set up Electron menu listeners
  useEffect(() => {
    if (window.electronAPI) {
      const unsubNewNote = window.electronAPI.onNewNote(() => {
        handleCreateNote();
      });
      
      const unsubExport = window.electronAPI.onExport(() => {
        setShowExportModal(true);
      });
      
      const unsubToggleTheme = window.electronAPI.onToggleTheme(() => {
        handleToggleTheme();
      });
      
      const unsubImport = window.electronAPI.onImportData(async (data) => {
        await handleImportData(data.content);
      });

      return () => {
        unsubNewNote();
        unsubExport();
        unsubToggleTheme();
        unsubImport();
      };
    }
  }, [settings]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+N: New Note
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        handleCreateNote();
      }
      // Ctrl+,: Settings
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        setShowSettingsModal(true);
      }
      // Ctrl+F: Focus search (when not in editor)
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        const searchInput = document.querySelector('.search-input') as HTMLInputElement;
        if (searchInput && document.activeElement?.className !== 'editor-wysiwyg') {
          e.preventDefault();
          searchInput.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [loadedNotes, loadedTags, loadedFolders, loadedSettings] = await Promise.all([
        db.getActiveNotes(),
        db.getAllTags(),
        db.getAllFolders(),
        db.getSettings(),
      ]);
      
      setNotes(loadedNotes);
      setTags(loadedTags);
      setFolders(loadedFolders);
      setSettings(loadedSettings);
      
      // Check if encryption is enabled and password is set
      if (loadedSettings.encryptionEnabled && loadedSettings.passwordHash) {
        setIsLocked(true);
        setShowPasswordModal(true);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleTheme = async () => {
    const newTheme = settings.theme === 'dark' ? 'light' : 'dark';
    await db.updateSettings({ theme: newTheme });
    setSettings(prev => ({ ...prev, theme: newTheme }));
  };

  // Note: Local in-memory backup is handled separately from cloud/folder backup
  // The backupManager creates an internal backup for crash recovery
  const triggerLocalBackup = useCallback(() => {
    if (backupTimeoutRef.current) {
      clearTimeout(backupTimeoutRef.current);
    }
    
    backupTimeoutRef.current = setTimeout(() => {
      // Only create internal backup, not the sync folder backup
      backupManager.createBackup(notes, folders, tags, settings);
    }, 5000); // 5 second delay for internal backup
  }, [notes, folders, tags, settings]);

  // Create internal backup on changes (not the visible sync)
  useEffect(() => {
    if (!isLoading && notes.length > 0) {
      triggerLocalBackup();
    }
    
    return () => {
      if (backupTimeoutRef.current) {
        clearTimeout(backupTimeoutRef.current);
      }
    };
  }, [notes, folders, tags, triggerLocalBackup, isLoading]);

  // Manual sync/backup function
  const handleManualSync = useCallback(async () => {
    if (!settings.syncFolderPath) return;
    
    try {
      const result = await window.electronAPI.kolpSaveLocal(settings.syncFolderPath);
      if (result.success) {
        setLastBackupTime(new Date());
      }
    } catch (error) {
      console.error('Manual sync failed:', error);
    }
  }, [settings.syncFolderPath]);


  const handleCreateNote = async () => {
    const newNote = await db.createNote({
      title: 'New Note',
      content: '',
      folderId: selectedFolderId || undefined,
      tagIds: selectedTagId ? [selectedTagId] : [],
    });
    setNotes(prev => [newNote, ...prev]);
    setSelectedNote(newNote);
  };

  const handleDuplicateNote = async (note: Note) => {
    const newNote = await db.createNote({
      title: note.title + ' (Copy)',
      content: note.content,
      folderId: note.folderId,
      tagIds: note.tagIds,
    });
    setNotes(prev => [newNote, ...prev]);
    setSelectedNote(newNote);
  };

  const handleExportNote = async (note: Note) => {
    if (!window.electronAPI) return;
    
    try {
      const result = await window.electronAPI.showSaveDialog({
        defaultPath: `${note.title || 'not'}.txt`,
        filters: [
          { name: 'Text Files', extensions: ['txt'] },
          { name: 'Markdown Files', extensions: ['md'] },
          { name: 'HTML Files', extensions: ['html'] },
        ],
      });
      
      if (!result.canceled && result.filePath) {
        let content = note.content;
        
        // If HTML export, wrap content
        if (result.filePath.endsWith('.html')) {
          content = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${note.title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
    h1 { color: #333; }
    pre { background: #f4f4f4; padding: 16px; border-radius: 4px; overflow-x: auto; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
  </style>
</head>
<body>
  <h1>${note.title}</h1>
  <div>${note.content.replace(/\n/g, '<br>')}</div>
</body>
</html>`;
        }
        
        await window.electronAPI.saveFile(result.filePath, content);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleUpdateNote = async (id: string, updates: Partial<Note>) => {
    await db.updateNote(id, updates);
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates, updatedAt: new Date() } : n));
    if (selectedNote?.id === id) {
      setSelectedNote(prev => prev ? { ...prev, ...updates, updatedAt: new Date() } : null);
    }
  };

  const handleDeleteNote = async (id: string, permanent: boolean = false) => {
    await db.deleteNote(id, permanent);
    if (permanent) {
      setNotes(prev => prev.filter(n => n.id !== id));
    } else {
      setNotes(prev => prev.filter(n => n.id !== id));
    }
    if (selectedNote?.id === id) {
      setSelectedNote(null);
    }
  };

  const handleRestoreNote = async (id: string) => {
    await db.restoreNote(id);
    await loadData();
  };

  const handleTogglePin = async (id: string) => {
    await db.togglePinNote(id);
    setNotes(prev => prev.map(n => n.id === id ? { ...n, isPinned: !n.isPinned } : n));
    if (selectedNote?.id === id) {
      setSelectedNote(prev => prev ? { ...prev, isPinned: !prev.isPinned } : null);
    }
  };

  const handleCreateTag = async (name: string, color: string) => {
    const newTag = await db.createTag(name, color);
    setTags(prev => [...prev, newTag]);
    return newTag;
  };

  const handleDeleteTag = async (id: string) => {
    await db.deleteTag(id);
    setTags(prev => prev.filter(t => t.id !== id));
    await loadData();
  };

  const handleCreateFolder = async (name: string, parentId?: string) => {
    const newFolder = await db.createFolder(name, parentId);
    setFolders(prev => [...prev, newFolder]);
    return newFolder;
  };

  const handleDeleteFolder = async (id: string) => {
    await db.deleteFolder(id);
    setFolders(prev => prev.filter(f => f.id !== id));
    await loadData();
  };

  const handleUpdateSettings = async (updates: Partial<Settings>) => {
    await db.updateSettings(updates);
    setSettings(prev => ({ ...prev, ...updates }));
  };

  const handleEmptyTrash = async () => {
    await db.emptyTrash();
    await loadData();
  };

  const handleImportData = async (content: string) => {
    try {
      const data = JSON.parse(content);
      const result = await db.importData(data);
      await loadData();
      if (window.electronAPI) {
        await window.electronAPI.showMessageBox({
          type: 'info',
          title: 'Import Complete',
          message: `${result.notesImported} notes, ${result.tagsImported} tags, ${result.foldersImported} folders imported.`,
        });
      }
    } catch (error) {
      console.error('Import failed:', error);
      if (window.electronAPI) {
        await window.electronAPI.showMessageBox({
          type: 'error',
          title: 'Import Error',
          message: 'An error occurred while importing the file.',
        });
      }
    }
  };

  const getFilteredNotes = useCallback((): Note[] => {
    let filtered = notes;

    // Filter by view
    switch (currentView) {
      case 'pinned':
      case 'starred':
        filtered = filtered.filter(n => n.isPinned);
        break;
      case 'folder':
        if (selectedFolderId) {
          filtered = filtered.filter(n => n.folderId === selectedFolderId);
        }
        break;
      case 'tag':
        if (selectedTagId) {
          filtered = filtered.filter(n => n.tagIds.includes(selectedTagId));
        }
        break;
      case 'trash':
        // For trash, we need to reload deleted notes
        break;
      case 'archived':
        // Show archived notes (for now, empty - could add isArchived to Note type)
        filtered = [];
        break;
      case 'untagged':
        filtered = filtered.filter(n => !n.tagIds || n.tagIds.length === 0);
        break;
      case 'files':
        // Show notes with attachments (for now, notes with images in content)
        filtered = filtered.filter(n => n.content.includes('<img') || n.content.includes('data:image'));
        break;
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(n =>
        n.title.toLowerCase().includes(query) ||
        n.content.toLowerCase().includes(query)
      );
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      const order = settings.sortOrder === 'desc' ? -1 : 1;
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      
      switch (settings.sortBy) {
        case 'title':
          return a.title.localeCompare(b.title) * order;
        case 'createdAt':
          return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * order;
        default:
          return (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()) * order;
      }
    });

    return filtered;
  }, [notes, currentView, selectedFolderId, selectedTagId, searchQuery, settings.sortBy, settings.sortOrder]);

  // Compute note counts for sidebar
  const noteCounts = {
    all: notes.length,
    files: notes.filter(n => n.content.includes('<img') || n.content.includes('data:image')).length,
    starred: notes.filter(n => n.isPinned).length,
    archived: 0, // Could add isArchived to Note type later
    trash: 0, // Trash notes are separate
    untagged: notes.filter(n => !n.tagIds || n.tagIds.length === 0).length,
  };

  // Update backup status based on settings
  useEffect(() => {
    if (settings.googleDriveEnabled) {
      setBackupStatus('cloud');
    } else if (settings.syncFolderPath) {
      setBackupStatus('local');
    } else {
      setBackupStatus('none');
    }
  }, [settings.syncFolderPath, settings.autoBackup]);

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <I18nProvider>
      <ThemeProvider theme={settings.theme} accentColor={settings.accentColor}>
        <EncryptionProvider>
          <div className={`application theme-${settings.theme} ${settings.compactMode ? 'compact-mode' : ''} ${settings.reduceAnimations ? 'reduce-animations' : ''}`}>
            <TitleBar />
          <div className="app-content">
            <Sidebar
              folders={folders}
              tags={tags}
              notes={notes}
              selectedNoteId={selectedNote?.id || null}
              onNoteSelect={(id: string) => {
                const note = notes.find(n => n.id === id);
                if (note) setSelectedNote(note);
              }}
              currentView={currentView}
              selectedFolderId={selectedFolderId}
              selectedTagId={selectedTagId}
              noteCounts={noteCounts}
              onViewChange={setCurrentView}
              onFolderSelect={(id: string) => {
                setSelectedFolderId(id);
                setCurrentView('folder');
              }}
              onTagSelect={(id: string) => {
                setSelectedTagId(id);
                setCurrentView('tag');
              }}
              onCreateFolder={handleCreateFolder}
              onDeleteFolder={handleDeleteFolder}
              onCreateTag={handleCreateTag}
              onDeleteTag={handleDeleteTag}
              onOpenSettings={() => setShowSettingsModal(true)}
              settings={settings}
            />
          
          {/* NoteList with collapse toggle */}
          <div 
            className={`note-list-wrapper ${isNoteListCollapsed ? 'collapsed' : ''}`}
            style={{ width: isNoteListCollapsed ? 0 : settings.noteListWidth }}
          >
            <button 
              className="note-list-toggle"
              onClick={() => setIsNoteListCollapsed(!isNoteListCollapsed)}
              title={isNoteListCollapsed ? 'Show Notes' : 'Hide Notes'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {isNoteListCollapsed ? (
                  <path d="M9 18l6-6-6-6"/>
                ) : (
                  <path d="M15 18l-6-6 6-6"/>
                )}
              </svg>
            </button>
            
            {!isNoteListCollapsed && (
              <NoteList
                notes={getFilteredNotes()}
                selectedNoteId={selectedNote?.id || null}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onNoteSelect={setSelectedNote}
                onCreateNote={handleCreateNote}
                onDeleteNote={handleDeleteNote}
                onTogglePin={handleTogglePin}
                currentView={currentView}
                onEmptyTrash={handleEmptyTrash}
                onRestoreNote={handleRestoreNote}
                onExportNote={handleExportNote}
                onDuplicateNote={handleDuplicateNote}
                settings={settings}
              />
            )}
          </div>
          
          <Editor
            note={selectedNote}
            tags={tags}
            onUpdateNote={handleUpdateNote}
            onAddTag={handleCreateTag}
            settings={settings}
            backupStatus={backupStatus}
            onSyncClick={handleManualSync}
          />
          </div>

          {showPasswordModal && (
            <PasswordModal
              isSetup={!settings.passwordHash}
              onClose={() => {
                if (!settings.passwordHash) {
                  setShowPasswordModal(false);
                }
              }}
              onUnlock={() => {
                setIsLocked(false);
                setShowPasswordModal(false);
              }}
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
            />
          )}

          {showSettingsModal && (
            <SettingsModal
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              onClose={() => setShowSettingsModal(false)}
              onEnableEncryption={() => {
                setShowPasswordModal(true);
                setShowSettingsModal(false);
              }}
            />
          )}

          {showExportModal && (
            <ExportModal
              onClose={() => setShowExportModal(false)}
            />
          )}
          </div>
        </EncryptionProvider>
      </ThemeProvider>
    </I18nProvider>
  );
};

export default App;
