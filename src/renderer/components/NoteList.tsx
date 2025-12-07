import React, { useState, useEffect } from 'react';
import { Note, ViewType, Settings } from '../types';
import '../styles/NoteList.css';

interface NoteListProps {
  notes: Note[];
  selectedNoteId: string | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onNoteSelect: (note: Note) => void;
  onCreateNote: () => void;
  onDeleteNote: (id: string, permanent?: boolean) => void;
  onTogglePin: (id: string) => void;
  currentView: ViewType;
  onEmptyTrash: () => void;
  onRestoreNote: (id: string) => void;
  onExportNote: (note: Note) => void;
  onDuplicateNote: (note: Note) => void;
  settings: Settings;
}

const NoteList: React.FC<NoteListProps> = ({
  notes,
  selectedNoteId,
  searchQuery,
  onSearchChange,
  onNoteSelect,
  onCreateNote,
  onDeleteNote,
  onTogglePin,
  currentView,
  onEmptyTrash,
  onRestoreNote,
  onExportNote,
  onDuplicateNote,
  settings,
}) => {
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    noteId: string;
  } | null>(null);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const formatDate = (date: Date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return d.toLocaleDateString('en-US', { weekday: 'long' });
    } else {
      return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    }
  };

  const getPreview = (content: string): string => {
    const text = content.replace(/<[^>]*>/g, '').trim();
    return text.length > 120 ? text.substring(0, 120) + '...' : text || 'Empty note';
  };

  const handleContextMenu = (e: React.MouseEvent, noteId: string) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      noteId,
    });
  };

  const getViewTitle = () => {
    switch (currentView) {
      case 'all':
        return 'Notes';
      case 'pinned':
      case 'starred':
        return 'Starred';
      case 'trash':
        return 'Trash';
      case 'folder':
        return 'Folder';
      case 'tag':
        return 'Tag';
      case 'files':
        return 'Files';
      case 'archived':
        return 'Archive';
      case 'untagged':
        return 'Untagged';
      default:
        return 'Notes';
    }
  };

  return (
    <div className="items-list">
      {/* Items List Header */}
      <div className="items-list-header">
        <div className="items-list-title-row">
          <h2 className="items-list-title">{getViewTitle()}</h2>
          <span className="items-list-count">{notes.length}</span>
        </div>
        
        {currentView !== 'trash' && (
          <button className="items-list-add-btn" onClick={onCreateNote} title="New Note">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14m-7-7h14"/>
            </svg>
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="items-list-search">
        <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <input
          type="text"
          className="search-input"
          placeholder="Search notes..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchQuery && (
          <button className="search-clear" onClick={() => onSearchChange('')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        )}
      </div>

      {/* Trash Actions */}
      {currentView === 'trash' && notes.length > 0 && (
        <div className="items-list-actions">
          <button className="trash-empty-btn" onClick={onEmptyTrash}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
            <span>Empty Trash</span>
          </button>
        </div>
      )}

      {/* Items List Content */}
      <div className="items-list-content">
        {notes.length === 0 ? (
          <div className="items-list-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            <p className="empty-title">
              {currentView === 'trash' ? 'Trash is empty' : 'No notes yet'}
            </p>
            {currentView !== 'trash' && (
              <button className="empty-create-btn" onClick={onCreateNote}>
                Create your first note
              </button>
            )}
          </div>
        ) : (
          <div className="items-list-items">
            {notes.map(note => (
              <div
                key={note.id}
                className={`item ${selectedNoteId === note.id ? 'selected' : ''}`}
                onClick={() => onNoteSelect(note)}
                onContextMenu={(e) => handleContextMenu(e, note.id)}
              >
                <div className="item-header">
                  <div className="item-title-row">
                    {note.isPinned && (
                      <svg className="item-pin-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
                      </svg>
                    )}
                    <h3 className="item-title">{note.title || 'Untitled'}</h3>
                  </div>
                  {settings.showNoteDate && (
                    <span className="item-date">{formatDate(note.updatedAt)}</span>
                  )}
                </div>
                {settings.showNotePreview && (
                  <p className="item-preview">{getPreview(note.content)}</p>
                )}
                {note.tagIds.length > 0 && (
                  <div className="item-tags">
                    {note.tagIds.slice(0, 3).map((_, i) => (
                      <span key={i} className="item-tag-indicator"></span>
                    ))}
                    {note.tagIds.length > 3 && (
                      <span className="item-tags-more">+{note.tagIds.length - 3}</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {currentView === 'trash' ? (
            <>
              <button
                className="context-menu-item"
                onClick={() => {
                  onRestoreNote(contextMenu.noteId);
                  setContextMenu(null);
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                <span>Restore</span>
              </button>
              <button
                className="context-menu-item danger"
                onClick={() => {
                  onDeleteNote(contextMenu.noteId, true);
                  setContextMenu(null);
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
                <span>Delete Forever</span>
              </button>
            </>
          ) : (
            <>
              <button
                className="context-menu-item"
                onClick={() => {
                  onTogglePin(contextMenu.noteId);
                  setContextMenu(null);
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
                </svg>
                <span>
                  {notes.find(n => n.id === contextMenu.noteId)?.isPinned 
                    ? 'Unpin' 
                    : 'Pin'}
                </span>
              </button>
              
              <div className="context-menu-divider"></div>
              
              {/* Duplicate Note */}
              <button
                className="context-menu-item"
                onClick={() => {
                  const note = notes.find(n => n.id === contextMenu.noteId);
                  if (note) onDuplicateNote(note);
                  setContextMenu(null);
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                </svg>
                <span>Duplicate</span>
              </button>
              
              {/* Export Note */}
              <button
                className="context-menu-item"
                onClick={() => {
                  const note = notes.find(n => n.id === contextMenu.noteId);
                  if (note) onExportNote(note);
                  setContextMenu(null);
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                <span>Export</span>
              </button>
              
              {/* Copy Content */}
              <button
                className="context-menu-item"
                onClick={() => {
                  const note = notes.find(n => n.id === contextMenu.noteId);
                  if (note) {
                    navigator.clipboard.writeText(note.content);
                  }
                  setContextMenu(null);
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/>
                  <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                </svg>
                <span>Copy Content</span>
              </button>
              
              <div className="context-menu-divider"></div>
              
              <button
                className="context-menu-item danger"
                onClick={() => {
                  onDeleteNote(contextMenu.noteId);
                  setContextMenu(null);
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
                <span>Move to Trash</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default NoteList;
