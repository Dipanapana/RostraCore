# Tauri App Icons

## Generating Icons

Tauri requires multiple icon sizes. You can generate them from a single PNG source.

### Required Icons:
- `32x32.png` - 32x32 pixels
- `128x128.png` - 128x128 pixels
- `128x128@2x.png` - 256x256 pixels (retina)
- `icon.icns` - macOS icon (multiple sizes)
- `icon.ico` - Windows icon (multiple sizes)

### Using Tauri Icon Generator

Install the icon generator:
```bash
cargo install tauri-cli
```

Generate icons from a 1024x1024 PNG source:
```bash
cargo tauri icon path/to/icon.png
```

This will generate all required icon sizes automatically.

### Manual Generation

If you don't have the icon generator:

1. Create a 1024x1024 PNG file with your app icon
2. Use an online tool like: https://icon.kitchen/ or https://www.appicon.co/
3. Upload your PNG and download the icon pack
4. Copy the generated files to this directory

### Placeholder Icons

For now, using placeholder icons. Replace with actual RostraCore branding:
- Primary color: Blue (#2563eb)
- Logo: Shield with "RC" initials
- Background: White or transparent
