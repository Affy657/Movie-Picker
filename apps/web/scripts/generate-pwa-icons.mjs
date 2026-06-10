import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const svgPath = resolve(__dirname, '../public/favicon.svg');
const outputDir = resolve(__dirname, '../public/icons');

mkdirSync(outputDir, { recursive: true });

const svgContent = readFileSync(svgPath);

const sizes = [
  { name: 'pwa-64x64.png', size: 64 },
  { name: 'pwa-192x192.png', size: 192 },
  { name: 'pwa-512x512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
];

for (const { name, size } of sizes) {
  await sharp(svgContent).resize(size, size).png().toFile(resolve(outputDir, name));
  console.log(`✔ ${name}`);
}

const BLUE = { r: 29, g: 78, b: 216, alpha: 1 };
const FULL = 512;
const INNER = Math.round(FULL * 0.8);
const PAD = Math.round((FULL - INNER) / 2);

const innerBuffer = await sharp(svgContent).resize(INNER, INNER).png().toBuffer();

await sharp({ create: { width: FULL, height: FULL, channels: 4, background: BLUE } })
  .composite([{ input: innerBuffer, top: PAD, left: PAD }])
  .png()
  .toFile(resolve(outputDir, 'pwa-512x512-maskable.png'));

console.log('✔ pwa-512x512-maskable.png');
