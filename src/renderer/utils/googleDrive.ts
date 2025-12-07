// Google Drive Backup Utility
// Simple local backup to a file (for now)
// Full Google Drive OAuth integration would require a registered app

import { Note, Folder, Tag, Settings } from '../types';

interface BackupData {
  timestamp: string;
  version: string;
  notes: Note[];
  folders: Folder[];
  tags: Tag[];
  settings: Partial<Settings>;
}

class LocalBackupManager {
  private backupKey = 'notesOfMine_backup';
  private lastBackupKey = 'notesOfMine_lastBackup';

  async createBackup(
    notes: Note[],
    folders: Folder[],
    tags: Tag[],
    settings: Settings
  ): Promise<void> {
    const backupData: BackupData = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      notes,
      folders,
      tags,
      settings: {
        theme: settings.theme,
        fontSize: settings.fontSize,
        fontFamily: settings.fontFamily,
        autoSave: settings.autoSave,
        autoSaveInterval: settings.autoSaveInterval,
        sortBy: settings.sortBy,
        sortOrder: settings.sortOrder,
      },
    };

    // Save to localStorage as backup
    try {
      localStorage.setItem(this.backupKey, JSON.stringify(backupData));
      localStorage.setItem(this.lastBackupKey, backupData.timestamp);
      console.log('Backup created:', backupData.timestamp);
    } catch (error) {
      console.error('Backup failed:', error);
    }
  }

  getLastBackupTime(): string | null {
    return localStorage.getItem(this.lastBackupKey);
  }

  async restoreBackup(): Promise<BackupData | null> {
    try {
      const backupStr = localStorage.getItem(this.backupKey);
      if (!backupStr) return null;
      return JSON.parse(backupStr) as BackupData;
    } catch (error) {
      console.error('Restore failed:', error);
      return null;
    }
  }

  async exportToFile(): Promise<void> {
    const backupStr = localStorage.getItem(this.backupKey);
    if (!backupStr) {
      console.log('No backup found to export');
      return;
    }

    const blob = new Blob([backupStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notesofmine_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async importFromFile(file: File): Promise<BackupData | null> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result as string) as BackupData;
          resolve(data);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }
}

export const backupManager = new LocalBackupManager();
export type { BackupData };
