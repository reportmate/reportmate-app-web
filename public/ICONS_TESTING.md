# Icon Testing Checklist

Use this checklist to verify all icons are working correctly across different platforms and browsers.

## Desktop Browsers

### Chrome/Edge/Brave
- [ ] Favicon appears in browser tab
- [ ] PWA install prompt appears (after engagement)
- [ ] Right-click on page > "Install ReportMate"
- [ ] After install: App opens in standalone window
- [ ] After install: App icon shows in app launcher/dock
- [ ] App shortcuts work from installed PWA

### Safari (macOS)
- [ ] Favicon appears in browser tab
- [ ] File > Add to Dock
- [ ] Icon appears correctly in Dock
- [ ] Opens in its own window when clicked from Dock

### Firefox
- [ ] Favicon appears in browser tab
- [ ] Bookmarks show correct icon

## Mobile Devices

### iOS Safari
- [ ] Favicon visible in tab overview
- [ ] Share button > "Add to Home Screen"
- [ ] Home screen icon displays correctly (180x180)
- [ ] App name appears under icon
- [ ] Opening from home screen shows splash screen
- [ ] App opens in fullscreen mode (no Safari UI)
- [ ] Status bar styled correctly

### Android Chrome/Edge
- [ ] Favicon appears in browser tab
- [ ] "Add to Home Screen" prompt appears
- [ ] Menu > "Install app" option available
- [ ] Home screen icon displays correctly
- [ ] Splash screen shows on launch
- [ ] App runs in standalone mode

## Developer Tools Checks

### Chrome DevTools
```bash
1. Open DevTools (F12)
2. Application > Manifest
   - [x] Manifest loads without errors
   - [x] All icons display preview thumbnails
   - [x] No console warnings about icons
   
3. Network tab
   - [x] manifest.json loads (200 OK)
   - [x] All icon PNGs load correctly
   - [x] favicon.ico loads

4. Lighthouse Audit
   - Application > Lighthouse > Progressive Web App
   - [x] Installability checks pass
   - [x] PWA score >= 90
```

### Safari Web Inspector
```bash
1. Develop > Show Web Inspector
2. Resources > Application Cache
   - [x] manifest.json present
3. Console
   - [x] No errors related to icons
```

## Quick URL Tests

Test these URLs directly (replace with your domain):

- `https://your-domain.com/favicon.ico` - Should load 32x32 icon
- `https://your-domain.com/manifest.json` - Should return JSON
- `https://your-domain.com/apple-touch-icon.png` - Should load 180x180 icon
- `https://your-domain.com/icon-192x192.png` - Should load PWA icon

## Visual Verification

### Icon Quality Checklist
- [ ] Icons are not pixelated
- [ ] Transparency renders correctly
- [ ] Logo is centered and properly sized
- [ ] Colors match brand guidelines
- [ ] Icons look good on both light and dark backgrounds

## Expected Behavior

### Browser Tab (Favicon)
- **Size**: 16x16 or 32x32 depending on display density
- **Format**: ICO or PNG
- **Location**: Shows in tab, bookmarks, history

### Safari "Add to Dock" (macOS)
- **Size**: 180x180
- **Format**: PNG
- **Appearance**: Rounded square, shows in macOS Dock

### iOS "Add to Home Screen"
- **Size**: 180x180
- **Format**: PNG
- **Appearance**: Rounded corners applied by iOS, shows on home screen

### Android "Add to Home Screen"
- **Sizes Used**: 192x192 for icon, 512x512 for splash
- **Format**: PNG
- **Appearance**: Adaptive icon shape per device, shows on launcher

## Common Issues & Solutions

### Issue: Favicon not updating
**Solution**: 
- Hard refresh: Ctrl+Shift+R (Cmd+Shift+R on Mac)
- Clear browser cache
- Check browser console for 404 errors

### Issue: PWA not installable
**Solution**:
- Verify manifest.json loads correctly
- Check HTTPS is enabled (required for PWA)
- Ensure `start_url` is valid
- Check Chrome DevTools > Application > Manifest for errors

### Issue: Wrong icon size on iOS
**Solution**:
- Verify apple-touch-icon.png is exactly 180x180
- Clear Safari cache on iOS
- Check meta tags in layout.tsx

### Issue: Icons not showing in production
**Solution**:
- Verify all icon files deployed to public folder
- Check Next.js static asset serving
- Verify CDN/proxy isn't blocking image files
- Check network tab for 404s

## Automated Testing

You can add automated checks to your CI/CD:

```bash
# Verify all required icons exist
test -f public/favicon.ico && echo "✅ favicon.ico"
test -f public/apple-touch-icon.png && echo "✅ apple-touch-icon.png"
test -f public/icon-192x192.png && echo "✅ icon-192x192.png"
test -f public/icon-512x512.png && echo "✅ icon-512x512.png"
test -f public/manifest.json && echo "✅ manifest.json"

# Verify JSON validity
python3 -m json.tool < public/manifest.json > /dev/null && echo "✅ manifest.json valid"
```

## Performance Notes

- Total icon assets: ~435 KB
- All icons served as static files
- Enable compression (gzip/brotli) in production
- Consider CDN for optimal delivery
- Icons cached by browsers after first load
