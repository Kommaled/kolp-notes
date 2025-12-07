# Kolp Notes

A secure, end-to-end encrypted note-taking application built with Electron and React.

![Kolp Notes](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## Features

### Security
- **End-to-End Encryption**: Strong AES-256 encryption
- **PBKDF2 Key Derivation**: 100,000 iterations for secure password processing
- **Local Storage**: Your data stays on your device
- **Custom .klp Format**: Encrypted binary format for backups

### Note Taking
- **Rich Text Editor**: WYSIWYG editing with formatting
- **Markdown Support**: Write in Markdown
- **Auto-Save**: Changes are saved automatically
- **Word & Character Counter**: Writing statistics

### Organization
- **Tags**: Colorful tags to categorize notes
- **Folders**: Hierarchical folder structure
- **Pinning**: Pin important notes to top
- **Archive**: Archive old notes
- **Trash**: Recover deleted notes
- **Search**: Quick search through notes

### Interface
- **Dark/Light Theme**: Eye-friendly themes
- **Customizable Fonts**: Size and font selection
- **Modern Design**: Clean and user-friendly UI

### Cloud & Backup
- **Google Drive Sync**: Automatic cloud backup
- **OneDrive/Dropbox**: Sync folder support
- **Import/Export**: JSON, Markdown, Plain Text, HTML formats

## Installation

### Requirements
- Node.js 18 or higher
- npm

### Steps

1. **Clone the repository:**
```
git clone https://github.com/yourusername/kolp-notes.git
cd kolp-notes
```

2. **Install dependencies:**
```
npm install
```

3. **Run:**
```
npm start
```

### Building for Distribution

```
# Windows
npm run dist:win

# macOS
npm run dist:mac

# Linux
npm run dist:linux
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+N | New note |
| Ctrl+S | Save note |
| Ctrl+T | Toggle theme |
| Ctrl+F | Search |
| F11 | Fullscreen |

## Tech Stack

- **Electron** - Desktop app framework
- **React 18** - UI library
- **TypeScript** - Type safety
- **Webpack** - Module bundler
- **IndexedDB** - Local database
- **Web Crypto API** - Encryption

## License

MIT License

---

**Kolp Notes - 2025**
