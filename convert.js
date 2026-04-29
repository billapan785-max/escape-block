import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function convertImages() {
  const assetsDir = 'src/assets';
  const files = fs.readdirSync(assetsDir).filter(f => f.endsWith('.png') && !f.includes('adaptive-icon') && !f.includes('ic_launcher'));
  
  for (const file of files) {
    const pngPath = path.join(assetsDir, file);
    const webpPath = path.join(assetsDir, file.replace('.png', '.webp'));
    console.log(`Converting ${pngPath} to ${webpPath}...`);
    try {
      await sharp(pngPath)
        .webp({ quality: 75 })
        .toFile(webpPath);
      console.log(`Successfully converted ${file}`);
    } catch (e) {
      console.error(`Error converting ${file}:`, e);
    }
  }
}

convertImages();
