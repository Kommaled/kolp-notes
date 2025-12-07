// Note interface
export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  isPinned: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  tagIds: string[];
  folderId?: string;
  // Images stored as base64
  images?: { [id: string]: string };
  // Encryption fields (stored in DB)
  encryptedTitle?: string;
  encryptedContent?: string;
  titleIV?: string;
  contentIV?: string;
  isEncrypted: boolean;
}

// Tag interface
export interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: Date;
}

// Folder interface
export interface Folder {
  id: string;
  name: string;
  parentId?: string;
  createdAt: Date;
  updatedAt: Date;
  icon?: string;
  color?: string;
}

// Settings interface
export interface Settings {
  id: string;
  // Appearance
  theme: 'light' | 'dark' | 'system';
  accentColor: 'purple' | 'blue' | 'green' | 'orange' | 'red' | 'pink' | 'yellow';
  fontSize: number;
  fontFamily: string;
  editorFontFamily: string;
  lineHeight: number;
  compactMode: boolean;
  showNotePreview: boolean;
  showNoteDate: boolean;
  showWordCount: boolean;
  showCharCount: boolean;
  reduceAnimations: boolean;
  // Editor
  autoSave: boolean;
  autoSaveInterval: number;
  spellCheck: boolean;
  editorMode: 'rich' | 'markdown' | 'plain';
  tabSize: number;
  useHardTabs: boolean;
  wordWrap: boolean;
  showLineNumbers: boolean;
  highlightCurrentLine: boolean;
  autoCloseBrackets: boolean;
  autoCloseQuotes: boolean;
  enableSmartQuotes: boolean;
  enableAutoCorrect: boolean;
  // Security
  encryptionEnabled: boolean;
  passwordHash?: string;
  passwordSalt?: string;
  testCiphertext?: string;
  testIV?: string;
  autoLockEnabled: boolean;
  autoLockTimeout: number; // minutes
  lockOnMinimize: boolean;
  lockOnSleep: boolean;
  requirePasswordOnStart: boolean;
  // Layout
  sidebarWidth: number;
  noteListWidth: number;
  sidebarPosition: 'left' | 'right';
  noteListPosition: 'left' | 'right';
  showSidebar: boolean;
  showNoteList: boolean;
  // Notes
  sortBy: 'updatedAt' | 'createdAt' | 'title';
  sortOrder: 'asc' | 'desc';
  defaultNoteTitle: string;
  openLastNote: boolean;
  confirmDelete: boolean;
  moveToTrashFirst: boolean;
  trashRetentionDays: number;
  duplicateNotePrefix: string;
  // Backup
  syncFolderPath?: string;
  autoBackup?: boolean;
  autoBackupInterval: number;
  keepBackupCount: number;
  backupOnExit: boolean;
  // General
  startMinimized: boolean;
  minimizeToTray: boolean;
  showInTaskbar: boolean;
  launchOnStartup: boolean;
  checkForUpdates: boolean;
  sendAnonymousUsage: boolean;
  // Shortcuts
  enableGlobalShortcuts: boolean;
  quickNoteShortcut: string;
  searchShortcut: string;
  // Advanced
  enableDevTools: boolean;
  debugMode: boolean;
  clearCacheOnExit: boolean;
  maxRecentNotes: number;
  maxSearchResults: number;
  // Deprecated but kept for compatibility
  googleDriveEnabled?: boolean;
  googleDriveToken?: string;
  googleDriveRefreshToken?: string;
}

// Default settings
export const defaultSettings: Settings = {
  id: 'main-settings',
  // Appearance
  theme: 'dark',
  accentColor: 'yellow',
  fontSize: 14,
  fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Text, Segoe UI, Roboto, sans-serif',
  editorFontFamily: 'SF Mono, Consolas, Monaco, monospace',
  lineHeight: 1.6,
  compactMode: false,
  showNotePreview: true,
  showNoteDate: true,
  showWordCount: true,
  showCharCount: true,
  reduceAnimations: false,
  // Editor
  autoSave: true,
  autoSaveInterval: 1000,
  spellCheck: true,
  editorMode: 'rich',
  tabSize: 4,
  useHardTabs: false,
  wordWrap: true,
  showLineNumbers: false,
  highlightCurrentLine: true,
  autoCloseBrackets: true,
  autoCloseQuotes: true,
  enableSmartQuotes: false,
  enableAutoCorrect: true,
  // Security
  encryptionEnabled: false,
  autoLockEnabled: false,
  autoLockTimeout: 15,
  lockOnMinimize: false,
  lockOnSleep: true,
  requirePasswordOnStart: false,
  // Layout
  sidebarWidth: 220,
  noteListWidth: 300,
  sidebarPosition: 'left',
  noteListPosition: 'left',
  showSidebar: true,
  showNoteList: true,
  // Notes
  sortBy: 'updatedAt',
  sortOrder: 'desc',
  defaultNoteTitle: 'New Note',
  openLastNote: true,
  confirmDelete: true,
  moveToTrashFirst: true,
  trashRetentionDays: 30,
  duplicateNotePrefix: 'Copy - ',
  // Backup
  syncFolderPath: undefined,
  autoBackup: false,
  autoBackupInterval: 300000,
  keepBackupCount: 10,
  backupOnExit: false,
  // General
  startMinimized: false,
  minimizeToTray: true,
  showInTaskbar: true,
  launchOnStartup: false,
  checkForUpdates: true,
  sendAnonymousUsage: false,
  // Shortcuts
  enableGlobalShortcuts: false,
  quickNoteShortcut: 'Ctrl+Shift+N',
  searchShortcut: 'Ctrl+Shift+F',
  // Advanced
  enableDevTools: false,
  debugMode: false,
  clearCacheOnExit: false,
  maxRecentNotes: 20,
  maxSearchResults: 50,
};

// Export format types
export interface ExportData {
  version: string;
  exportedAt: string;
  notes: Note[];
  tags: Tag[];
  folders: Folder[];
}

// Search result interface
export interface SearchResult {
  note: Note;
  matchType: 'title' | 'content' | 'tag';
  matchText: string;
}

// View types
export type ViewType = 'all' | 'folder' | 'tag' | 'trash' | 'pinned' | 'starred' | 'files' | 'archived' | 'untagged';

// App state interface
export interface AppState {
  selectedNoteId: string | null;
  selectedFolderId: string | null;
  selectedTagId: string | null;
  currentView: ViewType;
  searchQuery: string;
  isLocked: boolean;
  isSidebarCollapsed: boolean;
}

// Context menu item
export interface ContextMenuItem {
  label: string;
  icon?: string;
  action: () => void;
  separator?: boolean;
  danger?: boolean;
}
