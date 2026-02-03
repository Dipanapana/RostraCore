# RostraCore Desktop Application

Electron-based desktop application wrapping the Next.js frontend for offline-capable deployment.

## Architecture

- **Main Process**: `main/main.ts` - Electron window management, IPC handlers
- **Preload Script**: `main/preload.ts` - Secure context bridge for renderer
- **Auto-Updater**: `main/auto-updater.ts` - Automatic update handling
- **Renderer**: Next.js static export from `../frontend`

## Development

### Prerequisites

```bash
# Install dependencies
npm install

# Build frontend first
cd ../frontend
npm install
```

### Running in Development

```bash
# Terminal 1: Start Next.js dev server
cd ../frontend
npm run dev

# Terminal 2: Start Electron
cd ../desktop
npm run dev
```

### Building for Production

```bash
# Build everything
npm run build:all

# Package application
npm run package

# Create installer
npm run make
```

## Distribution

### Windows (Primary Target)

The Windows installer is created using Squirrel.Windows:

```bash
npm run make
```

**Output**: `out/make/squirrel.windows/x64/RostraCoreSetup.exe`

**Distribution Options**:
1. **USB/Network Share**: Copy installer to USB drive for client installation
2. **Internal Server**: Host on company intranet
3. **GitHub Releases**: For auto-update (requires configuration)

### Installation

**Windows 10/11**:
1. Run `RostraCoreSetup.exe`
2. Follow installation wizard
3. Desktop shortcut created automatically
4. Auto-update enabled

## Features

### Offline Capability

- Local data persistence using `electron-store`
- Cached API responses (future enhancement)
- Offline mode detection

### Auto-Updates

- Checks for updates on startup
- Downloads updates in background
- Prompts user before installing
- Seamless update process

### Security

- Context isolation enabled
- Sandbox mode enabled
- No Node.js integration in renderer
- Secure IPC communication via preload script

## Build Configuration

### Icons

Place application icons in `build/` folder:
- `icon.ico` - Windows icon (256x256)
- `icon.icns` - macOS icon (1024x1024)
- `icon.png` - Linux icon (512x512)

### Code Signing (Windows)

For production deployment, configure code signing:

```bash
# Set environment variables
export WINDOWS_CERTIFICATE_FILE=path/to/cert.pfx
export WINDOWS_CERTIFICATE_PASSWORD=your_password

# Build signed installer
npm run make
```

## Troubleshooting

### Build Issues

**TypeScript errors**:
```bash
npm run build:ts
```

**Frontend build errors**:
```bash
cd ../frontend
npm run build:desktop
```

### Runtime Issues

**White screen on startup**:
- Check frontend build exists in `renderer/` folder
- Verify `index.html` path in `main.ts`

**Auto-update not working**:
- Only works in packaged builds (not development)
- Requires GitHub releases configuration

## Project Structure

```
desktop/
├── main/                  # Electron main process
│   ├── main.ts           # Entry point
│   ├── preload.ts        # Context bridge
│   └── auto-updater.ts   # Update logic
├── build/                # Application icons
├── dist/                 # Compiled TypeScript (gitignored)
├── out/                  # Built installers (gitignored)
├── renderer/             # Next.js static export (gitignored)
├── package.json          # Dependencies
├── tsconfig.json         # TypeScript config
└── forge.config.js       # Electron Forge config
```

## Version History

- **v1.0.0** - Initial desktop release with Phase 1 multi-type HR support

## License

MIT
