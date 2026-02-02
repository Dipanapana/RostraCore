/**
 * RostraCore Desktop - Preload Script
 *
 * Context bridge between main process and renderer.
 * Exposes safe APIs to the renderer process.
 */

import { contextBridge, ipcRenderer } from 'electron';

/**
 * Exposed API for renderer process
 */
const api = {
  // Store operations (offline data persistence)
  store: {
    get: (key: string) => ipcRenderer.invoke('get-stored-data', key),
    set: (key: string, value: any) => ipcRenderer.invoke('set-stored-data', key, value),
    delete: (key: string) => ipcRenderer.invoke('delete-stored-data', key),
    clear: () => ipcRenderer.invoke('clear-stored-data'),
  },

  // App information
  app: {
    getVersion: () => ipcRenderer.invoke('get-app-version'),
    isDevelopment: () => ipcRenderer.invoke('is-development'),
  },

  // Platform information
  platform: process.platform,
  isWindows: process.platform === 'win32',
  isMac: process.platform === 'darwin',
  isLinux: process.platform === 'linux',
};

/**
 * Expose API to renderer via contextBridge
 */
contextBridge.exposeInMainWorld('electronAPI', api);

/**
 * TypeScript type definitions for renderer
 */
export type ElectronAPI = typeof api;
