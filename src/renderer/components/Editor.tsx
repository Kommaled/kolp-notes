import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Note, Tag, Settings } from '../types';
import '../styles/Editor.css';

export type BackupStatus = 'none' | 'local' | 'cloud';

interface EditorProps {
  note: Note | null;
  tags: Tag[];
  onUpdateNote: (id: string, updates: Partial<Note>) => void;
  onAddTag: (name: string, color: string) => Promise<Tag>;
  settings: Settings;
  backupStatus: BackupStatus;
  onSyncClick: () => void;
}

const Editor: React.FC<EditorProps> = ({
  note,
  tags,
  onUpdateNote,
  settings,
  backupStatus,
  onSyncClick,
}) => {
  const [title, setTitle] = useState('');
  const [isTagPickerOpen, setIsTagPickerOpen] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [localFontSize, setLocalFontSize] = useState(settings.fontSize);
  const [localFontFamily, setLocalFontFamily] = useState(settings.fontFamily);
  const [showFontMenu, setShowFontMenu] = useState(false);
  
  const editorRef = useRef<HTMLDivElement>(null);
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const fontMenuRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(false);

  const fontFamilies = [
    { value: 'Inter, system-ui, sans-serif', label: 'Inter' },
    { value: 'Georgia, serif', label: 'Georgia' },
    { value: 'Consolas, monospace', label: 'Consolas' },
    { value: '"Segoe UI", sans-serif', label: 'Segoe UI' },
    { value: '"Fira Code", monospace', label: 'Fira Code' },
    { value: '"Times New Roman", serif', label: 'Times New Roman' },
    { value: 'Arial, sans-serif', label: 'Arial' },
    { value: '"Courier New", monospace', label: 'Courier New' },
    { value: '"Comic Sans MS", cursive', label: 'Comic Sans' },
    { value: '"Trebuchet MS", sans-serif', label: 'Trebuchet MS' },
  ];

  // Close font menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (fontMenuRef.current && !fontMenuRef.current.contains(e.target as Node)) {
        setShowFontMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load note content
  useEffect(() => {
    if (note && contentEditableRef.current) {
      isLoadingRef.current = true;
      setTitle(note.title);
      // Load HTML content directly into contenteditable
      contentEditableRef.current.innerHTML = note.content || '';
      updateCounts();
      isLoadingRef.current = false;
    } else if (!note && contentEditableRef.current) {
      setTitle('');
      contentEditableRef.current.innerHTML = '';
      setWordCount(0);
      setCharCount(0);
    }
  }, [note?.id]);

  const updateCounts = () => {
    if (!contentEditableRef.current) return;
    const text = contentEditableRef.current.innerText || '';
    setCharCount(text.length);
    setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0);
  };

  const getContent = useCallback(() => {
    return contentEditableRef.current?.innerHTML || '';
  }, []);

  // Auto-save - only trigger on actual content changes
  const handleSave = useCallback(() => {
    if (note && contentEditableRef.current) {
      setIsSaving(true);
      const content = getContent();
      onUpdateNote(note.id, { title, content });
      setLastSaved(new Date());
      setTimeout(() => setIsSaving(false), 300);
    }
  }, [note?.id, title, getContent, onUpdateNote]);

  // Track if content actually changed
  const lastContentRef = useRef<string>('');
  const lastTitleRef = useRef<string>('');

  useEffect(() => {
    if (!settings.autoSave || !note) return;
    
    // Check if title actually changed
    if (title === lastTitleRef.current) return;
    lastTitleRef.current = title;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(handleSave, settings.autoSaveInterval);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [title, settings.autoSave, settings.autoSaveInterval, note?.id]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  const handleContentInput = () => {
    if (isLoadingRef.current) return;
    updateCounts();
    // Trigger auto-save with debounce
    if (settings.autoSave && note) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      // Use longer interval for content changes to reduce save frequency
      saveTimeoutRef.current = setTimeout(() => {
        const currentContent = getContent();
        if (currentContent !== lastContentRef.current) {
          lastContentRef.current = currentContent;
          handleSave();
        }
      }, settings.autoSaveInterval);
    }
  };

  // Image drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length === 0) return;

    for (const file of imageFiles) {
      try {
        const base64 = await fileToBase64(file);
        insertImage(base64, file.name);
      } catch (error) {
        console.error('Error processing image:', error);
      }
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const insertImage = (base64: string, fileName: string) => {
    if (!contentEditableRef.current) return;
    
    // Create image element
    const img = document.createElement('img');
    img.src = base64;
    img.alt = fileName;
    img.className = 'editor-inline-image';
    img.style.maxWidth = '100%';
    img.style.borderRadius = '8px';
    img.style.margin = '8px 0';
    img.style.display = 'block';
    
    // Insert at cursor position
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      
      // Check if selection is within our editor
      if (contentEditableRef.current.contains(range.commonAncestorContainer)) {
        range.deleteContents();
        range.insertNode(img);
        
        // Add line break after image
        const br = document.createElement('br');
        range.setStartAfter(img);
        range.insertNode(br);
        range.setStartAfter(br);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      } else {
        // If no selection in editor, append at end
        contentEditableRef.current.appendChild(img);
        contentEditableRef.current.appendChild(document.createElement('br'));
      }
    } else {
      // No selection, append at end
      contentEditableRef.current.appendChild(img);
      contentEditableRef.current.appendChild(document.createElement('br'));
    }
    
    handleContentInput();
    contentEditableRef.current.focus();
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const imageItems = items.filter(item => item.type.startsWith('image/'));

    if (imageItems.length > 0) {
      e.preventDefault();
      
      for (const item of imageItems) {
        const file = item.getAsFile();
        if (file) {
          try {
            const base64 = await fileToBase64(file);
            insertImage(base64, 'pasted-image.png');
          } catch (error) {
            console.error('Error processing pasted image:', error);
          }
        }
      }
    }
  };

  const handleTagToggle = (tagId: string) => {
    if (!note) return;
    
    const newTagIds = note.tagIds.includes(tagId)
      ? note.tagIds.filter(id => id !== tagId)
      : [...note.tagIds, tagId];
    
    onUpdateNote(note.id, { tagIds: newTagIds });
  };

  const formatText = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    contentEditableRef.current?.focus();
    handleContentInput();
  };

  const formatLastSaved = () => {
    if (!lastSaved) return '';
    const now = new Date();
    const diff = now.getTime() - lastSaved.getTime();
    
    if (diff < 60000) {
      return 'Just now';
    } else if (diff < 3600000) {
      const mins = Math.floor(diff / 60000);
      return `${mins} min ago`;
    }
    return lastSaved.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  if (!note) {
    return (
      <div className="editor-panel empty">
        <div className="editor-empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
          </svg>
          <h3>Select a note</h3>
          <p>Select a note from the left panel or create a new one</p>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-panel">
      {/* Editor Header */}
      <div className="editor-header">
        <div className="editor-header-left">
          <input
            type="text"
            className="editor-title-input"
            value={title}
            onChange={handleTitleChange}
            placeholder="Title..."
            style={{ fontSize: settings.fontSize + 4 }}
          />
        </div>
        <div className="editor-header-right">
          <div className="editor-header-actions">
            <button
              className="editor-action-btn"
              onClick={() => setIsTagPickerOpen(!isTagPickerOpen)}
              title="Tags"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
              </svg>
              {note.tagIds.length > 0 && (
                <span className="tag-badge">{note.tagIds.length}</span>
              )}
            </button>
            <button className="editor-action-btn" onClick={handleSave} title="Save (Ctrl+S)">
              {isSaving ? (
                <svg className="saving-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Tag Picker Dropdown */}
      {isTagPickerOpen && (
        <div className="tag-picker">
          <div className="tag-picker-header">
            <span>Tags</span>
            <button className="tag-picker-close" onClick={() => setIsTagPickerOpen(false)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div className="tag-picker-list">
            {tags.length === 0 ? (
              <div className="tag-picker-empty">
                No tags yet. Create them from the sidebar.
              </div>
            ) : (
              tags.map(tag => (
                <label key={tag.id} className="tag-picker-item">
                  <input
                    type="checkbox"
                    checked={note.tagIds.includes(tag.id)}
                    onChange={() => handleTagToggle(tag.id)}
                  />
                  <span className="tag-picker-color" style={{ backgroundColor: tag.color }}></span>
                  <span className="tag-picker-name">{tag.name}</span>
                </label>
              ))
            )}
          </div>
        </div>
      )}

      {/* Editor Toolbar */}
      <div className="editor-toolbar">
        {/* Font Controls */}
        <div className="font-controls" ref={fontMenuRef}>
          <button 
            className="toolbar-btn font-btn"
            onClick={() => setShowFontMenu(!showFontMenu)}
            title="Font"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 7V4h16v3M9 20h6M12 4v16"/>
            </svg>
            <span className="font-label">{fontFamilies.find(f => f.value === localFontFamily)?.label || 'Font'}</span>
            <svg className="dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </button>
          
          {showFontMenu && (
            <div className="font-menu">
              <div className="font-menu-section">
                <label>Font Family</label>
                <div className="font-list">
                  {fontFamilies.map(font => (
                    <button
                      key={font.value}
                      className={`font-option ${localFontFamily === font.value ? 'active' : ''}`}
                      style={{ fontFamily: font.value }}
                      onClick={() => {
                        setLocalFontFamily(font.value);
                        setShowFontMenu(false);
                      }}
                    >
                      {font.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="font-menu-section">
                <label>Font Size</label>
                <div className="font-size-slider">
                  <button 
                    className="size-btn"
                    onClick={() => setLocalFontSize(Math.max(12, localFontSize - 1))}
                    disabled={localFontSize <= 12}
                  >−</button>
                  <span className="size-value">{localFontSize}px</span>
                  <button 
                    className="size-btn"
                    onClick={() => setLocalFontSize(Math.min(28, localFontSize + 1))}
                    disabled={localFontSize >= 28}
                  >+</button>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="toolbar-divider"></div>
        
        <button className="toolbar-btn" onClick={() => formatText('formatBlock', 'h2')} title="Heading">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h10"/>
          </svg>
        </button>
        <button className="toolbar-btn" onClick={() => formatText('bold')} title="Bold (Ctrl+B)">
          <strong>B</strong>
        </button>
        <button className="toolbar-btn" onClick={() => formatText('italic')} title="Italic (Ctrl+I)">
          <em>I</em>
        </button>
        <button className="toolbar-btn" onClick={() => formatText('underline')} title="Underline (Ctrl+U)">
          <u>U</u>
        </button>
        <div className="toolbar-divider"></div>
        <button className="toolbar-btn" onClick={() => formatText('insertUnorderedList')} title="List">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>
          </svg>
        </button>
        <button className="toolbar-btn" onClick={() => formatText('insertOrderedList')} title="Numbered List">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 6h11M10 12h11M10 18h11M4 6h1v4M4 10h2M4 18h2l-2-2.5 2-2.5"/>
          </svg>
        </button>
        <button className="toolbar-btn" onClick={() => {
          const url = prompt('Enter URL:');
          if (url) formatText('createLink', url);
        }} title="Link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
          </svg>
        </button>
        
        <div className="toolbar-spacer"></div>
        
        {/* Image Upload Button */}
        <button 
          className="toolbar-btn" 
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.multiple = true;
            input.onchange = async (e) => {
              const files = Array.from((e.target as HTMLInputElement).files || []);
              for (const file of files) {
                const base64 = await fileToBase64(file);
                insertImage(base64, file.name);
              }
            };
            input.click();
          }}
          title="Add Image"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <path d="M21 15l-5-5L5 21"/>
          </svg>
        </button>
      </div>

      {/* Editor Content Area - Single WYSIWYG Editor */}
      <div 
        ref={editorRef}
        className={`editor-content ${isDragOver ? 'drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragOver && (
          <div className="drag-overlay">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            <p>Drop image here</p>
          </div>
        )}
        
        {/* Contenteditable WYSIWYG Editor */}
        <div
          ref={contentEditableRef}
          className="editor-wysiwyg"
          contentEditable
          onInput={handleContentInput}
          onPaste={handlePaste}
          data-placeholder="Start writing your note... (You can drag and drop images)"
          style={{ 
            fontSize: localFontSize,
            fontFamily: localFontFamily,
          }}
        />
      </div>

      {/* Editor Footer / Status Bar */}
      <div className="editor-footer">
        <div className="editor-footer-left">
          <span className="footer-stat">{wordCount} words</span>
          <span className="footer-divider">•</span>
          <span className="footer-stat">{charCount} characters</span>
        </div>
        <div className="editor-footer-right">
          {/* Status LEDs */}
          <div className="status-leds" title="Backup Status">
            <div 
              className={`status-led led-red ${backupStatus === 'none' ? 'active' : ''}`}
              title="No backup"
            ></div>
            <div 
              className={`status-led led-yellow ${backupStatus === 'local' ? 'active' : ''}`}
              title="Local backup"
            ></div>
            <div 
              className={`status-led led-green ${backupStatus === 'cloud' ? 'active' : ''}`}
              title="Cloud synced"
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Editor;
