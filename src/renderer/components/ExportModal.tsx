import React, { useState } from 'react';
import * as db from '../utils/database';
import '../styles/Modal.css';

interface ExportModalProps {
  onClose: () => void;
}

const ExportModal: React.FC<ExportModalProps> = ({ onClose }) => {
  const [exportFormat, setExportFormat] = useState<'json' | 'txt' | 'md'>('json');
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);

    try {
      const data = await db.exportAllData();
      
      let content: string;
      let filename: string;
      let filters: { name: string; extensions: string[] }[];

      if (exportFormat === 'json') {
        // Filter out deleted notes if not included
        const exportData = {
          version: '1.0.0',
          exportedAt: new Date().toISOString(),
          notes: includeDeleted ? data.notes : data.notes.filter(n => !n.isDeleted),
          tags: data.tags,
          folders: data.folders,
        };
        content = JSON.stringify(exportData, null, 2);
        filename = `secure-notes-backup-${new Date().toISOString().split('T')[0]}.json`;
        filters = [{ name: 'JSON Files', extensions: ['json'] }];
      } else if (exportFormat === 'md') {
        // Export as Markdown
        const notes = includeDeleted ? data.notes : data.notes.filter(n => !n.isDeleted);
        content = notes.map(note => {
          const tags = data.tags.filter(t => note.tagIds.includes(t.id)).map(t => t.name);
          return `# ${note.title}\n\n` +
            `> Created: ${new Date(note.createdAt).toLocaleString('en-US')}\n` +
            `> Last Modified: ${new Date(note.updatedAt).toLocaleString('en-US')}\n` +
            (tags.length > 0 ? `> Tags: ${tags.join(', ')}\n` : '') +
            `\n${note.content}\n\n---\n\n`;
        }).join('');
        filename = `secure-notes-export-${new Date().toISOString().split('T')[0]}.md`;
        filters = [{ name: 'Markdown Files', extensions: ['md'] }];
      } else {
        // Export as plain text
        const notes = includeDeleted ? data.notes : data.notes.filter(n => !n.isDeleted);
        content = notes.map(note => {
          return `=== ${note.title} ===\n` +
            `Created: ${new Date(note.createdAt).toLocaleString('en-US')}\n` +
            `Last Modified: ${new Date(note.updatedAt).toLocaleString('en-US')}\n\n` +
            `${note.content.replace(/<[^>]*>/g, '')}\n\n` +
            `${'='.repeat(50)}\n\n`;
        }).join('');
        filename = `secure-notes-export-${new Date().toISOString().split('T')[0]}.txt`;
        filters = [{ name: 'Text Files', extensions: ['txt'] }];
      }

      if (window.electronAPI) {
        const result = await window.electronAPI.showSaveDialog({
          defaultPath: filename,
          filters,
        });

        if (!result.canceled && result.filePath) {
          const saveResult = await window.electronAPI.saveFile(result.filePath, content);
          
          if (saveResult.success) {
            await window.electronAPI.showMessageBox({
              type: 'info',
              title: 'Export Complete',
              message: `Your notes have been exported successfully:\n${result.filePath}`,
            });
            onClose();
          } else {
            await window.electronAPI.showMessageBox({
              type: 'error',
              title: 'Export Error',
              message: `Failed to save file: ${saveResult.error}`,
            });
          }
        }
      } else {
        // Fallback for browser
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        onClose();
      }
    } catch (error) {
      console.error('Export failed:', error);
      if (window.electronAPI) {
        await window.electronAPI.showMessageBox({
          type: 'error',
          title: 'Export Error',
          message: 'An error occurred during export.',
        });
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal export-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Export Notes</h2>
          <button className="close-btn" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="modal-content">
          <div className="setting-item">
            <label>Export Format</label>
            <div className="format-selector">
              <button
                className={`format-option ${exportFormat === 'json' ? 'active' : ''}`}
                onClick={() => setExportFormat('json')}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <path d="M14 2v6h6M12 18v-6M9 15h6"/>
                </svg>
                <span>JSON</span>
                <small>Full backup</small>
              </button>
              <button
                className={`format-option ${exportFormat === 'md' ? 'active' : ''}`}
                onClick={() => setExportFormat('md')}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <path d="M14 2v6h6"/>
                </svg>
                <span>Markdown</span>
                <small>Readable format</small>
              </button>
              <button
                className={`format-option ${exportFormat === 'txt' ? 'active' : ''}`}
                onClick={() => setExportFormat('txt')}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
                </svg>
                <span>Plain Text</span>
                <small>Simple format</small>
              </button>
            </div>
          </div>

          <div className="setting-item toggle">
            <div className="setting-info">
              <label>Include Deleted Notes</label>
              <span className="setting-description">Also export notes in trash</span>
            </div>
            <button
              className={`toggle-switch ${includeDeleted ? 'active' : ''}`}
              onClick={() => setIncludeDeleted(!includeDeleted)}
            >
              <span className="toggle-knob"></span>
            </button>
          </div>

          {exportFormat === 'json' && (
            <div className="info-message">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 16v-4M12 8h.01"/>
              </svg>
              <span>JSON format includes all data and can be imported later.</span>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <span className="spinner"></span>
                Exporting...
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                </svg>
                Export
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
