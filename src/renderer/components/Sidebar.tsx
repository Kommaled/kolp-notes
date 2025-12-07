import React, { useState } from 'react';
import { Folder, Tag, ViewType, Settings, Note } from '../types';
import { useI18n } from '../contexts/I18nContext';
import '../styles/Sidebar.css';

interface SidebarProps {
  folders: Folder[];
  tags: Tag[];
  notes: Note[];
  currentView: ViewType;
  selectedFolderId: string | null;
  selectedTagId: string | null;
  selectedNoteId: string | null;
  noteCounts: {
    all: number;
    files: number;
    starred: number;
    archived: number;
    trash: number;
    untagged: number;
  };
  onViewChange: (view: ViewType) => void;
  onFolderSelect: (id: string) => void;
  onTagSelect: (id: string) => void;
  onNoteSelect: (id: string) => void;
  onCreateFolder: (name: string, parentId?: string) => Promise<Folder>;
  onDeleteFolder: (id: string) => Promise<void>;
  onCreateTag: (name: string, color: string) => Promise<Tag>;
  onDeleteTag: (id: string) => Promise<void>;
  onOpenSettings: () => void;
  settings: Settings;
}

const Sidebar: React.FC<SidebarProps> = ({
  tags,
  notes,
  currentView,
  selectedTagId,
  selectedNoteId,
  noteCounts,
  onViewChange,
  onTagSelect,
  onNoteSelect,
  onCreateTag,
  onOpenSettings,
  settings,
}) => {
  const { t } = useI18n();
  const [viewsCollapsed, setViewsCollapsed] = useState(false);
  const [tagsCollapsed, setTagsCollapsed] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [starredExpanded, setStarredExpanded] = useState(false);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#086dd6');
  const [searchTags, setSearchTags] = useState('');

  const tagColors = [
    '#f9584f', '#f28c22', '#f7c32e', '#2b9b2b', 
    '#14b8a6', '#086dd6', '#9d5bd2', '#e066a5',
  ];

  const handleAddTag = async () => {
    if (newTagName.trim()) {
      await onCreateTag(newTagName.trim(), newTagColor);
      setNewTagName('');
      setNewTagColor('#086dd6');
      setIsAddingTag(false);
    }
  };

  const filteredTags = tags.filter(tag => 
    tag.name.toLowerCase().includes(searchTags.toLowerCase())
  );

  const getTagNoteCount = (tagId: string): number => {
    // This would ideally come from props, but we'll show 0 for now
    return 0;
  };

  return (
    <div className="sidebar" style={{ width: settings.sidebarWidth }}>
      <div className="nav-container">
        {/* Views Section */}
        <div className="nav-section">
          <div 
            className="section-header"
            onClick={() => setViewsCollapsed(!viewsCollapsed)}
          >
            <div className="section-header-left">
              <span className={`section-icon ${viewsCollapsed ? 'collapsed' : ''}`}>▼</span>
              <span className="section-title">{t.views}</span>
            </div>
          </div>
          
          <div className={`section-content ${viewsCollapsed ? 'collapsed' : ''}`}>
            {/* Notes - Expandable */}
            <div className="nav-item-group">
              <div 
                className={`nav-item has-children ${currentView === 'all' ? 'active' : ''}`}
                onClick={() => onViewChange('all')}
                onDoubleClick={(e) => { e.stopPropagation(); setNotesExpanded(!notesExpanded); }}
              >
                <span className="nav-item-icon">📝</span>
                <span className="nav-item-label">{t.notes}</span>
                <span className="nav-item-count">{noteCounts.all}</span>
              </div>
              {notesExpanded && (
                <div className="nav-item-children">
                  {notes.slice(0, 10).map(note => (
                    <div 
                      key={note.id}
                      className={`nav-subitem ${selectedNoteId === note.id ? 'active' : ''}`}
                      onClick={() => onNoteSelect(note.id)}
                      title={note.title || t.untitled}
                    >
                      <span className="nav-subitem-icon">📄</span>
                      <span className="nav-subitem-label">{note.title || t.untitled}</span>
                    </div>
                  ))}
                  {notes.length > 10 && (
                    <div className="nav-subitem more">
                      <span className="nav-subitem-label">+{notes.length - 10} ...</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div 
              className={`nav-item ${currentView === 'files' ? 'active' : ''}`}
              onClick={() => onViewChange('files')}
            >
              <span className="nav-item-icon">📁</span>
              <span className="nav-item-label">{t.files}</span>
              <span className="nav-item-count">{noteCounts.files}</span>
            </div>
            
            {/* Starred - Expandable */}
            <div className="nav-item-group">
              <div 
                className={`nav-item has-children ${currentView === 'starred' ? 'active' : ''}`}
                onClick={() => onViewChange('starred')}
                onDoubleClick={(e) => { e.stopPropagation(); setStarredExpanded(!starredExpanded); }}
              >
                <span className="nav-item-icon">⭐</span>
                <span className="nav-item-label">{t.starred}</span>
                <span className="nav-item-count">{noteCounts.starred}</span>
              </div>
              {starredExpanded && (
                <div className="nav-item-children">
                  {notes.filter(n => n.isPinned).slice(0, 10).map(note => (
                    <div 
                      key={note.id}
                      className={`nav-subitem ${selectedNoteId === note.id ? 'active' : ''}`}
                      onClick={() => onNoteSelect(note.id)}
                      title={note.title || t.untitled}
                    >
                      <span className="nav-subitem-icon">⭐</span>
                      <span className="nav-subitem-label">{note.title || t.untitled}</span>
                    </div>
                  ))}
                  {notes.filter(n => n.isPinned).length === 0 && (
                    <div className="nav-subitem empty">
                      <span className="nav-subitem-label">{t.noNotes}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div 
              className={`nav-item ${currentView === 'archived' ? 'active' : ''}`}
              onClick={() => onViewChange('archived')}
            >
              <span className="nav-item-icon">📦</span>
              <span className="nav-item-label">{t.archived}</span>
              <span className="nav-item-count">{noteCounts.archived}</span>
            </div>
            
            <div 
              className={`nav-item ${currentView === 'trash' ? 'active' : ''}`}
              onClick={() => onViewChange('trash')}
            >
              <span className="nav-item-icon">🗑️</span>
              <span className="nav-item-label">{t.trash}</span>
              <span className="nav-item-count">{noteCounts.trash}</span>
            </div>
            
            <div 
              className={`nav-item ${currentView === 'untagged' ? 'active' : ''}`}
              onClick={() => onViewChange('untagged')}
            >
              <span className="nav-item-icon">🏷️</span>
              <span className="nav-item-label">{t.untagged}</span>
              <span className="nav-item-count">{noteCounts.untagged}</span>
            </div>
          </div>
        </div>

        {/* Tags Section */}
        <div className="nav-section">
          <div 
            className="section-header"
            onClick={() => setTagsCollapsed(!tagsCollapsed)}
          >
            <div className="section-header-left">
              <span className={`section-icon ${tagsCollapsed ? 'collapsed' : ''}`}>▼</span>
              <span className="section-title">{t.tags}</span>
            </div>
            <button 
              className="section-add-btn"
              onClick={(e) => {
                e.stopPropagation();
                setIsAddingTag(true);
                setTagsCollapsed(false);
              }}
              title={t.newNote}
            >
              +
            </button>
          </div>
          
          <div className={`section-content ${tagsCollapsed ? 'collapsed' : ''}`}>
            {/* Tags Search */}
            {tags.length > 5 && (
              <div className="tags-search">
                <input
                  type="text"
                  className="tags-search-input"
                  placeholder="Search tags..."
                  value={searchTags}
                  onChange={(e) => setSearchTags(e.target.value)}
                />
              </div>
            )}
            
            {/* Add Tag Form */}
            {isAddingTag && (
              <div className="tag-input-row">
                <div className="tag-color-picker">
                  {tagColors.map(color => (
                    <button
                      key={color}
                      className={`tag-color-option ${newTagColor === color ? 'selected' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewTagColor(color)}
                    />
                  ))}
                </div>
                <input
                  type="text"
                  className="tag-name-input"
                  placeholder="Tag name..."
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddTag();
                    if (e.key === 'Escape') setIsAddingTag(false);
                  }}
                  autoFocus
                />
                <button className="tag-save-btn" onClick={handleAddTag}>✓</button>
              </div>
            )}
            
            {/* Tags List */}
            {filteredTags.length === 0 && !isAddingTag ? (
              <div className="empty-tags">{t.noTags}</div>
            ) : (
              filteredTags.map(tag => (
                <div
                  key={tag.id}
                  className={`tag-item ${selectedTagId === tag.id ? 'active' : ''}`}
                  onClick={() => onTagSelect(tag.id)}
                >
                  <span className="tag-icon" style={{ color: tag.color }}>●</span>
                  <span className="tag-name">{tag.name}</span>
                  <span className="tag-count">{getTagNoteCount(tag.id)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="nav-footer">
        <button className="settings-btn" onClick={onOpenSettings}>
          <span className="settings-btn-icon">⚙️</span>
          <span className="settings-btn-label">{t.settings}</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
