# Tauri Desktop Setup Instructions

## Prerequisites

### 1. Install Rust
Download and install Rust from: https://www.rust-lang.org/tools/install

For Windows, download `rustup-init.exe` and run it.

After installation, verify:
```bash
rustc --version
cargo --version
```

### 2. Install Visual Studio Build Tools (Windows)
Tauri requires Microsoft C++ Build Tools.

Download from: https://visualstudio.microsoft.com/visual-cpp-build-tools/

Install with "Desktop development with C++" workload.

## Project Structure

```
desktop/
├── src-tauri/           # Tauri/Rust backend
│   ├── src/
│   │   └── main.rs     # Rust main process
│   ├── icons/          # App icons (auto-generated)
│   ├── Cargo.toml      # Rust dependencies
│   └── tauri.conf.json # Tauri configuration
├── main/               # Legacy Electron code (can be removed)
├── package.json        # Node dependencies
└── TAURI_SETUP.md      # This file
```

## Initialize Tauri

After Rust is installed:

```bash
cd desktop
npm install
npx tauri init
```

**Configuration prompts:**
- App name: `RostraCore Desktop`
- Window title: `RostraCore - HR & Risk Management`
- Web assets location: `../frontend/out`
- Dev server URL: `http://localhost:3000`
- Frontend dev command: `cd ../frontend && npm run dev`
- Frontend build command: `cd ../frontend && npm run build:desktop`

## Build Frontend for Desktop

```bash
cd ../frontend
npm run build:desktop
```

This creates a static export in `frontend/out/`

## Development Mode

Terminal 1 - Frontend dev server:
```bash
cd frontend
npm run dev
```

Terminal 2 - Tauri app:
```bash
cd desktop
npm run tauri dev
```

## Production Build

```bash
# Build frontend
cd frontend
npm run build:desktop

# Build Tauri app
cd ../desktop
npm run tauri build
```

Installer will be in: `desktop/src-tauri/target/release/bundle/`

## Why Tauri vs Electron?

**Advantages:**
- ✅ Smaller bundle size (~3MB vs ~100MB for Electron)
- ✅ Lower memory usage (uses OS webview, not Chromium)
- ✅ Better security (sandboxed by default)
- ✅ Native Windows integration
- ✅ Rust backend (fast, safe, modern)
- ✅ Active development and community

**Trade-offs:**
- ⚠️ Requires Rust toolchain for development
- ⚠️ Uses OS webview (Edge WebView2 on Windows)
- ⚠️ Smaller ecosystem than Electron

## Next Steps

1. Install Rust and Visual Studio Build Tools
2. Run `npx tauri init` in desktop directory
3. Update `frontend/next.config.js` for static export
4. Test in development mode
5. Build production installer
