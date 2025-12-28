# ReportMate Icon Assets

This directory contains all the icon assets for ReportMate, including favicons, Apple Touch Icons, and PWA icons.

## Generated Icons

All icons are generated from the source logo: `reportmate-logo.png` (1024x1024)

### Favicon (Browser Tab Icon)
- `favicon.ico` - Multi-size ICO format (32x32 primary)
- `favicon-16x16.png` - 16x16 PNG
- `favicon-32x32.png` - 32x32 PNG  
- `favicon-48x48.png` - 48x48 PNG

### Apple Touch Icons (Safari "Add to Dock")
- `apple-touch-icon.png` - 180x180 (default for iOS)
- `apple-touch-icon-152x152.png` - 152x152 (iPad)
- `apple-touch-icon-167x167.png` - 167x167 (iPad Pro)
- `apple-touch-icon-120x120.png` - 120x120 (older iPhones)

### PWA Icons (Progressive Web App)
- `icon-192x192.png` - 192x192 (minimum recommended)
- `icon-256x256.png` - 256x256
- `icon-384x384.png` - 384x384
- `icon-512x512.png` - 512x512 (recommended for splash screens)

## Configuration Files

### manifest.json
Web app manifest for PWA installation on Chrome, Edge, and other browsers.

Configured with:
- App name and description
- Theme colors
- Display mode (standalone)
- Icon references
- Shortcuts for quick actions

### browserconfig.xml
Configuration for Windows tile icons in Edge and Internet Explorer.

### robots.txt
Search engine crawler instructions.

## Regenerating Icons

If you need to update the logo and regenerate all icons:

```bash
# 1. Replace the source logo
cp /path/to/new-logo.png public/reportmate-logo.png

# 2. Regenerate all icons
pnpm generate-icons
```

The script will automatically create all required sizes while maintaining proper aspect ratios and transparency.

## Implementation Details

Icons are referenced in `app/layout.tsx` via Next.js metadata:

```typescript
export const metadata: Metadata = {
  manifest: "/manifest.json",
  icons: {
    icon: [...],      // Favicons
    apple: [...],     // Apple Touch Icons
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ReportMate",
  },
  themeColor: "#0ea5e9",
};
```

## Browser Support

- ✅ Chrome/Edge: PWA icons + favicon
- ✅ Safari (iOS/macOS): Apple Touch Icons + favicon  
- ✅ Firefox: Favicon
- ✅ Internet Explorer/Edge: Windows tile icons

## Testing

### PWA Installation
1. **Chrome/Edge**: Look for install icon in address bar
2. **Safari iOS**: Share > Add to Home Screen
3. **Safari macOS**: File > Add to Dock

### Favicon
Check browser tab displays the logo correctly

### Dev Tools
Use Lighthouse audit in Chrome DevTools to verify PWA configuration:
```
DevTools > Lighthouse > Progressive Web App
```

## File Sizes

Total icon assets: ~435 KB

Consider enabling compression in production (gzip/brotli) for optimal delivery.
