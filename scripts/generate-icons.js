#!/usr/bin/env node
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const INPUT_IMAGE = path.join(__dirname, '../public/reportmate-logo.png');
const OUTPUT_DIR = path.join(__dirname, '../public');

// Icon sizes needed for different use cases
const ICON_SIZES = [
  // Favicon
  { size: 16, name: 'favicon-16x16.png' },
  { size: 32, name: 'favicon-32x32.png' },
  { size: 48, name: 'favicon-48x48.png' },
  
  // Apple Touch Icons
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 152, name: 'apple-touch-icon-152x152.png' },
  { size: 167, name: 'apple-touch-icon-167x167.png' },
  { size: 120, name: 'apple-touch-icon-120x120.png' },
  
  // PWA Icons
  { size: 192, name: 'icon-192x192.png' },
  { size: 256, name: 'icon-256x256.png' },
  { size: 384, name: 'icon-384x384.png' },
  { size: 512, name: 'icon-512x512.png' },
];

async function generateIcons() {
  console.log('🎨 Generating icons from:', INPUT_IMAGE);
  
  // Check if input image exists
  if (!fs.existsSync(INPUT_IMAGE)) {
    console.error('❌ Input image not found:', INPUT_IMAGE);
    process.exit(1);
  }

  // Generate all icon sizes
  for (const { size, name } of ICON_SIZES) {
    const outputPath = path.join(OUTPUT_DIR, name);
    
    try {
      await sharp(INPUT_IMAGE)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toFile(outputPath);
      
      console.log(`✅ Generated ${name} (${size}x${size})`);
    } catch (error) {
      console.error(`❌ Failed to generate ${name}:`, error.message);
    }
  }

  // Generate favicon.ico (multi-size ICO)
  try {
    const icoPath = path.join(OUTPUT_DIR, 'favicon.ico');
    await sharp(INPUT_IMAGE)
      .resize(32, 32)
      .toFile(icoPath);
    console.log('✅ Generated favicon.ico');
  } catch (error) {
    console.error('❌ Failed to generate favicon.ico:', error.message);
  }

  console.log('\n🎉 Icon generation complete!');
}

generateIcons().catch(error => {
  console.error('❌ Error generating icons:', error);
  process.exit(1);
});
