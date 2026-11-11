import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BRAND_COLORS,
  renderAppIconSvg,
  renderFaviconSvg,
  renderLogoSvg,
} from '../src/shared/brand/brandArt.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, '../public');
const outputDir = resolve(publicDir, 'icons');

mkdirSync(outputDir, { recursive: true });

writeFileSync(resolve(publicDir, 'logo.svg'), renderLogoSvg());
console.log('✔ logo.svg');
writeFileSync(resolve(publicDir, 'favicon.svg'), renderFaviconSvg());
console.log('✔ favicon.svg');

const transparent = renderAppIconSvg({ scale: 1 });
const onTile = (scale) =>
  renderAppIconSvg({ scale, background: BRAND_COLORS.tile, clap: BRAND_COLORS.clapOnDark });

const icons = [
  { name: 'pwa-64x64.png', size: 64, svg: transparent },
  { name: 'pwa-192x192.png', size: 192, svg: transparent },
  { name: 'pwa-512x512.png', size: 512, svg: transparent },
  { name: 'apple-touch-icon.png', size: 180, svg: onTile(0.8) },
  { name: 'pwa-512x512-maskable.png', size: 512, svg: onTile(0.7) },
];

const rasterize = (svg, size) =>
  sharp(Buffer.from(svg), { density: (72 * size) / 64 })
    .resize(size, size)
    .png();

for (const { name, size, svg } of icons) {
  await rasterize(svg, size).toFile(resolve(outputDir, name));
  console.log(`✔ ${name}`);
}

const ICO_SIZES = [16, 32, 48];
const tabIcon = renderFaviconSvg();
const pngs = await Promise.all(ICO_SIZES.map((size) => rasterize(tabIcon, size).toBuffer()));
const header = Buffer.alloc(6 + 16 * pngs.length);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(pngs.length, 4);
let offset = header.length;
pngs.forEach((png, index) => {
  const entry = 6 + 16 * index;
  header.writeUInt8(ICO_SIZES[index], entry);
  header.writeUInt8(ICO_SIZES[index], entry + 1);
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(png.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += png.length;
});
writeFileSync(resolve(publicDir, 'favicon.ico'), Buffer.concat([header, ...pngs]));
console.log('✔ favicon.ico');
