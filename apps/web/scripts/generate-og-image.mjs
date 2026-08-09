import sharp from 'sharp';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outFile = resolve(__dirname, '../public/og-image.png');

const WIDTH = 1200;
const HEIGHT = 630;

const logoSize = 150;
const logoX = (WIDTH - logoSize) / 2;
const logoY = 92;
const logoScale = logoSize / 58;
const logoTransform = `translate(${logoX} ${logoY}) scale(${logoScale}) translate(-5 -1.5)`;

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
    <clipPath id="clapBar">
      <path d="M10.472,25.712 L53.528,17.288 Q55,17 55.325,15.536 L56.675,9.464 Q57,8 55.528,8.288 L12.472,16.712 Q11,17 10.675,18.464 L9.325,24.536 Q9,26 10.472,25.712 Z" />
    </clipPath>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)" />
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow)" />
  <rect width="${WIDTH}" height="6" fill="#1d4ed8" />
  <g transform="${logoTransform}">
    <g transform="rotate(-12 32.5 30.5)">
      <rect x="8" y="26" width="48" height="27" rx="4" fill="#3b82f6" />
      <path d="M28.342,33.671 L38.658,38.829 Q40,39.5 38.658,40.171 L28.342,45.329 Q27,46 27,44.5 L27,34.5 Q27,33 28.342,33.671 Z" fill="#ffffff" />
      <path d="M10.472,25.712 L53.528,17.288 Q55,17 55.325,15.536 L56.675,9.464 Q57,8 55.528,8.288 L12.472,16.712 Q11,17 10.675,18.464 L9.325,24.536 Q9,26 10.472,25.712 Z" fill="#3b82f6" />
      <g clip-path="url(#clapBar)" fill="#ffffff">
        <polygon points="9,26 14.75,24.875 16.75,15.875 11,17" />
        <polygon points="20.5,23.75 26.25,22.625 28.25,13.625 22.5,14.75" />
        <polygon points="32,21.5 37.75,20.375 39.75,11.375 34,12.5" />
        <polygon points="43.5,19.25 49.25,18.125 51.25,9.125 45.5,10.25" />
      </g>
    </g>
  </g>
  <text x="${WIDTH / 2}" y="360" text-anchor="middle" font-family="Arial, 'DejaVu Sans', Helvetica, sans-serif" font-size="94" font-weight="800" fill="#f8fafc" letter-spacing="-2">Movie Picker</text>
  <text x="${WIDTH / 2}" y="424" text-anchor="middle" font-family="Arial, 'DejaVu Sans', Helvetica, sans-serif" font-size="34" fill="#94a3b8">Choisissez le film de la soir&#233;e ensemble.</text>
  <text x="${WIDTH / 2}" y="470" text-anchor="middle" font-family="Arial, 'DejaVu Sans', Helvetica, sans-serif" font-size="34" fill="#94a3b8">Votez, et laissez la roue trancher.</text>
  <text x="${WIDTH / 2}" y="556" text-anchor="middle" font-family="Arial, 'DejaVu Sans', Helvetica, sans-serif" font-size="28" font-weight="700" fill="#93c5fd" letter-spacing="1">web.movie-picker.fr</text>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile(outFile);
console.log(`✔ og-image.png (${WIDTH}×${HEIGHT})`);
