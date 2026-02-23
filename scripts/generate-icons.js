#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const INPUT_IMAGE = path.join(__dirname, '../public/reportmate-logo.png');
const OUTPUT_DIR = path.join(__dirname, '../public');

// Icon sizes needed for different use cases
const ICON_SIZES = [
  // Favicon
  { size: 16, name: 'favicon-16x16.png', padding: 0.1 },
  { size: 32, name: 'favicon-32x32.png', padding: 0.1 },
  { size: 48, name: 'favicon-48x48.png', padding: 0.1 },
  
  // Apple Touch Icons - Optimized for iOS safe area (80% of canvas)
  { size: 180, name: 'apple-touch-icon.png', padding: 0.1 },
  { size: 152, name: 'apple-touch-icon-152x152.png', padding: 0.1 },
  { size: 167, name: 'apple-touch-icon-167x167.png', padding: 0.1 },
  { size: 120, name: 'apple-touch-icon-120x120.png', padding: 0.1 },
  
  // PWA Icons
  { size: 192, name: 'icon-192x192.png', padding: 0.1 },
  { size: 256, name: 'icon-256x256.png', padding: 0.1 },
  { size: 384, name: 'icon-384x384.png', padding: 0.1 },
  { size: 512, name: 'icon-512x512.png', padding: 0.1 },
];

async function generateIcons() {
  console.log('🎨 Generating icons from:', INPUT_IMAGE);
  
  // Check if input image exists
  if (!fs.existsSync(INPUT_IMAGE)) {
    console.error('❌ Input image not found:', INPUT_IMAGE);
    process.exit(1);
  }

  // Generate all icon sizes
  for (const { size, name, padding = 0 } of ICON_SIZES) {
    const outputPath = path.join(OUTPUT_DIR, name);
    
    // Calculate actual icon size with padding
    const paddingPixels = Math.floor(size * padding);
    const iconSize = size - (paddingPixels * 2);
    
    try {
      // Create base image with padding
      await sharp(INPUT_IMAGE)
        .resize(iconSize, iconSize, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .extend({
          top: paddingPixels,
          bottom: paddingPixels,
          left: paddingPixels,
          right: paddingPixels,
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(outputPath);
      
      console.log(`✅ Generated ${name} (${size}x${size}, padding: ${padding * 100}%)`);
    } catch (error) {
      console.error(`❌ Failed to generate ${name}:`, error.message);
    }
  }

  // Generate dark mode variants for macOS Sequoia Safari
  console.log('\n🌙 Generating dark mode variants...');
  
  // Create dark variant for Safari mask-icon (SVG would be better, but PNG works)
  const darkVariants = [
    { size: 180, name: 'apple-touch-icon-dark.png' },
  ];
  
  for (const { size, name } of darkVariants) {
    const outputPath = path.join(OUTPUT_DIR, name);
    const paddingPixels = Math.floor(size * 0.1);
    const iconSize = size - (paddingPixels * 2);
    
    try {
      // For dark mode, we can create a variant with inverted colors or optimized contrast
      // For now, we'll create the same icon (relies on macOS automatic adaptation)
      await sharp(INPUT_IMAGE)
        .resize(iconSize, iconSize, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .extend({
          top: paddingPixels,
          bottom: paddingPixels,
          left: paddingPixels,
          right: paddingPixels,
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(outputPath);
      
      console.log(`✅ Generated ${name} (dark mode variant)`);
    } catch (error) {
      console.error(`❌ Failed to generate ${name}:`, error.message);
    }
  }

  // Generate favicon.ico (multi-size ICO)
  try {
    const icoPath = path.join(OUTPUT_DIR, 'favicon.ico');
    const paddingPixels = Math.floor(32 * 0.1);
    const iconSize = 32 - (paddingPixels * 2);
    
    await sharp(INPUT_IMAGE)
      .resize(iconSize, iconSize, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .extend({
        top: paddingPixels,
        bottom: paddingPixels,
        left: paddingPixels,
        right: paddingPixels,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .toFile(icoPath);
    console.log('✅ Generated favicon.ico');
  } catch (error) {
    console.error('❌ Failed to generate favicon.ico:', error.message);
  }

  console.log('\n🎉 Icon generation complete!');
  console.log('\n📝 Note: macOS Sequoia will automatically adapt icons with alpha channels for dark mode.');
  console.log('   For custom dark variants, update apple-touch-icon-dark.png manually.');
}

generateIcons().catch(error => {
  console.error('❌ Error generating icons:', error);
  process.exit(1);
});
