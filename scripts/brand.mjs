// Rebuilds the logo files from LOGO_PATH in lib/logo.js: brand/ (for use outside the site) and the
// favicons in app/ (Next.js serves app/icon.svg and app/apple-icon.png automatically).
// PNGs use sharp, which comes with Next.js. Run with `npm run brand`.
import fs from 'node:fs';
import sharp from 'sharp';
import { LOGO_PATH } from '../lib/logo.js';

const PINK = '#EA6FA0'; // the dark theme's --primary
const INK = '#1C1A1F';

const mark = color =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="${color}" fill-rule="evenodd" d="${LOGO_PATH}"/></svg>\n`;
const icon =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="5.5" fill="${INK}"/>` +
  `<path fill="${PINK}" fill-rule="evenodd" transform="translate(2.4 2.4) scale(0.8)" d="${LOGO_PATH}"/></svg>\n`;

fs.mkdirSync('brand', { recursive: true });
fs.writeFileSync('brand/poca-mark.svg', mark(PINK));
fs.writeFileSync('brand/poca-mark-white.svg', mark('#FFFFFF'));
fs.writeFileSync('brand/poca-icon.svg', icon);
fs.writeFileSync('app/icon.svg', icon);
await sharp(Buffer.from(icon), { density: 2048 }).resize(512, 512).png().toFile('brand/poca-icon-512.png');
await sharp(Buffer.from(icon), { density: 1024 }).resize(180, 180).png().toFile('app/apple-icon.png');
console.log('Wrote brand/ and app/icon.svg, app/apple-icon.png');
