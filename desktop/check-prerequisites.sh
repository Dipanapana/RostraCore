#!/bin/bash
# RostraCore Desktop - Prerequisites Checker

echo ""
echo "====================================="
echo "RostraCore Desktop - Prerequisites"
echo "====================================="
echo ""

all_good=true

# Check 1: Node.js
echo "[1/5] Checking Node.js..."
if command -v node &> /dev/null; then
    version=$(node --version)
    echo "  ✓ Node.js installed: $version"
else
    echo "  ✗ Node.js not found"
    echo "    Install from: https://nodejs.org/"
    all_good=false
fi

# Check 2: npm
echo ""
echo "[2/5] Checking npm..."
if command -v npm &> /dev/null; then
    version=$(npm --version)
    echo "  ✓ npm installed: v$version"
else
    echo "  ✗ npm not found"
    all_good=false
fi

# Check 3: Rust
echo ""
echo "[3/5] Checking Rust..."
if command -v rustc &> /dev/null; then
    rust_version=$(rustc --version)
    cargo_version=$(cargo --version)
    echo "  ✓ Rust installed: $rust_version"
    echo "  ✓ Cargo installed: $cargo_version"
else
    echo "  ✗ Rust not found"
    echo "    Install from: https://www.rust-lang.org/tools/install"
    echo "    Direct link: https://win.rustup.rs/x86_64"
    echo "    After install, restart your terminal!"
    all_good=false
fi

# Check 4: Visual Studio Build Tools
echo ""
echo "[4/5] Checking Visual Studio Build Tools..."
if command -v cl.exe &> /dev/null 2>&1 || where cl.exe &> /dev/null 2>&1; then
    echo "  ✓ MSVC C++ compiler found"
else
    echo "  ✗ MSVC C++ compiler not found"
    echo "    Install Visual Studio Build Tools from:"
    echo "    https://visualstudio.microsoft.com/visual-cpp-build-tools/"
    echo "    Select: 'Desktop development with C++' workload"
    all_good=false
fi

# Check 5: WebView2
echo ""
echo "[5/5] Checking WebView2..."
webview2_path="/c/Program Files (x86)/Microsoft/EdgeWebView/Application"
if [ -d "$webview2_path" ]; then
    echo "  ✓ WebView2 installed"
else
    echo "  ⚠ WebView2 not detected (but likely pre-installed)"
    echo "    Windows 10/11 typically have WebView2 built-in"
    echo "    If app fails to run, download from:"
    echo "    https://developer.microsoft.com/en-us/microsoft-edge/webview2/"
fi

# Summary
echo ""
echo "====================================="
if [ "$all_good" = true ]; then
    echo "✓ All prerequisites installed!"
    echo "====================================="
    echo ""
    echo "You're ready to run the desktop app!"
    echo ""
    echo "Next steps:"
    echo "  1. cd frontend && npm install"
    echo "  2. npm run dev  (in frontend folder)"
    echo "  3. cd ../desktop && npm install"
    echo "  4. npm run dev  (in desktop folder)"
    echo ""
    echo "See QUICKSTART.md for detailed instructions."
    echo ""
else
    echo "✗ Missing prerequisites"
    echo "====================================="
    echo ""
    echo "Please install the missing items above."
    echo ""
    echo "Quick install links:"
    echo "  • Rust: https://win.rustup.rs/x86_64"
    echo "  • VS Build Tools: https://aka.ms/vs/17/release/vs_BuildTools.exe"
    echo ""
    echo "See QUICKSTART.md for step-by-step guide."
    echo ""
fi
