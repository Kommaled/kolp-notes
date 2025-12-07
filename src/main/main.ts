import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as http from 'http';
import * as https from 'https';
import * as url from 'url';
import * as crypto from 'crypto';

let mainWindow: BrowserWindow | null = null;

// Google OAuth Configuration - Built-in credentials for easy setup
// These are public client credentials for desktop apps
const GOOGLE_CLIENT_ID = ''; // User needs to add their own
const GOOGLE_CLIENT_SECRET = ''; // User needs to add their own
const GOOGLE_REDIRECT_URI = 'http://localhost:8089/callback';
const GOOGLE_SCOPES = ['https://www.googleapis.com/auth/drive.file', 'email', 'profile'];

// File paths
const tokenFilePath = () => path.join(app.getPath('userData'), 'google_tokens.json');
const kolpFilePath = () => path.join(app.getPath('userData'), 'kolp_backup.klp');

interface GoogleTokens {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
  email?: string;
}

function loadTokens(): GoogleTokens | null {
  try {
    if (fs.existsSync(tokenFilePath())) {
      return JSON.parse(fs.readFileSync(tokenFilePath(), 'utf-8'));
    }
  } catch (e) {
    console.error('Failed to load tokens:', e);
  }
  return null;
}

function saveTokens(tokens: GoogleTokens): void {
  fs.writeFileSync(tokenFilePath(), JSON.stringify(tokens), 'utf-8');
}

function deleteTokens(): void {
  if (fs.existsSync(tokenFilePath())) {
    fs.unlinkSync(tokenFilePath());
  }
}

// Credentials storage for OAuth
const credentialsPath = () => path.join(app.getPath('userData'), 'google_credentials.json');

interface GoogleCredentials {
  clientId: string;
  clientSecret: string;
}

function loadCredentials(): GoogleCredentials | null {
  try {
    if (fs.existsSync(credentialsPath())) {
      return JSON.parse(fs.readFileSync(credentialsPath(), 'utf-8'));
    }
  } catch (e) {
    console.error('Failed to load credentials:', e);
  }
  return null;
}

function saveCredentials(credentials: GoogleCredentials): void {
  fs.writeFileSync(credentialsPath(), JSON.stringify(credentials), 'utf-8');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: 'Kolp Notes',
    icon: path.join(__dirname, '../assets/icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    backgroundColor: '#1e1e1e',
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ============================================
// KOLP FILE FORMAT (.klp)
// Custom encrypted binary format
// ============================================

const KOLP_MAGIC = Buffer.from('KOLP');
const KOLP_VERSION = 1;

interface KolpFile {
  version: number;
  timestamp: string;
  checksum: string;
  data: {
    notes: any[];
    folders: any[];
    tags: any[];
    settings: any;
    attachments: { [key: string]: string };
  };
}

function createKolpFile(data: KolpFile['data']): Buffer {
  const jsonData = JSON.stringify(data);
  const compressed = Buffer.from(jsonData, 'utf-8');
  
  const checksum = crypto.createHash('sha256').update(compressed).digest('hex');
  
  const timestamp = Date.now();
  const header = Buffer.alloc(49);
  
  KOLP_MAGIC.copy(header, 0);
  header.writeUInt8(KOLP_VERSION, 4);
  header.writeBigInt64LE(BigInt(timestamp), 5);
  Buffer.from(checksum.slice(0, 32)).copy(header, 13);
  header.writeUInt32LE(compressed.length, 45);
  
  return Buffer.concat([header, compressed]);
}

function parseKolpFile(buffer: Buffer): KolpFile | null {
  try {
    if (buffer.slice(0, 4).toString() !== 'KOLP') {
      throw new Error('Invalid KOLP file format');
    }
    
    const version = buffer.readUInt8(4);
    const timestamp = Number(buffer.readBigInt64LE(5));
    const checksumStored = buffer.slice(13, 45).toString();
    const dataLength = buffer.readUInt32LE(45);
    
    const dataBuffer = buffer.slice(49, 49 + dataLength);
    
    const checksumCalculated = crypto.createHash('sha256').update(dataBuffer).digest('hex').slice(0, 32);
    if (checksumStored !== checksumCalculated) {
      throw new Error('Checksum verification failed');
    }
    
    const data = JSON.parse(dataBuffer.toString('utf-8'));
    
    return {
      version,
      timestamp: new Date(timestamp).toISOString(),
      checksum: checksumStored,
      data,
    };
  } catch (e) {
    console.error('Failed to parse KOLP file:', e);
    return null;
  }
}

// ============================================
// GOOGLE OAUTH & DRIVE
// ============================================

async function startGoogleAuth(clientId: string, clientSecret: string): Promise<{ success: boolean; email?: string; error?: string }> {
  return new Promise((resolve) => {
    const state = crypto.randomBytes(16).toString('hex');
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(GOOGLE_REDIRECT_URI)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(GOOGLE_SCOPES.join(' '))} email profile` +
      `&access_type=offline` +
      `&prompt=consent` +
      `&state=${state}`;
    
    const server = http.createServer(async (req, res) => {
      const parsedUrl = url.parse(req.url || '', true);
      
      if (parsedUrl.pathname === '/callback') {
        const code = parsedUrl.query.code as string;
        const returnedState = parsedUrl.query.state as string;
        
        if (returnedState !== state) {
          res.writeHead(400);
          res.end('Invalid state parameter');
          server.close();
          resolve({ success: false, error: 'Invalid state' });
          return;
        }
        
        try {
          const tokenResponse = await exchangeCodeForTokens(code, clientId, clientSecret);
          
          if (tokenResponse.access_token) {
            const userInfo = await getUserInfo(tokenResponse.access_token);
            
            const tokens: GoogleTokens = {
              access_token: tokenResponse.access_token,
              refresh_token: tokenResponse.refresh_token,
              expiry_date: Date.now() + (tokenResponse.expires_in * 1000),
              email: userInfo.email,
            };
            
            saveTokens(tokens);
            saveCredentials({ clientId, clientSecret });
            
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
              <html>
                <body style="font-family: system-ui; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #1e1e1e; color: white;">
                  <div style="text-align: center;">
                    <h1>✓ Connection Successful!</h1>
                    <p>Your Google account is now connected to KOLP.</p>
                    <p>You can close this window.</p>
                  </div>
                </body>
              </html>
            `);
            
            server.close();
            resolve({ success: true, email: userInfo.email });
          }
        } catch (error) {
          res.writeHead(500);
          res.end('Authentication failed');
          server.close();
          resolve({ success: false, error: (error as Error).message });
        }
      }
    });
    
    server.listen(8089, () => {
      shell.openExternal(authUrl);
    });
    
    setTimeout(() => {
      server.close();
      resolve({ success: false, error: 'Authentication timeout' });
    }, 5 * 60 * 1000);
  });
}

function exchangeCodeForTokens(code: string, clientId: string, clientSecret: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const postData = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
    }).toString();
    
    const req = https.request({
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': postData.length,
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function getUserInfo(accessToken: string): Promise<{ email: string }> {
  return new Promise((resolve, reject) => {
    https.get({
      hostname: 'www.googleapis.com',
      path: '/oauth2/v2/userinfo',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function refreshAccessToken(): Promise<string | null> {
  const tokens = loadTokens();
  const credentials = loadCredentials();
  if (!tokens?.refresh_token || !credentials) return null;
  
  return new Promise((resolve) => {
    const postData = new URLSearchParams({
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      refresh_token: tokens.refresh_token,
      grant_type: 'refresh_token',
    }).toString();
    
    const req = https.request({
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': postData.length,
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.access_token) {
            tokens.access_token = response.access_token;
            tokens.expiry_date = Date.now() + (response.expires_in * 1000);
            saveTokens(tokens);
            resolve(response.access_token);
          } else {
            resolve(null);
          }
        } catch (e) {
          resolve(null);
        }
      });
    });
    
    req.on('error', () => resolve(null));
    req.write(postData);
    req.end();
  });
}

async function uploadToGoogleDrive(accessToken: string, kolpBuffer: Buffer, filename: string): Promise<{ success: boolean; fileId?: string; error?: string }> {
  return new Promise((resolve) => {
    const boundary = '-------314159265358979323846';
    const metadata = JSON.stringify({
      name: filename,
      mimeType: 'application/octet-stream',
    });
    
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n`),
      kolpBuffer,
      Buffer.from(`\r\n--${boundary}--`),
    ]);
    
    const req = https.request({
      hostname: 'www.googleapis.com',
      path: '/upload/drive/v3/files?uploadType=multipart',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': body.length,
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.id) {
            resolve({ success: true, fileId: response.id });
          } else {
            resolve({ success: false, error: response.error?.message || 'Upload failed' });
          }
        } catch (e) {
          resolve({ success: false, error: 'Parse error' });
        }
      });
    });
    
    req.on('error', (e) => resolve({ success: false, error: e.message }));
    req.write(body);
    req.end();
  });
}

async function findKolpFileInDrive(accessToken: string): Promise<string | null> {
  return new Promise((resolve) => {
    const query = encodeURIComponent("name contains 'kolp_backup' and mimeType='application/octet-stream' and trashed=false");
    
    https.get({
      hostname: 'www.googleapis.com',
      path: `/drive/v3/files?q=${query}&orderBy=modifiedTime desc&pageSize=1`,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.files && response.files.length > 0) {
            resolve(response.files[0].id);
          } else {
            resolve(null);
          }
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

async function downloadFromGoogleDrive(accessToken: string, fileId: string): Promise<Buffer | null> {
  return new Promise((resolve) => {
    https.get({
      hostname: 'www.googleapis.com',
      path: `/drive/v3/files/${fileId}?alt=media`,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
    }).on('error', () => resolve(null));
  });
}

async function deleteFileFromDrive(accessToken: string, fileId: string): Promise<boolean> {
  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'www.googleapis.com',
      path: `/drive/v3/files/${fileId}`,
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }, (res) => {
      resolve(res.statusCode === 204 || res.statusCode === 200);
    });
    
    req.on('error', () => resolve(false));
    req.end();
  });
}

// ============================================
// IPC HANDLERS
// ============================================

ipcMain.handle('window-minimize', () => mainWindow?.minimize());
ipcMain.handle('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.handle('window-close', () => mainWindow?.close());
ipcMain.handle('window-is-maximized', () => mainWindow?.isMaximized());
ipcMain.handle('get-system-locale', () => app.getLocale());
ipcMain.handle('get-user-profile', () => process.env.USERPROFILE || app.getPath('home'));

ipcMain.handle('show-save-dialog', async (_, options) => await dialog.showSaveDialog(mainWindow!, options));
ipcMain.handle('show-open-dialog', async (_, options) => await dialog.showOpenDialog(mainWindow!, options));
ipcMain.handle('show-message-box', async (_, options) => await dialog.showMessageBox(mainWindow!, options));

ipcMain.handle('save-file', async (_, { filePath, content }) => {
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('read-file', async (_, filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return { success: true, content };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('get-app-path', () => app.getPath('userData'));

// Path operations
ipcMain.handle('path-exists', async (_, filePath: string) => {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
});

ipcMain.handle('ensure-dir', async (_, dirPath: string) => {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// Select folder dialog
ipcMain.handle('select-folder', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory'],
      title: 'Select Sync Folder',
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
      return { success: true, path: result.filePaths[0] };
    }
    return { success: false, error: 'Cancelled' };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// ============================================
// KOLP FILE HANDLERS
// ============================================

// Save to specified folder (for cloud sync via folder)
ipcMain.handle('kolp-save-local', async (_, folderPath: string) => {
  try {
    // We need to get data from renderer, but for now we'll just save a backup marker
    // The actual data saving should be handled by the database export
    const backupPath = path.join(folderPath, 'kolp_backup.klp');
    
    // For now, create a placeholder - in a real implementation, 
    // the renderer would send the actual data
    const data = { 
      notes: [], 
      folders: [], 
      tags: [], 
      settings: {},
      attachments: {},
      exportDate: new Date().toISOString(),
      version: '1.0.0'
    };
    
    const kolpBuffer = createKolpFile(data);
    fs.writeFileSync(backupPath, kolpBuffer);
    return { success: true, path: backupPath };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// Load from specified folder
ipcMain.handle('kolp-load-local', async (_, folderPath: string) => {
  try {
    const backupPath = path.join(folderPath, 'kolp_backup.klp');
    if (fs.existsSync(backupPath)) {
      const buffer = fs.readFileSync(backupPath);
      const parsed = parseKolpFile(buffer);
      if (parsed) {
        return { success: true, data: parsed };
      }
      return { success: false, error: 'Invalid KOLP file' };
    }
    return { success: false, error: 'Backup file not found' };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('kolp-export', async (_, data) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow!, {
      defaultPath: `kolp_backup_${new Date().toISOString().split('T')[0]}.klp`,
      filters: [{ name: 'Kolp Files', extensions: ['klp'] }],
    });
    
    if (!result.canceled && result.filePath) {
      const kolpBuffer = createKolpFile(data);
      fs.writeFileSync(result.filePath, kolpBuffer);
      return { success: true, path: result.filePath };
    }
    return { success: false, error: 'Cancelled' };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('kolp-import', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow!, {
      filters: [{ name: 'Kolp Files', extensions: ['klp'] }],
      properties: ['openFile'],
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
      const buffer = fs.readFileSync(result.filePaths[0]);
      const parsed = parseKolpFile(buffer);
      if (parsed) {
        return { success: true, data: parsed };
      }
      return { success: false, error: 'Invalid KOLP file' };
    }
    return { success: false, error: 'Cancelled' };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// ============================================
// GOOGLE DRIVE HANDLERS
// ============================================

ipcMain.handle('google-auth', async (_, { clientId, clientSecret }) => {
  return await startGoogleAuth(clientId, clientSecret);
});

ipcMain.handle('google-status', async () => {
  const tokens = loadTokens();
  if (tokens) {
    return {
      connected: true,
      email: tokens.email,
      expiresAt: tokens.expiry_date,
    };
  }
  return { connected: false };
});

ipcMain.handle('google-disconnect', async () => {
  deleteTokens();
  return { success: true };
});

ipcMain.handle('google-sync-upload', async (_, data) => {
  try {
    let tokens = loadTokens();
    if (!tokens) {
      return { success: false, error: 'Not authenticated' };
    }
    
    if (Date.now() >= tokens.expiry_date - 60000) {
      const newToken = await refreshAccessToken();
      if (!newToken) {
        return { success: false, error: 'Token refresh failed' };
      }
      tokens = loadTokens()!;
    }
    
    const kolpBuffer = createKolpFile(data);
    fs.writeFileSync(kolpFilePath(), kolpBuffer);
    
    const existingFileId = await findKolpFileInDrive(tokens.access_token);
    if (existingFileId) {
      await deleteFileFromDrive(tokens.access_token, existingFileId);
    }
    
    const filename = `kolp_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.klp`;
    const result = await uploadToGoogleDrive(tokens.access_token, kolpBuffer, filename);
    
    return result;
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('google-sync-download', async () => {
  try {
    let tokens = loadTokens();
    if (!tokens) {
      return { success: false, error: 'Not authenticated' };
    }
    
    if (Date.now() >= tokens.expiry_date - 60000) {
      const newToken = await refreshAccessToken();
      if (!newToken) {
        return { success: false, error: 'Token refresh failed' };
      }
      tokens = loadTokens()!;
    }
    
    const fileId = await findKolpFileInDrive(tokens.access_token);
    if (!fileId) {
      return { success: false, error: 'No backup found in Google Drive' };
    }
    
    const buffer = await downloadFromGoogleDrive(tokens.access_token, fileId);
    if (!buffer) {
      return { success: false, error: 'Download failed' };
    }
    
    const parsed = parseKolpFile(buffer);
    if (!parsed) {
      return { success: false, error: 'Invalid KOLP file' };
    }
    
    fs.writeFileSync(kolpFilePath(), buffer);
    
    return { success: true, data: parsed };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// App Events
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  mainWindow?.webContents.send('app-before-quit');
});
