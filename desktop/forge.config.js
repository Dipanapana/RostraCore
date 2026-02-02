/**
 * Electron Forge Configuration
 *
 * Configuration for building and packaging RostraCore Desktop.
 * Primary target: Windows (South African market)
 * Secondary targets: macOS, Linux
 */

module.exports = {
  packagerConfig: {
    name: 'RostraCore',
    executableName: 'RostraCore',
    icon: './build/icon', // Will use .ico on Windows, .icns on Mac, .png on Linux
    asar: true,
    appBundleId: 'com.rostracore.desktop',
    appCategoryType: 'public.app-category.business',
    win32metadata: {
      CompanyName: 'RostraCore',
      FileDescription: 'RostraCore HR & Risk Management Platform',
      ProductName: 'RostraCore Desktop',
      InternalName: 'RostraCore',
    },
  },

  makers: [
    /**
     * Windows Installer (Squirrel.Windows)
     * Primary target for South African clients
     */
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'RostraCore',
        authors: 'RostraCore Team',
        exe: 'RostraCore.exe',
        setupIcon: './build/icon.ico',
        setupExe: 'RostraCoreSetup.exe',
        noMsi: true, // Only create .exe installer (not MSI)
        loadingGif: './build/install-spinner.gif', // Optional: animated loading GIF
        certificateFile: process.env.WINDOWS_CERTIFICATE_FILE,
        certificatePassword: process.env.WINDOWS_CERTIFICATE_PASSWORD,
      },
    },

    /**
     * ZIP Archive (for manual distribution)
     * Cross-platform portable version
     */
    {
      name: '@electron-forge/maker-zip',
      platforms: ['win32', 'darwin', 'linux'],
    },

    /**
     * macOS DMG (secondary target)
     */
    /*
    {
      name: '@electron-forge/maker-dmg',
      config: {
        format: 'ULFO',
        icon: './build/icon.icns',
        name: 'RostraCore',
      },
    },
    */

    /**
     * Debian Package (Linux - secondary target)
     */
    /*
    {
      name: '@electron-forge/maker-deb',
      config: {
        options: {
          maintainer: 'RostraCore Team',
          homepage: 'https://rostracore.com',
          icon: './build/icon.png',
        },
      },
    },
    */
  ],

  publishers: [
    /**
     * GitHub Releases Publisher
     * For auto-update distribution
     */
    /*
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'rostracore',
          name: 'rostracore-desktop',
        },
        prerelease: false,
        draft: true,
      },
    },
    */
  ],
};
