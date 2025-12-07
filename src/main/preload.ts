import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),
  windowIsMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  
  // System info
  getSystemLocale: () => ipcRenderer.invoke('get-system-locale'),
  getUserProfile: () => ipcRenderer.invoke('get-user-profile'),
  
  // Dialog operations
  showSaveDialog: (options: any) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options: any) => ipcRenderer.invoke('show-open-dialog', options),
  showMessageBox: (options: any) => ipcRenderer.invoke('show-message-box', options),
  
  // File operations
  saveFile: (filePath: string, content: string) => 
    ipcRenderer.invoke('save-file', { filePath, content }),
  readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath),
  pathExists: (path: string) => ipcRenderer.invoke('path-exists', path),
  ensureDir: (path: string) => ipcRenderer.invoke('ensure-dir', path),
  
  // Folder selection
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  
  // App info
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  
  // KOLP File operations
  kolpSaveLocal: (folderPath: string) => ipcRenderer.invoke('kolp-save-local', folderPath),
  kolpLoadLocal: (folderPath: string) => ipcRenderer.invoke('kolp-load-local', folderPath),
  kolpExport: (data: any) => ipcRenderer.invoke('kolp-export', data),
  kolpImport: () => ipcRenderer.invoke('kolp-import'),
  
  // Google Drive
  googleAuth: (clientId: string, clientSecret: string) => 
    ipcRenderer.invoke('google-auth', { clientId, clientSecret }),
  googleStatus: () => ipcRenderer.invoke('google-status'),
  googleDisconnect: () => ipcRenderer.invoke('google-disconnect'),
  googleSyncUpload: (data: any) => ipcRenderer.invoke('google-sync-upload', data),
  googleSyncDownload: () => ipcRenderer.invoke('google-sync-download'),
  
  // Menu event listeners
  onNewNote: (callback: () => void) => {
    ipcRenderer.on('menu-new-note', callback);
    return () => ipcRenderer.removeListener('menu-new-note', callback);
  },
  onExport: (callback: () => void) => {
    ipcRenderer.on('menu-export', callback);
    return () => ipcRenderer.removeListener('menu-export', callback);
  },
  onToggleTheme: (callback: () => void) => {
    ipcRenderer.on('menu-toggle-theme', callback);
    return () => ipcRenderer.removeListener('menu-toggle-theme', callback);
  },
  onImportData: (callback: (data: { path: string; content: string }) => void) => {
    ipcRenderer.on('import-data', (_, data) => callback(data));
    return () => ipcRenderer.removeListener('import-data', callback as any);
  },
  onBeforeQuit: (callback: () => void) => {
    ipcRenderer.on('app-before-quit', callback);
    return () => ipcRenderer.removeListener('app-before-quit', callback);
  },
});

// Type definitions for TypeScript
declare global {
  interface Window {
    electronAPI: {
      windowMinimize: () => Promise<void>;
      windowMaximize: () => Promise<void>;
      windowClose: () => Promise<void>;
      windowIsMaximized: () => Promise<boolean>;
      getSystemLocale: () => Promise<string>;
      getUserProfile: () => Promise<string>;
      showSaveDialog: (options: any) => Promise<any>;
      showOpenDialog: (options: any) => Promise<any>;
      showMessageBox: (options: any) => Promise<any>;
      saveFile: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>;
      readFile: (filePath: string) => Promise<{ success: boolean; content?: string; error?: string }>;
      pathExists: (path: string) => Promise<boolean>;
      ensureDir: (path: string) => Promise<{ success: boolean; error?: string }>;
      selectFolder: () => Promise<{ success: boolean; path?: string; error?: string }>;
      getAppPath: () => Promise<string>;
      
      // KOLP
      kolpSaveLocal: (folderPath: string) => Promise<{ success: boolean; path?: string; error?: string }>;
      kolpLoadLocal: (folderPath: string) => Promise<{ success: boolean; data?: any; error?: string }>;
      kolpExport: (data: any) => Promise<{ success: boolean; path?: string; error?: string }>;
      kolpImport: () => Promise<{ success: boolean; data?: any; error?: string }>;
      
      // Google Drive
      googleAuth: (clientId: string, clientSecret: string) => Promise<{ success: boolean; email?: string; error?: string }>;
      googleStatus: () => Promise<{ connected: boolean; email?: string; expiresAt?: number }>;
      googleDisconnect: () => Promise<{ success: boolean }>;
      googleSyncUpload: (data: any) => Promise<{ success: boolean; fileId?: string; error?: string }>;
      googleSyncDownload: () => Promise<{ success: boolean; data?: any; error?: string }>;
      
      onNewNote: (callback: () => void) => () => void;
      onExport: (callback: () => void) => () => void;
      onToggleTheme: (callback: () => void) => () => void;
      onImportData: (callback: (data: { path: string; content: string }) => void) => () => void;
      onBeforeQuit: (callback: () => void) => () => void;
    };
  }
}
