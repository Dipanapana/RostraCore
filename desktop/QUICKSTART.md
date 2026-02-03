# RostraCore Desktop - Quick Start Guide

Get the Tauri desktop app running in 3 steps.

---

## Step 1: Install Rust (5 minutes)

### Download Rust Installer

Visit: **https://www.rust-lang.org/tools/install**

Or direct download: **https://win.rustup.rs/x86_64**

### Run the Installer

1. Double-click `rustup-init.exe`
2. Press **Enter** to proceed with default installation
3. Wait for download and installation (~200MB)
4. Installation complete message will appear

### Verify Installation

Open a **new terminal** (important - existing terminals won't see Rust):

```bash
rustc --version
cargo --version
```

Expected output:
```
rustc 1.76.0 (or newer)
cargo 1.76.0 (or newer)
```

**Troubleshooting:**
- If command not found: Close terminal and open a new one
- If still not working: Reboot your PC (adds Rust to PATH)

---

## Step 2: Install Visual Studio Build Tools (10 minutes)

### Why Required?

Tauri needs C++ compiler tools to build native Windows apps.

### Download

Visit: **https://visualstudio.microsoft.com/visual-cpp-build-tools/**

Or direct download: **https://aka.ms/vs/17/release/vs_BuildTools.exe**

### Install

1. Run `vs_BuildTools.exe`
2. When installer opens, select **"Desktop development with C++"**
3. Click **Install** (downloads ~6GB)
4. Wait for installation (~10-15 minutes)
5. **Restart your PC** when done

### Verify Installation

Open terminal and check:

```bash
where cl.exe
```

Should show path like:
```
C:\Program Files\Microsoft Visual Studio\2022\BuildTools\VC\Tools\MSVC\...\cl.exe
```

---

## Step 3: Run the Desktop App

### Development Mode (with hot reload)

Open **two terminals** in the RostraCore project:

**Terminal 1** - Frontend dev server:
```bash
cd frontend
npm run dev
```

Wait for:
```
✓ Ready on http://localhost:3000
```

**Terminal 2** - Tauri desktop app:
```bash
cd desktop
npm run dev
```

Wait for app window to open. This will:
- Download Tauri dependencies first time (~100MB)
- Compile Rust code (~2 minutes first time)
- Open native window with your app

**First run is slow (2-5 minutes)**. Subsequent runs are fast (<10 seconds).

### What You Should See

1. Terminal 1 shows Next.js running on port 3000
2. Terminal 2 shows Tauri compiling Rust
3. Desktop window opens with RostraCore app
4. App loads from http://localhost:3000
5. Hot reload works - edit React files and see changes instantly

---

## Common Issues

### Issue: "cargo: command not found"

**Solution:**
1. Close all terminals
2. Open a **new terminal**
3. Try again

If still not working:
- Reboot your PC
- Verify Rust is in PATH: `echo $PATH` (should include `.cargo/bin`)

### Issue: "error: linker 'link.exe' not found"

**Solution:**
- Install Visual Studio Build Tools (see Step 2)
- Make sure you selected "Desktop development with C++"
- Restart your PC after installation

### Issue: "WebView2 not found"

**Solution:**
- Windows 10/11 have WebView2 pre-installed
- If missing, download: https://developer.microsoft.com/en-us/microsoft-edge/webview2/
- Run the installer

### Issue: "Failed to compile Rust"

**Solution:**
1. Check you have both Rust AND VS Build Tools
2. Restart terminal after installing Rust
3. Try clean build:
   ```bash
   cd desktop
   npm run clean
   npm run dev
   ```

### Issue: App window is blank/white

**Solution:**
1. Make sure frontend dev server is running (Terminal 1)
2. Check it's on http://localhost:3000
3. Check `tauri.conf.json` has correct `devUrl`

### Issue: Port 3000 already in use

**Solution:**
```bash
# Windows: Find and kill process using port 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or change port in package.json:
# "dev": "next dev -p 3001"
```

---

## Production Build

Once development mode works, create production installer:

### 1. Build Frontend

```bash
cd frontend
npm run build:desktop
```

Creates static export in `frontend/out/`

### 2. Build Tauri App

```bash
cd desktop
npm run build
```

**First build takes 5-10 minutes** (compiles in release mode).

### 3. Find Installer

Located at:
```
desktop/src-tauri/target/release/bundle/nsis/RostraCore Desktop_1.0.0_x64-setup.exe
```

Installer is ~3MB. Copy to USB or network share for distribution.

---

## Testing the Installer

### Install

1. Double-click `RostraCore Desktop_1.0.0_x64-setup.exe`
2. Follow installation wizard
3. Desktop shortcut created automatically

### Test App

1. Launch from desktop shortcut
2. App opens in ~2 seconds
3. Test login (needs backend running)
4. Test employee CRUD operations
5. Verify data persists after closing/reopening

### Uninstall

1. Windows Settings → Apps → RostraCore Desktop → Uninstall
2. Or run uninstaller from Start Menu

---

## Development Tips

### Speed Up Rust Compilation

Edit `desktop/src-tauri/.cargo/config.toml`:

```toml
[build]
incremental = true

[target.x86_64-pc-windows-msvc]
rustflags = ["-C", "link-arg=/INCREMENTAL"]
```

### Use Rust Analyzer (VS Code)

Install extension: `rust-lang.rust-analyzer`

Provides:
- Code completion
- Error checking
- Go to definition
- Inline documentation

### Debug Tauri IPC

In frontend code:

```typescript
import { invoke } from '@tauri-apps/api/core'

// See IPC calls in console
console.log('Calling get_stored_data...')
const result = await invoke('get_stored_data', { key: 'test' })
console.log('Result:', result)
```

In Rust code:

```rust
#[tauri::command]
async fn get_stored_data(key: String) -> Result<String, String> {
    println!("IPC: get_stored_data called with key: {}", key);
    // ... rest of function
}
```

### Clear Tauri Cache

If app behaves weirdly:

```bash
cd desktop
npm run clean
rm -rf src-tauri/target
npm run dev
```

---

## Next Steps

1. ✅ Tauri migration complete
2. ⏳ Install Rust (Step 1)
3. ⏳ Install VS Build Tools (Step 2)
4. ⏳ Run in dev mode (Step 3)
5. ⏳ Test functionality
6. ⏳ Build production installer
7. ⏳ Test installer on Windows 10/11
8. ⏳ Deploy to client

---

## Time Estimates

| Task | First Time | Subsequent |
|------|-----------|------------|
| Install Rust | 5 min | - |
| Install VS Build Tools | 15 min | - |
| First `npm run dev` | 2-5 min | 10 sec |
| First `npm run build` | 10 min | 5 min |
| Edit code & hot reload | instant | instant |

---

## Resources

**Installation:**
- Rust: https://www.rust-lang.org/tools/install
- VS Build Tools: https://visualstudio.microsoft.com/visual-cpp-build-tools/
- WebView2: https://developer.microsoft.com/en-us/microsoft-edge/webview2/

**Documentation:**
- [README.md](./README.md) - Full desktop documentation
- [TAURI_SETUP.md](./TAURI_SETUP.md) - Detailed setup guide
- Tauri Docs: https://tauri.app/
- Rust Book: https://doc.rust-lang.org/book/

**Community:**
- Tauri Discord: https://discord.com/invite/tauri
- Rust Forum: https://users.rust-lang.org/

---

## Summary

**Prerequisites:** Rust + VS Build Tools (20 minutes total)

**Development:** Two terminals - frontend dev server + Tauri app

**Production:** Build frontend → Build Tauri → Get 3MB installer

**First build is slow, subsequent builds are fast!**

Ready? Start with Step 1: Install Rust 🦀
