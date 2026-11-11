import sharp from 'sharp';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BRAND_COLORS,
  CLAP,
  WORDMARK,
  renderClapShapes,
  renderWordmarkShapes,
} from '../src/shared/brand/brandArt.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outFile = resolve(__dirname, '../public/og-image.png');

const WIDTH = 1200;
const HEIGHT = 630;

const logoSize = 150;
const logoX = (WIDTH - logoSize) / 2;
const logoY = 92;

const [, , wordmarkUnitsWide, wordmarkUnitsHigh] = WORDMARK.viewBox.split(' ').map(Number);
const wordmarkHeight = 104;
const wordmarkWidth = (wordmarkHeight * wordmarkUnitsWide) / wordmarkUnitsHigh;
const wordmarkX = (WIDTH - wordmarkWidth) / 2;
const wordmarkY = 272;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0b1220" />
      <stop offset="1" stop-color="#0f172a" />
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.28" r="0.5">
      <stop offset="0" stop-color="#1d4ed8" stop-opacity="0.55" />
      <stop offset="1" stop-color="#1d4ed8" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)" />
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow)" />
  <rect width="${WIDTH}" height="6" fill="#1d4ed8" />
  <svg x="${logoX}" y="${logoY}" width="${logoSize}" height="${logoSize}" viewBox="${CLAP.viewBox}">
    ${renderClapShapes(BRAND_COLORS.clapOnDark)}
  </svg>
  <svg x="${wordmarkX}" y="${wordmarkY}" width="${wordmarkWidth}" height="${wordmarkHeight}" viewBox="${WORDMARK.viewBox}">
    ${renderWordmarkShapes({ word: BRAND_COLORS.wordOnDark, picker: BRAND_COLORS.pickerOnDark, dot: BRAND_COLORS.dot })}
  </svg>
  <text x="${WIDTH / 2}" y="438" text-anchor="middle" font-family="Arial, 'DejaVu Sans', Helvetica, sans-serif" font-size="34" fill="#94a3b8">Choisissez le film de la soir&#233;e ensemble.</text>
  <text x="${WIDTH / 2}" y="484" text-anchor="middle" font-family="Arial, 'DejaVu Sans', Helvetica, sans-serif" font-size="34" fill="#94a3b8">Votez, et laissez la roue trancher.</text>
  <text x="${WIDTH / 2}" y="564" text-anchor="middle" font-family="Arial, 'DejaVu Sans', Helvetica, sans-serif" font-size="28" font-weight="700" fill="#93c5fd" letter-spacing="1">www.movie-picker.fr</text>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile(outFile);
console.log(`✔ og-image.png (${WIDTH}×${HEIGHT})`);
