import fs from 'fs';
if (!fs.existsSync('assets')) {
  fs.mkdirSync('assets');
}
fs.copyFileSync('public/logo.png', 'assets/icon.png');
fs.copyFileSync('public/splash.png', 'assets/splash.png');
console.log('Files copied to assets/');
