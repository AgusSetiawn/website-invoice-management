const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const sourceIcon = path.join(__dirname, '../public/logo.png');
const resDir = path.join(__dirname, '../android/app/src/main/res');

const iconConfigs = [
  { dir: 'mipmap-mdpi', size: 48, foregroundSize: 108 },
  { dir: 'mipmap-hdpi', size: 72, foregroundSize: 162 },
  { dir: 'mipmap-xhdpi', size: 96, foregroundSize: 216 },
  { dir: 'mipmap-xxhdpi', size: 144, foregroundSize: 324 },
  { dir: 'mipmap-xxxhdpi', size: 192, foregroundSize: 432 }
];

async function generate() {
  console.log('Generating Android Launcher Icons from public/logo.png...');
  
  if (!fs.existsSync(sourceIcon)) {
    console.error('Source icon not found at: ' + sourceIcon);
    process.exit(1);
  }

  for (const config of iconConfigs) {
    const dirPath = path.join(resDir, config.dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // 1. Generate ic_launcher.png (Standard Icon)
    const icPath = path.join(dirPath, 'ic_launcher.png');
    await sharp(sourceIcon)
      .resize(config.size, config.size)
      .toFile(icPath);
    console.log(`Generated standard icon: ${config.dir}/ic_launcher.png (${config.size}x${config.size})`);

    // 2. Generate ic_launcher_round.png (Round Icon)
    const roundPath = path.join(dirPath, 'ic_launcher_round.png');
    const radius = config.size / 2;
    const circleSvg = Buffer.from(
      `<svg><circle cx="${radius}" cy="${radius}" r="${radius}" fill="white"/></svg>`
    );
    await sharp(sourceIcon)
      .resize(config.size, config.size)
      .composite([{
        input: circleSvg,
        blend: 'dest-in'
      }])
      .toFile(roundPath);
    console.log(`Generated round icon: ${config.dir}/ic_launcher_round.png (${config.size}x${config.size})`);

    // 3. Generate ic_launcher_foreground.png (Adaptive Foreground Icon)
    const fgPath = path.join(dirPath, 'ic_launcher_foreground.png');
    const logoSize = Math.round(config.foregroundSize * 0.65);
    const padding = Math.round((config.foregroundSize - logoSize) / 2);
    
    await sharp(sourceIcon)
      .resize(logoSize, logoSize)
      .extend({
        top: padding,
        bottom: config.foregroundSize - logoSize - padding,
        left: padding,
        right: config.foregroundSize - logoSize - padding,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .toFile(fgPath);
    console.log(`Generated adaptive foreground: ${config.dir}/ic_launcher_foreground.png (${config.foregroundSize}x${config.foregroundSize})`);
  }
  
  console.log('Successfully generated all Android Launcher Icons!');
}

generate().catch(err => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
