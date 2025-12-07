import React from 'react';
import '../styles/TitleBar.css';

const TitleBar: React.FC = () => {
  const handleMinimize = () => {
    window.electronAPI?.windowMinimize();
  };

  const handleMaximize = () => {
    window.electronAPI?.windowMaximize();
  };

  const handleClose = () => {
    window.electronAPI?.windowClose();
  };

  return (
    <div className="titlebar">
      <div className="titlebar-drag-region">
        <span className="titlebar-title">Kolp Notes - 2025</span>
      </div>
      <div className="titlebar-controls">
        <button className="titlebar-btn minimize" onClick={handleMinimize} title="Minimize">
          <svg viewBox="0 0 12 12">
            <rect x="1" y="5.5" width="10" height="1" fill="currentColor"/>
          </svg>
        </button>
        <button className="titlebar-btn maximize" onClick={handleMaximize} title="Maximize">
          <svg viewBox="0 0 12 12">
            <rect x="1.5" y="1.5" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="1"/>
          </svg>
        </button>
        <button className="titlebar-btn close" onClick={handleClose} title="Close">
          <svg viewBox="0 0 12 12">
            <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.2" fill="none"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
