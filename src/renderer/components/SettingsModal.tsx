import React, { useState, useEffect } from 'react';
import { Settings } from '../types';
import { useI18n } from '../contexts/I18nContext';
import '../styles/Modal.css';

interface SettingsModalProps {
  settings: Settings;
  onUpdateSettings: (updates: Partial<Settings>) => Promise<void>;
  onClose: () => void;
  onEnableEncryption: () => void;
}

type SettingsTab = 'general' | 'editor' | 'security' | 'backups' | 'appearance' | 'advanced' | 'about';

const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onClose,
  onEnableEncryption,
}) => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [syncMessage, setSyncMessage] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [detectedServices, setDetectedServices] = useState<{name: string; path: string}[]>([]);
  
  const syncFolder = settings.syncFolderPath || '';

  useEffect(() => {
    detectCloudServices();
  }, []);

  const detectCloudServices = async () => {
    const detected: {name: string; path: string}[] = [];
    
    let userProfile = '';
    try {
      userProfile = await window.electronAPI.getUserProfile();
    } catch {
      userProfile = 'C:\\Users\\User';
    }
    
    const syncPaths = {
      googleDrive: [
        'G:\\My Drive',
        `${userProfile}\\Google Drive`,
        `${userProfile}\\Google Drive Stream\\My Drive`,
      ],
      oneDrive: [
        `${userProfile}\\OneDrive`,
        `${userProfile}\\OneDrive - Personal`,
      ],
      dropbox: [
        `${userProfile}\\Dropbox`,
      ],
    };
    
    for (const p of syncPaths.googleDrive) {
      try {
        const exists = await window.electronAPI.pathExists(p);
        if (exists) {
          detected.push({ name: 'Google Drive', path: p });
          break;
        }
      } catch {}
    }
    
    for (const p of syncPaths.oneDrive) {
      try {
        const exists = await window.electronAPI.pathExists(p);
        if (exists) {
          detected.push({ name: 'OneDrive', path: p });
          break;
        }
      } catch {}
    }
    
    for (const p of syncPaths.dropbox) {
      try {
        const exists = await window.electronAPI.pathExists(p);
        if (exists) {
          detected.push({ name: 'Dropbox', path: p });
          break;
        }
      } catch {}
    }
    
    setDetectedServices(detected);
  };

  const selectCloudService = async (service: {name: string; path: string}) => {
    if (syncFolder.includes(service.path)) {
      await onUpdateSettings({ syncFolderPath: undefined, autoBackup: false });
      setSyncMessage(`${service.name} disconnected`);
      return;
    }
    
    const kolpFolder = `${service.path}\\Kolp`;
    try {
      await window.electronAPI.ensureDir(kolpFolder);
      await onUpdateSettings({ syncFolderPath: kolpFolder });
      setSyncMessage(`✓ ${service.name} connected!`);
    } catch (error) {
      setSyncMessage(`Failed to create ${service.name} folder`);
    }
  };

  const handleSelectSyncFolder = async () => {
    try {
      const result = await window.electronAPI.selectFolder();
      if (result.success && result.path) {
        await onUpdateSettings({ syncFolderPath: result.path });
        setSyncMessage('✓ Sync folder selected');
      }
    } catch (error) {
      setSyncMessage('Failed to select folder');
    }
  };

  const handleBackup = async () => {
    if (!syncFolder) {
      setSyncMessage('Please select a folder first');
      return;
    }

    setIsSyncing(true);
    setSyncMessage('Backing up...');

    try {
      const result = await window.electronAPI.kolpSaveLocal(syncFolder);
      if (result.success) {
        setSyncMessage('✓ Backup successful!');
      } else {
        setSyncMessage(`Error: ${result.error}`);
      }
    } catch (error) {
      setSyncMessage('Backup failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRestore = async () => {
    if (!syncFolder) {
      setSyncMessage('Please select a folder first');
      return;
    }

    setIsSyncing(true);
    setSyncMessage('Restoring...');

    try {
      const result = await window.electronAPI.kolpLoadLocal(syncFolder);
      if (result.success) {
        setSyncMessage('✓ Restore successful! Reloading...');
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setSyncMessage(`Error: ${result.error}`);
      }
    } catch (error) {
      setSyncMessage('Restore failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const tabs: { id: SettingsTab; label: string; icon: string }[] = [
    { id: 'general', label: t.general, icon: '⚙️' },
    { id: 'editor', label: t.editor, icon: '✏️' },
    { id: 'appearance', label: t.appearance, icon: '🎨' },
    { id: 'security', label: t.security, icon: '🔒' },
    { id: 'backups', label: t.backups, icon: '💾' },
    { id: 'advanced', label: t.advanced, icon: '🔧' },
    { id: 'about', label: t.about, icon: 'ℹ️' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="settings-tab-content">
            <div className="settings-group">
              <h4 className="settings-group-title">{t.startup}</h4>
              
              <div className="settings-item">
                <div className="settings-item-left">
                  <span className="settings-item-label">{t.openLastNote}</span>
                  <span className="settings-item-desc">{t.openLastNoteDesc}</span>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={settings.openLastNote}
                    onChange={(e) => onUpdateSettings({ openLastNote: e.target.checked })}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="settings-item">
                <div className="settings-item-left">
                  <span className="settings-item-label">{t.startMinimized}</span>
                  <span className="settings-item-desc">{t.startMinimizedDesc}</span>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={settings.startMinimized}
                    onChange={(e) => onUpdateSettings({ startMinimized: e.target.checked })}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="settings-item">
                <div className="settings-item-left">
                  <span className="settings-item-label">{t.launchOnStartup}</span>
                  <span className="settings-item-desc">{t.launchOnStartupDesc}</span>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={settings.launchOnStartup}
                    onChange={(e) => onUpdateSettings({ launchOnStartup: e.target.checked })}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>

            <div className="settings-group">
              <h4 className="settings-group-title">{t.windowBehavior}</h4>
              
              <div className="settings-item">
                <div className="settings-item-left">
                  <span className="settings-item-label">{t.minimizeToTray}</span>
                  <span className="settings-item-desc">{t.minimizeToTrayDesc}</span>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={settings.minimizeToTray}
                    onChange={(e) => onUpdateSettings({ minimizeToTray: e.target.checked })}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="settings-item">
                <div className="settings-item-left">
                  <span className="settings-item-label">{t.showInTaskbar}</span>
                  <span className="settings-item-desc">{t.showInTaskbarDesc}</span>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={settings.showInTaskbar}
                    onChange={(e) => onUpdateSettings({ showInTaskbar: e.target.checked })}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>

            <div className="settings-group">
              <h4 className="settings-group-title">{t.notesSettings}</h4>
              
              <div className="settings-item">
                <div className="settings-item-left">
                  <span className="settings-item-label">{t.confirmDelete}</span>
                  <span className="settings-item-desc">{t.confirmDeleteDesc}</span>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={settings.confirmDelete}
                    onChange={(e) => onUpdateSettings({ confirmDelete: e.target.checked })}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="settings-item">
                <div className="settings-item-left">
                  <span className="settings-item-label">{t.moveToTrash}</span>
                  <span className="settings-item-desc">{t.moveToTrashDesc}</span>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={settings.moveToTrashFirst}
                    onChange={(e) => onUpdateSettings({ moveToTrashFirst: e.target.checked })}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="settings-item-vertical">
                <span className="settings-item-label">{t.trashRetention}</span>
                <select
                  className="settings-select"
                  value={settings.trashRetentionDays}
                  onChange={(e) => onUpdateSettings({ trashRetentionDays: parseInt(e.target.value) })}
                >
                  <option value={7}>7 {t.days}</option>
                  <option value={14}>14 {t.days}</option>
                  <option value={30}>30 {t.days}</option>
                  <option value={60}>60 {t.days}</option>
                  <option value={90}>90 {t.days}</option>
                  <option value={365}>365 {t.days}</option>
                  <option value={-1}>{t.never}</option>
                </select>
              </div>

              <div className="settings-item-vertical">
                <span className="settings-item-label">{t.defaultTitle}</span>
                <input
                  type="text"
                  className="settings-input"
                  value={settings.defaultNoteTitle}
                  onChange={(e) => onUpdateSettings({ defaultNoteTitle: e.target.value })}
                  placeholder={t.untitled}
                />
              </div>

              <div className="settings-item-vertical">
                <span className="settings-item-label">{t.duplicatePrefix}</span>
                <input
                  type="text"
                  className="settings-input"
                  value={settings.duplicateNotePrefix}
                  onChange={(e) => onUpdateSettings({ duplicateNotePrefix: e.target.value })}
                  placeholder={t.duplicate}
                />
              </div>
            </div>

            <div className="settings-group">
              <h4 className="settings-group-title">{t.sorting}</h4>
              
              <div className="settings-item-vertical">
                <span className="settings-item-label">{t.sortBy}</span>
                <select
                  className="settings-select"
                  value={settings.sortBy}
                  onChange={(e) => onUpdateSettings({ sortBy: e.target.value as 'updatedAt' | 'createdAt' | 'title' })}
                >
                  <option value="updatedAt">{t.sortByUpdated}</option>
                  <option value="createdAt">{t.sortByCreated}</option>
                  <option value="title">{t.sortByTitle}</option>
                </select>
              </div>

              <div className="settings-item-vertical">
                <span className="settings-item-label">{t.sortOrder}</span>
                <select
                  className="settings-select"
                  value={settings.sortOrder}
                  onChange={(e) => onUpdateSettings({ sortOrder: e.target.value as 'asc' | 'desc' })}
                >
                  <option value="desc">{t.newestFirst}</option>
                  <option value="asc">{t.oldestFirst}</option>
                </select>
              </div>
            </div>

            <div className="settings-group">
              <h4 className="settings-group-title">{t.updates}</h4>
              
              <div className="settings-item">
                <div className="settings-item-left">
                  <span className="settings-item-label">{t.checkUpdates}</span>
                  <span className="settings-item-desc">{t.checkUpdatesDesc}</span>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={settings.checkForUpdates}
                    onChange={(e) => onUpdateSettings({ checkForUpdates: e.target.checked })}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>
        );

      case 'editor':
        return (
          <div className="settings-tab-content">
            <div className="settings-group">
              <h4 className="settings-group-title">{t.autoSave}</h4>
              
              <div className="settings-item">
                <div className="settings-item-left">
                  <span className="settings-item-label">{t.autoSave}</span>
                  <span className="settings-item-desc">{t.autoSaveDesc}</span>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={settings.autoSave}
                    onChange={(e) => onUpdateSettings({ autoSave: e.target.checked })}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              {settings.autoSave && (
                <div className="settings-item-vertical">
                  <span className="settings-item-label">{t.autoSaveInterval}</span>
                  <select
                    className="settings-select"
                    value={settings.autoSaveInterval}
                    onChange={(e) => onUpdateSettings({ autoSaveInterval: parseInt(e.target.value) })}
                  >
                    <option value={500}>0.5 {t.seconds}</option>
                    <option value={1000}>1 {t.seconds}</option>
                    <option value={2000}>2 {t.seconds}</option>
                    <option value={5000}>5 {t.seconds}</option>
                    <option value={10000}>10 {t.seconds}</option>
                  </select>
                </div>
              )}
            </div>

            <div className="settings-group">
              <h4 className="settings-group-title">{t.spellCheck}</h4>
              
              <div className="settings-item">
                <div className="settings-item-left">
                  <span className="settings-item-label">{t.spellCheck}</span>
                  <span className="settings-item-desc">{t.spellCheckDesc}</span>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={settings.spellCheck}
                    onChange={(e) => onUpdateSettings({ spellCheck: e.target.checked })}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="settings-item">
                <div className="settings-item-left">
                  <span className="settings-item-label">{t.autoCorrect}</span>
                  <span className="settings-item-desc">{t.autoCorrectDesc}</span>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={settings.enableAutoCorrect}
                    onChange={(e) => onUpdateSettings({ enableAutoCorrect: e.target.checked })}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="settings-item">
                <div className="settings-item-left">
                  <span className="settings-item-label">{t.smartQuotes}</span>
                  <span className="settings-item-desc">{t.smartQuotesDesc}</span>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={settings.enableSmartQuotes}
                    onChange={(e) => onUpdateSettings({ enableSmartQuotes: e.target.checked })}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>

            <div className="settings-group">
              <h4 className="settings-group-title">{t.codeEditing}</h4>
              
              <div className="settings-item">
                <div className="settings-item-left">
                  <span className="settings-item-label">{t.autoCloseBrackets}</span>
                  <span className="settings-item-desc">{t.autoCloseBracketsDesc}</span>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={settings.autoCloseBrackets}
                    onChange={(e) => onUpdateSettings({ autoCloseBrackets: e.target.checked })}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="settings-item">
                <div className="settings-item-left">
                  <span className="settings-item-label">{t.autoCloseQuotes}</span>
                  <span className="settings-item-desc">{t.autoCloseQuotesDesc}</span>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={settings.autoCloseQuotes}
                    onChange={(e) => onUpdateSettings({ autoCloseQuotes: e.target.checked })}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="settings-item">
                <div className="settings-item-left">
                  <span className="settings-item-label">{t.lineNumbers}</span>
                  <span className="settings-item-desc">{t.lineNumbersDesc}</span>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={settings.showLineNumbers}
                    onChange={(e) => onUpdateSettings({ showLineNumbers: e.target.checked })}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="settings-item">
                <div className="settings-item-left">
                  <span className="settings-item-label">Highlight Current Line</span>
                  <span className="settings-item-desc">Highlight the line where cursor is</span>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={settings.highlightCurrentLine}
                    onChange={(e) => onUpdateSettings({ highlightCurrentLine: e.target.checked })}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="settings-item">
                <div className="settings-item-left">
                  <span className="settings-item-label">Word Wrap</span>
                  <span className="settings-item-desc">Automatically wrap long lines</span>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={settings.wordWrap}
                    onChange={(e) => onUpdateSettings({ wordWrap: e.target.checked })}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="settings-item-vertical">
                <span className="settings-item-label">Tab Size</span>
                <select
                  className="settings-select"
                  value={settings.tabSize}
                  onChange={(e) => onUpdateSettings({ tabSize: parseInt(e.target.value) })}
                >
                  <option value={2}>2 spaces</option>
                  <option value={4}>4 spaces</option>
                  <option value={8}>8 spaces</option>
                </select>
              </div>

              <div className="settings-item">
                <div className="settings-item-left">
                  <span className="settings-item-label">Use Hard Tabs</span>
                  <span className="settings-item-desc">Use tab character instead of spaces</span>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={settings.useHardTabs}
                    onChange={(e) => onUpdateSettings({ useHardTabs: e.target.checked })}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>

            <div className="settings-group">
              <h4 className="settings-group-title">Default Editor</h4>
              
              <div className="settings-item-vertical">
                <span className="settings-item-label">Note Type</span>
                <select
                  className="settings-select"
                  value={settings.editorMode}
                  onChange={(e) => onUpdateSettings({ editorMode: e.target.value as 'rich' | 'markdown' | 'plain' })}
                >
                  <option value="rich">Rich Text (WYSIWYG)</option>
                  <option value="markdown">Markdown</option>
                  <option value="plain">Plain Text</option>
                </select>
              </div>
            </div>

            <div className="settings-group">
              <h4 className="settings-group-title">Keyboard Shortcuts</h4>
              
              <div className="shortcuts-list">
                <div className="shortcut-item">
                  <span className="shortcut-label">New Note</span>
                  <span className="shortcut-keys"><kbd>Ctrl</kbd> + <kbd>N</kbd></span>
                </div>
                <div className="shortcut-item">
                  <span className="shortcut-label">Save</span>
                  <span className="shortcut-keys"><kbd>Ctrl</kbd> + <kbd>S</kbd></span>
                </div>
                <div className="shortcut-item">
                  <span className="shortcut-label">Search</span>
                  <span className="shortcut-keys"><kbd>Ctrl</kbd> + <kbd>F</kbd></span>
                </div>
                <div className="shortcut-item">
                  <span className="shortcut-label">Bold</span>
                  <span className="shortcut-keys"><kbd>Ctrl</kbd> + <kbd>B</kbd></span>
                </div>
                <div className="shortcut-item">
                  <span className="shortcut-label">Italic</span>
                  <span className="shortcut-keys"><kbd>Ctrl</kbd> + <kbd>I</kbd></span>
                </div>
                <div className="shortcut-item">
                  <span className="shortcut-label">Underline</span>
                  <span className="shortcut-keys"><kbd>Ctrl</kbd> + <kbd>U</kbd></span>
                </div>
                <div className="shortcut-item">
                  <span className="shortcut-label">Settings</span>
                  <span className="shortcut-keys"><kbd>Ctrl</kbd> + <kbd>,</kbd></span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="settings-tab-content">
            <div className="settings-group">
              <h4 className="settings-group-title">Encryption</h4>
              
              <div className="settings-item">
                <div className="settings-item-left">
                  <span className="settings-item-label">End-to-End Encryption</span>
                  <span className="settings-item-desc">Encrypt all your notes with AES-256-GCM</span>
                </div>
                {settings.encryptionEnabled ? (
                  <span className="status-badge enabled">✓ Enabled</span>
                ) : (
                  <button className="btn-primary-small" onClick={onEnableEncryption}>Enable</button>
                )}
              </div>

              {settings.encryptionEnabled && (
                <div className="settings-info-box success">
                  <span>🔒</span>
                  <p>All your notes are protected with strong encryption. Don't forget your master password - you won't be able to access your notes if lost.</p>
                </div>
              )}
            </div>

            <div className="settings-group">
              <h4 className="settings-group-title">Auto Lock</h4>
              
              <div className="settings-item">
                <div className="settings-item-left">
                  <span className="settings-item-label">Auto Lock</span>
                  <span className="settings-item-desc">Lock when inactive for a period</span>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={settings.autoLockEnabled}
                    onChange={(e) => onUpdateSettings({ autoLockEnabled: e.target.checked })}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              {settings.autoLockEnabled && (
                <div className="settings-item-vertical">
                  <span className="settings-item-label">Lock Timeout</span>
                  <select
                    className="settings-select"
                    value={settings.autoLockTimeout}
                    onChange={(e) => onUpdateSettings({ autoLockTimeout: parseInt(e.target.value) })}
                  >
                    <option value={1}>1 minute</option>
                    <option value={5}>5 minutes</option>
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={60}>1 hour</option>
                  </select>
                </div>
              )}

              <div className="settings-item">
                <div className="settings-item-left">
                  <span className="settings-item-label">Lock on Minimize</span>
                  <span className="settings-item-desc">Lock when window is minimized</span>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={settings.lockOnMinimize}
                    onChange={(e) => onUpdateSettings({ lockOnMinimize: e.target.checked })}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="settings-item">
                <div className="settings-item-left">
                  <span className="settings-item-label">Lock on Sleep</span>
                  <span className="settings-item-desc">Lock when computer goes to sleep</span>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={settings.lockOnSleep}
                    onChange={(e) => onUpdateSettings({ lockOnSleep: e.target.checked })}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="settings-item">
                <div className="settings-item-left">
                  <span className="settings-item-label">Require Password on Start</span>
                  <span className="settings-item-desc">Ask for password when app opens</span>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={settings.requirePasswordOnStart}
                    onChange={(e) => onUpdateSettings({ requirePasswordOnStart: e.target.checked })}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>

            <div className="settings-group">
              <h4 className="settings-group-title">Privacy</h4>
              
              <div className="settings-item">
                <div className="settings-item-left">
                  <span className="settings-item-label">Anonymous Usage Data</span>
                  <span className="settings-item-desc">Help us improve the app</span>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={settings.sendAnonymousUsage}
                    onChange={(e) => onUpdateSettings({ sendAnonymousUsage: e.target.checked })}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>
        );

      case 'backups':
        return (
          <div className="settings-tab-content">
            <div className="settings-group">
              <h4 className="settings-group-title">Cloud Folders</h4>
              <p className="settings-group-desc">Sync using cloud folders installed on your computer</p>
              
              {detectedServices.length > 0 ? (
                <div className="cloud-services-grid">
                  {detectedServices.map(service => (
                    <button
                      key={service.name}
                      className={`cloud-service-card ${syncFolder.includes(service.path) ? 'active' : ''}`}
                      onClick={() => selectCloudService(service)}
                    >
                      <span className="cloud-service-icon">
                        {service.name === 'Google Drive' && '🌐'}
                        {service.name === 'OneDrive' && '☁️'}
                        {service.name === 'Dropbox' && '📦'}
                      </span>
                      <span className="cloud-service-name">{service.name}</span>
                      {syncFolder.includes(service.path) && <span className="cloud-check">✓</span>}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="settings-info-box">
                  <span>ℹ️</span>
                  <p>No desktop cloud app detected. Install OneDrive, Google Drive, or Dropbox.</p>
                </div>
              )}
            </div>

            <div className="settings-group">
              <h4 className="settings-group-title">Local Backup</h4>
              
              <div className="folder-selector">
                <div className="folder-path-display">
                  {syncFolder ? <span>{syncFolder}</span> : <span className="placeholder">No folder selected</span>}
                </div>
                <button className="btn-secondary-small" onClick={handleSelectSyncFolder}>Browse...</button>
              </div>

              {syncFolder && (
                <>
                  <div className="settings-item">
                    <div className="settings-item-left">
                      <span className="settings-item-label">Auto Backup</span>
                      <span className="settings-item-desc">Backup automatically at intervals</span>
                    </div>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={settings.autoBackup}
                        onChange={(e) => onUpdateSettings({ autoBackup: e.target.checked })}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  {settings.autoBackup && (
                    <div className="settings-item-vertical">
                      <span className="settings-item-label">Backup Frequency</span>
                      <select
                        className="settings-select"
                        value={settings.autoBackupInterval}
                        onChange={(e) => onUpdateSettings({ autoBackupInterval: parseInt(e.target.value) })}
                      >
                        <option value={60000}>1 minute</option>
                        <option value={300000}>5 minutes</option>
                        <option value={600000}>10 minutes</option>
                        <option value={1800000}>30 minutes</option>
                        <option value={3600000}>1 hour</option>
                      </select>
                    </div>
                  )}

                  <div className="settings-item-vertical">
                    <span className="settings-item-label">Backups to Keep</span>
                    <select
                      className="settings-select"
                      value={settings.keepBackupCount}
                      onChange={(e) => onUpdateSettings({ keepBackupCount: parseInt(e.target.value) })}
                    >
                      <option value={5}>Last 5 backups</option>
                      <option value={10}>Last 10 backups</option>
                      <option value={20}>Last 20 backups</option>
                      <option value={50}>Last 50 backups</option>
                      <option value={-1}>Keep all</option>
                    </select>
                  </div>

                  <div className="settings-item">
                    <div className="settings-item-left">
                      <span className="settings-item-label">Backup on Exit</span>
                      <span className="settings-item-desc">Create backup when closing app</span>
                    </div>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={settings.backupOnExit}
                        onChange={(e) => onUpdateSettings({ backupOnExit: e.target.checked })}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="backup-actions">
                    <button className="btn-primary" onClick={handleBackup} disabled={isSyncing}>
                      💾 Backup Now
                    </button>
                    <button className="btn-secondary" onClick={handleRestore} disabled={isSyncing}>
                      📥 Restore
                    </button>
                  </div>
                </>
              )}

              {syncMessage && (
                <div className={`sync-message ${syncMessage.startsWith('✓') ? 'success' : syncMessage.startsWith('Error') ? 'error' : ''}`}>
                  {syncMessage}
                </div>
              )}
            </div>
          </div>
        );

      case 'appearance':
        return (
          <div className="settings-tab-content">
            <div className="settings-group">
              <h4 className="settings-group-title">{t.theme}</h4>
              
              <div className="theme-cards">
                <button
                  className={`theme-card ${settings.theme === 'light' ? 'active' : ''}`}
                  onClick={() => onUpdateSettings({ theme: 'light' })}
                >
                  <div className="theme-preview light"></div>
                  <span>{t.themeLight}</span>
                </button>
                <button
                  className={`theme-card ${settings.theme === 'dark' ? 'active' : ''}`}
                  onClick={() => onUpdateSettings({ theme: 'dark' })}
                >
                  <div className="theme-preview dark"></div>
                  <span>{t.themeDark}</span>
                </button>
                <button
                  className={`theme-card ${settings.theme === 'system' ? 'active' : ''}`}
                  onClick={() => onUpdateSettings({ theme: 'system' })}
                >
                  <div className="theme-preview system"></div>
                  <span>{t.themeSystem}</span>
                </button>
              </div>
            </div>

            <div className="settings-group">
              <h4 className="settings-group-title">{t.accentColor}</h4>
              
              <div className="accent-colors">
                {(['purple', 'blue', 'green', 'orange', 'red', 'pink', 'yellow'] as const).map(color => (
                  <button
                    key={color}
                    className={`accent-color-btn ${settings.accentColor === color ? 'active' : ''}`}
                    data-color={color}
                    onClick={() => onUpdateSettings({ accentColor: color })}
                  />
                ))}
              </div>
            </div>

            <div className="settings-group">
              <h4 className="settings-group-title">{t.fontType}</h4>
              
              <div className="settings-item-vertical">
                <span className="settings-item-label">{t.fontSizeLabel}: {settings.fontSize}px</span>
                <input
                  type="range"
                  min="11"
                  max="20"
                  value={settings.fontSize}
                  onChange={(e) => onUpdateSettings({ fontSize: parseInt(e.target.value) })}
                  className="settings-range"
                />
              </div>

              <div className="settings-item-vertical">
                <span className="settings-item-label">{t.lineHeight}: {settings.lineHeight}</span>
                <input
                  type="range"
                  min="1.2"
                  max="2.0"
                  step="0.1"
                  value={settings.lineHeight}
                  onChange={(e) => onUpdateSettings({ lineHeight: parseFloat(e.target.value) })}
                  className="settings-range"
                />
              </div>

              <div className="settings-item-vertical">
                <span className="settings-item-label">{t.interfaceFont}</span>
                <select
                  className="settings-select"
                  value={settings.fontFamily}
                  onChange={(e) => onUpdateSettings({ fontFamily: e.target.value })}
                >
                  <option value="-apple-system, BlinkMacSystemFont, SF Pro Text, Segoe UI, Roboto, sans-serif">{t.systemFont}</option>
                  <option value="Inter, sans-serif">Inter</option>
                  <option value="Roboto, sans-serif">Roboto</option>
                  <option value="Open Sans, sans-serif">Open Sans</option>
                  <option value="Lato, sans-serif">Lato</option>
                </select>
              </div>

              <div className="settings-item-vertical">
                <span className="settings-item-label">{t.editorFont}</span>
                <select
                  className="settings-select"
                  value={settings.editorFontFamily}
                  onChange={(e) => onUpdateSettings({ editorFontFamily: e.target.value })}
                >
                  <option value="SF Mono, Consolas, Monaco, monospace">{t.systemMonospace}</option>
                  <option value="JetBrains Mono, monospace">JetBrains Mono</option>
                  <option value="Fira Code, monospace">Fira Code</option>
                  <option value="Source Code Pro, monospace">Source Code Pro</option>
                  <option value="Georgia, serif">Georgia (Serif)</option>
                </select>
              </div>
            </div>

            <div className="settings-group">
              <h4 className="settings-group-title">{t.interfaceSettings}</h4>
              
              <div className="settings-item">
                <div className="settings-item-left">
                  <span className="settings-item-label">{t.compactMode}</span>
                  <span className="settings-item-desc">{t.compactModeDesc}</span>
                </div>
                <label className="toggle">
                  <input 
                    type="checkbox" 
                    checked={settings.compactMode}
                    onChange={(e) => onUpdateSettings({ compactMode: e.target.checked })}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="settings-item">
                <div className="settings-item-left">
                  <span className="settings-item-label">{t.reduceAnimations}</span>
                  <span className="settings-item-desc">{t.reduceAnimationsDesc}</span>
                </div>
                <label className="toggle">
                  <input 
                    type="checkbox" 
                    checked={settings.reduceAnimations}
                    onChange={(e) => onUpdateSettings({ reduceAnimations: e.target.checked })}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>

            <div className="settings-group">
              <h4 className="settings-group-title">{t.noteList}</h4>
              
              <div className="settings-item">
                <div className="settings-item-left">
                  <span className="settings-item-label">{t.notePreview}</span>
                  <span className="settings-item-desc">{t.notePreviewDesc}</span>
                </div>
                <label className="toggle">
                  <input 
                    type="checkbox" 
                    checked={settings.showNotePreview}
                    onChange={(e) => onUpdateSettings({ showNotePreview: e.target.checked })}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="settings-item">
                <div className="settings-item-left">
                  <span className="settings-item-label">{t.showDate}</span>
                  <span className="settings-item-desc">{t.showDateDesc}</span>
                </div>
                <label className="toggle">
                  <input 
                    type="checkbox" 
                    checked={settings.showNoteDate}
                    onChange={(e) => onUpdateSettings({ showNoteDate: e.target.checked })}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="settings-item">
                <div className="settings-item-left">
                  <span className="settings-item-label">{t.wordCount}</span>
                  <span className="settings-item-desc">{t.wordCountDesc}</span>
                </div>
                <label className="toggle">
                  <input 
                    type="checkbox" 
                    checked={settings.showWordCount}
                    onChange={(e) => onUpdateSettings({ showWordCount: e.target.checked })}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="settings-item">
                <div className="settings-item-left">
                  <span className="settings-item-label">{t.charCount}</span>
                  <span className="settings-item-desc">{t.charCountDesc}</span>
                </div>
                <label className="toggle">
                  <input 
                    type="checkbox" 
                    checked={settings.showCharCount}
                    onChange={(e) => onUpdateSettings({ showCharCount: e.target.checked })}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>

            <div className="settings-group">
              <h4 className="settings-group-title">{t.panelSizes}</h4>
              
              <div className="settings-item-vertical">
                <span className="settings-item-label">{t.sidebarWidth}: {settings.sidebarWidth}px</span>
                <input
                  type="range"
                  min="180"
                  max="400"
                  value={settings.sidebarWidth}
                  onChange={(e) => onUpdateSettings({ sidebarWidth: parseInt(e.target.value) })}
                  className="settings-range"
                />
              </div>

              <div className="settings-item-vertical">
                <span className="settings-item-label">{t.noteList}: {settings.noteListWidth}px</span>
                <input
                  type="range"
                  min="200"
                  max="500"
                  value={settings.noteListWidth}
                  onChange={(e) => onUpdateSettings({ noteListWidth: parseInt(e.target.value) })}
                  className="settings-range"
                />
              </div>

              <div className="settings-item">
                <div className="settings-item-left">
                  <span className="settings-item-label">{t.showSidebar}</span>
                  <span className="settings-item-desc">{t.showSidebarDesc}</span>
                </div>
                <label className="toggle">
                  <input 
                    type="checkbox" 
                    checked={settings.showSidebar}
                    onChange={(e) => onUpdateSettings({ showSidebar: e.target.checked })}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="settings-item">
                <div className="settings-item-left">
                  <span className="settings-item-label">{t.showNoteList}</span>
                  <span className="settings-item-desc">{t.showNoteListDesc}</span>
                </div>
                <label className="toggle">
                  <input 
                    type="checkbox" 
                    checked={settings.showNoteList}
                    onChange={(e) => onUpdateSettings({ showNoteList: e.target.checked })}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>
        );

      case 'advanced':
        return (
          <div className="settings-tab-content">
            <div className="settings-group">
              <h4 className="settings-group-title">Developer Tools</h4>
              
              <div className="settings-item">
                <div className="settings-item-left">
                  <span className="settings-item-label">Enable DevTools</span>
                  <span className="settings-item-desc">Open developer tools with F12</span>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={settings.enableDevTools}
                    onChange={(e) => onUpdateSettings({ enableDevTools: e.target.checked })}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="settings-item">
                <div className="settings-item-left">
                  <span className="settings-item-label">Debug Mode</span>
                  <span className="settings-item-desc">Show detailed log output</span>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={settings.debugMode}
                    onChange={(e) => onUpdateSettings({ debugMode: e.target.checked })}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>

            <div className="settings-group">
              <h4 className="settings-group-title">Performance</h4>
              
              <div className="settings-item">
                <div className="settings-item-left">
                  <span className="settings-item-label">Clear Cache on Exit</span>
                  <span className="settings-item-desc">Clear cache when closing app</span>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={settings.clearCacheOnExit}
                    onChange={(e) => onUpdateSettings({ clearCacheOnExit: e.target.checked })}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="settings-item-vertical">
                <span className="settings-item-label">Max Recent Notes</span>
                <select
                  className="settings-select"
                  value={settings.maxRecentNotes}
                  onChange={(e) => onUpdateSettings({ maxRecentNotes: parseInt(e.target.value) })}
                >
                  <option value={10}>10 notes</option>
                  <option value={20}>20 notes</option>
                  <option value={50}>50 notes</option>
                  <option value={100}>100 notes</option>
                </select>
              </div>

              <div className="settings-item-vertical">
                <span className="settings-item-label">Max Search Results</span>
                <select
                  className="settings-select"
                  value={settings.maxSearchResults}
                  onChange={(e) => onUpdateSettings({ maxSearchResults: parseInt(e.target.value) })}
                >
                  <option value={25}>25 results</option>
                  <option value={50}>50 results</option>
                  <option value={100}>100 results</option>
                  <option value={200}>200 results</option>
                </select>
              </div>
            </div>

            <div className="settings-group">
              <h4 className="settings-group-title">Global Shortcuts</h4>
              
              <div className="settings-item">
                <div className="settings-item-left">
                  <span className="settings-item-label">Enable Global Shortcuts</span>
                  <span className="settings-item-desc">Works even when app is in background</span>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={settings.enableGlobalShortcuts}
                    onChange={(e) => onUpdateSettings({ enableGlobalShortcuts: e.target.checked })}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              {settings.enableGlobalShortcuts && (
                <>
                  <div className="settings-item-vertical">
                    <span className="settings-item-label">Quick Note Shortcut</span>
                    <input
                      type="text"
                      className="settings-input shortcut-input"
                      value={settings.quickNoteShortcut}
                      onChange={(e) => onUpdateSettings({ quickNoteShortcut: e.target.value })}
                      placeholder="Ctrl+Shift+N"
                    />
                  </div>

                  <div className="settings-item-vertical">
                    <span className="settings-item-label">Global Search Shortcut</span>
                    <input
                      type="text"
                      className="settings-input shortcut-input"
                      value={settings.searchShortcut}
                      onChange={(e) => onUpdateSettings({ searchShortcut: e.target.value })}
                      placeholder="Ctrl+Shift+F"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="settings-group danger-zone">
              <h4 className="settings-group-title">Danger Zone</h4>
              
              <div className="settings-item">
                <div className="settings-item-left">
                  <span className="settings-item-label">Reset All Settings</span>
                  <span className="settings-item-desc">Reset settings to factory defaults</span>
                </div>
                <button className="btn-danger-small">Reset</button>
              </div>

              <div className="settings-item">
                <div className="settings-item-left">
                  <span className="settings-item-label">Delete All Data</span>
                  <span className="settings-item-desc">Delete everything including notes, tags and folders</span>
                </div>
                <button className="btn-danger-small">Delete</button>
              </div>
            </div>
          </div>
        );

      case 'about':
        return (
          <div className="settings-tab-content">
            <div className="about-content">
              <div className="about-logo">📝</div>
              <h2>KOLP NOTES</h2>
              <p className="about-version">Version 1.0.0</p>
              <p className="about-tagline">Secure, fast, elegant note-taking app</p>
              
              <div className="about-features">
                <div className="about-feature">
                  <span className="about-feature-icon">🔒</span>
                  <span>End-to-end encryption</span>
                </div>
                <div className="about-feature">
                  <span className="about-feature-icon">☁️</span>
                  <span>Cloud sync</span>
                </div>
                <div className="about-feature">
                  <span className="about-feature-icon">⚡</span>
                  <span>Fast and lightweight</span>
                </div>
                <div className="about-feature">
                  <span className="about-feature-icon">🎨</span>
                  <span>Modern interface</span>
                </div>
              </div>

              <div className="about-links">
                <button className="about-link">📖 Documentation</button>
                <button className="about-link">🐛 Report Bug</button>
                <button className="about-link">⭐ GitHub</button>
              </div>

              <p className="about-copyright">© 2025 KOLP NOTES</p>
              <p className="about-credits">Made with ❤️ using Electron + React + TypeScript</p>
              <p className="about-opensource">🔓 Open Source</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal settings-modal-new" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>{t.settings}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="settings-body">
          <div className="settings-sidebar">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="settings-tab-icon">{tab.icon}</span>
                <span className="settings-tab-label">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="settings-content">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
