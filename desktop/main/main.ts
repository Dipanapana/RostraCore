/**
 * RostraCore Desktop - Main Process
 *
 * Electron main process entry point.
 * Wraps Next.js static export for desktop deployment.
 */

import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import * as path from 'path';
import { setupAutoUpdater } from './auto-updater';
import Store from 'electron-store';

// Initialize electron-store for local data persistence
const store = new Store();

// Keep a global reference to prevent garbage collection
let mainWindow: BrowserWindow | null = null;

// Development mode check
const isDevelopment = !app.isPackaged;

/**
 * Create the main application window
 */
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    icon: path.join(__dirname, '../build/icon.png'),
    title: 'RostraCore - HR & Risk Management',
    backgroundColor: '#ffffff',
    show: false, // Show only when ready-to-show
  });

  // Load the application
  if (isDevelopment) {
    // Development: Load from Next.js dev server
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    // Production: Load from static export
    const indexPath = path.join(__dirname, '../renderer/index.html');
    mainWindow.loadFile(indexPath);
  }

  // Show window when ready (prevents flash of white)
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Setup application menu
  setupMenu();
}

/**
 * Setup application menu
 */
function setupMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About RostraCore',
          click: () => {
            // Show about dialog
            const version = app.getVersion();
            const { dialog } = require('electron');
            dialog.showMessageBox({
              title: 'About RostraCore',
              message: `RostraCore Desktop v${version}`,
              detail: 'Multi-type HR, Risk & Asset Management Platform\nfor South African Organizations',
              buttons: ['OK']
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * App lifecycle: Ready
 */
app.whenReady().then(() => {
  createWindow();

  // Setup auto-updater (production only)
  if (!isDevelopment) {
    setupAutoUpdater(mainWindow);
  }

  // macOS: Re-create window when dock icon clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

/**
 * App lifecycle: All windows closed
 */
app.on('window-all-closed', () => {
  // On macOS, keep app active until explicit quit
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/**
 * IPC Handlers for renderer process communication
 */

// Get stored data from electron-store
ipcMain.handle('get-stored-data', async (event, key: string) => {
  return store.get(key);
});

// Set stored data to electron-store
ipcMain.handle('set-stored-data', async (event, key: string, value: any) => {
  store.set(key, value);
  return true;
});

// Delete stored data
ipcMain.handle('delete-stored-data', async (event, key: string) => {
  store.delete(key);
  return true;
});

// Clear all stored data
ipcMain.handle('clear-stored-data', async () => {
  store.clear();
  return true;
});

// Get app version
ipcMain.handle('get-app-version', async () => {
  return app.getVersion();
});

// Check if running in development mode
ipcMain.handle('is-development', async () => {
  return isDevelopment;
});
