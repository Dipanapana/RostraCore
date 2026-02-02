/**
 * RostraCore Desktop - Auto-Updater
 *
 * Handles automatic application updates using electron-updater.
 */

import { autoUpdater } from 'electron-updater';
import { BrowserWindow, dialog } from 'electron';

/**
 * Setup auto-updater for the application
 */
export function setupAutoUpdater(mainWindow: BrowserWindow | null): void {
  // Configure auto-updater
  autoUpdater.autoDownload = false; // Ask user before downloading
  autoUpdater.autoInstallOnAppQuit = true;

  // Check for updates on startup (after 10 seconds)
  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify();
  }, 10000);

  // Check for updates every hour
  setInterval(() => {
    autoUpdater.checkForUpdatesAndNotify();
  }, 60 * 60 * 1000);

  /**
   * Update available - Ask user if they want to download
   */
  autoUpdater.on('update-available', (info) => {
    const version = info.version;

    dialog.showMessageBox({
      type: 'info',
      title: 'Update Available',
      message: `A new version of RostraCore is available (v${version})`,
      detail: 'Would you like to download it now? The update will be installed when you restart the application.',
      buttons: ['Download', 'Not Now'],
      defaultId: 0,
      cancelId: 1,
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.downloadUpdate();

        // Show download progress notification
        dialog.showMessageBox({
          type: 'info',
          title: 'Downloading Update',
          message: 'Update is being downloaded in the background.',
          detail: 'You will be notified when the download is complete.',
          buttons: ['OK']
        });
      }
    });
  });

  /**
   * Update downloaded - Ask user if they want to restart now
   */
  autoUpdater.on('update-downloaded', (info) => {
    const version = info.version;

    dialog.showMessageBox({
      type: 'info',
      title: 'Update Ready',
      message: `RostraCore v${version} has been downloaded and is ready to install.`,
      detail: 'Would you like to restart the application now to apply the update?',
      buttons: ['Restart Now', 'Later'],
      defaultId: 0,
      cancelId: 1,
    }).then((result) => {
      if (result.response === 0) {
        // User chose to restart - install update
        autoUpdater.quitAndInstall(false, true);
      }
    });
  });

  /**
   * No update available
   */
  autoUpdater.on('update-not-available', () => {
    console.log('No updates available');
  });

  /**
   * Error checking for updates
   */
  autoUpdater.on('error', (err) => {
    console.error('Auto-updater error:', err);
    // Don't show error dialog to user - fail silently
  });

  /**
   * Download progress
   */
  autoUpdater.on('download-progress', (progress) => {
    const percent = Math.round(progress.percent);
    console.log(`Download progress: ${percent}%`);

    // Update window title with progress (optional)
    if (mainWindow) {
      mainWindow.setTitle(`RostraCore - Downloading update ${percent}%`);
    }
  });
}
