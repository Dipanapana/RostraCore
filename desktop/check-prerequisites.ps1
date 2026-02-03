# RostraCore Desktop - Prerequisites Checker
# Run this script to check if you have everything needed for Tauri development

Write-Host "`n=====================================" -ForegroundColor Cyan
Write-Host "RostraCore Desktop - Prerequisites Check" -ForegroundColor Cyan
Write-Host "=====================================`n" -ForegroundColor Cyan

$allGood = $true

# Check 1: Node.js
Write-Host "[1/5] Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>$null
    if ($nodeVersion) {
        Write-Host "  ✓ Node.js installed: $nodeVersion" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Node.js not found" -ForegroundColor Red
        Write-Host "    Install from: https://nodejs.org/" -ForegroundColor Gray
        $allGood = $false
    }
} catch {
    Write-Host "  ✗ Node.js not found" -ForegroundColor Red
    Write-Host "    Install from: https://nodejs.org/" -ForegroundColor Gray
    $allGood = $false
}

# Check 2: npm
Write-Host "`n[2/5] Checking npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version 2>$null
    if ($npmVersion) {
        Write-Host "  ✓ npm installed: v$npmVersion" -ForegroundColor Green
    } else {
        Write-Host "  ✗ npm not found" -ForegroundColor Red
        $allGood = $false
    }
} catch {
    Write-Host "  ✗ npm not found" -ForegroundColor Red
    $allGood = $false
}

# Check 3: Rust
Write-Host "`n[3/5] Checking Rust..." -ForegroundColor Yellow
try {
    $rustVersion = rustc --version 2>$null
    if ($rustVersion) {
        Write-Host "  ✓ Rust installed: $rustVersion" -ForegroundColor Green

        # Also check cargo
        $cargoVersion = cargo --version 2>$null
        if ($cargoVersion) {
            Write-Host "  ✓ Cargo installed: $cargoVersion" -ForegroundColor Green
        }
    } else {
        Write-Host "  ✗ Rust not found" -ForegroundColor Red
        Write-Host "    Install from: https://www.rust-lang.org/tools/install" -ForegroundColor Gray
        Write-Host "    Direct link: https://win.rustup.rs/x86_64" -ForegroundColor Gray
        Write-Host "    After install, restart your terminal!" -ForegroundColor Yellow
        $allGood = $false
    }
} catch {
    Write-Host "  ✗ Rust not found" -ForegroundColor Red
    Write-Host "    Install from: https://www.rust-lang.org/tools/install" -ForegroundColor Gray
    Write-Host "    Direct link: https://win.rustup.rs/x86_64" -ForegroundColor Gray
    Write-Host "    After install, restart your terminal!" -ForegroundColor Yellow
    $allGood = $false
}

# Check 4: Visual Studio Build Tools (C++ compiler)
Write-Host "`n[4/5] Checking Visual Studio Build Tools..." -ForegroundColor Yellow
try {
    $clPath = where.exe cl.exe 2>$null
    if ($clPath) {
        Write-Host "  ✓ MSVC C++ compiler found" -ForegroundColor Green
        Write-Host "    Path: $($clPath[0])" -ForegroundColor Gray
    } else {
        Write-Host "  ✗ MSVC C++ compiler not found" -ForegroundColor Red
        Write-Host "    Install Visual Studio Build Tools from:" -ForegroundColor Gray
        Write-Host "    https://visualstudio.microsoft.com/visual-cpp-build-tools/" -ForegroundColor Gray
        Write-Host "    Select: 'Desktop development with C++' workload" -ForegroundColor Yellow
        $allGood = $false
    }
} catch {
    Write-Host "  ✗ MSVC C++ compiler not found" -ForegroundColor Red
    Write-Host "    Install Visual Studio Build Tools from:" -ForegroundColor Gray
    Write-Host "    https://visualstudio.microsoft.com/visual-cpp-build-tools/" -ForegroundColor Gray
    Write-Host "    Select: 'Desktop development with C++' workload" -ForegroundColor Yellow
    $allGood = $false
}

# Check 5: WebView2 (for running the app)
Write-Host "`n[5/5] Checking WebView2..." -ForegroundColor Yellow
$webview2Path = "C:\Program Files (x86)\Microsoft\EdgeWebView\Application"
if (Test-Path $webview2Path) {
    $webview2Versions = Get-ChildItem $webview2Path -Directory | Where-Object { $_.Name -match '^\d+\.' } | Select-Object -First 1
    if ($webview2Versions) {
        Write-Host "  ✓ WebView2 installed: $($webview2Versions.Name)" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ WebView2 path exists but version unclear" -ForegroundColor Yellow
        Write-Host "    Should work on Windows 10/11" -ForegroundColor Gray
    }
} else {
    Write-Host "  ⚠ WebView2 not detected (but likely pre-installed)" -ForegroundColor Yellow
    Write-Host "    Windows 10/11 typically have WebView2 built-in" -ForegroundColor Gray
    Write-Host "    If app fails to run, download from:" -ForegroundColor Gray
    Write-Host "    https://developer.microsoft.com/en-us/microsoft-edge/webview2/" -ForegroundColor Gray
}

# Summary
Write-Host "`n=====================================" -ForegroundColor Cyan
if ($allGood) {
    Write-Host "✓ All prerequisites installed!" -ForegroundColor Green
    Write-Host "=====================================" -ForegroundColor Cyan
    Write-Host "`nYou're ready to run the desktop app!" -ForegroundColor Green
    Write-Host "`nNext steps:" -ForegroundColor Cyan
    Write-Host "  1. cd frontend && npm install" -ForegroundColor White
    Write-Host "  2. npm run dev  (in frontend folder)" -ForegroundColor White
    Write-Host "  3. cd ../desktop && npm install" -ForegroundColor White
    Write-Host "  4. npm run dev  (in desktop folder)" -ForegroundColor White
    Write-Host "`nSee QUICKSTART.md for detailed instructions.`n" -ForegroundColor Gray
} else {
    Write-Host "✗ Missing prerequisites" -ForegroundColor Red
    Write-Host "=====================================" -ForegroundColor Cyan
    Write-Host "`nPlease install the missing items above." -ForegroundColor Yellow
    Write-Host "`nQuick install links:" -ForegroundColor Cyan
    Write-Host "  • Rust: https://win.rustup.rs/x86_64" -ForegroundColor White
    Write-Host "  • VS Build Tools: https://aka.ms/vs/17/release/vs_BuildTools.exe" -ForegroundColor White
    Write-Host "`nSee QUICKSTART.md for step-by-step guide.`n" -ForegroundColor Gray
}
