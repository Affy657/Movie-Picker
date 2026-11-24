import qrcode from 'qrcode-generator';
import { BRAND_COLORS, CLAP, renderClapShapes } from '@/shared/brand/brandArt';

export const QR_COLORS = {
  paper: BRAND_COLORS.ink,
  ink: BRAND_COLORS.tile,
  accent: BRAND_COLORS.clap,
} as const;

const QUIET_ZONE = 4;
const PLAIN_QUIET_ZONE = 0;
const FINDER_SPAN = 7;
const ALIGNMENT_SPAN = 5;
const LOGO_MODULES = 8;
const LOGO_CLEARING = 9;
const FIRST_VERSION_WITH_LOGO = 3;
const LAST_VERSION_WITH_LOGO = 6;
const TILE_SIZE = 0.88;
const TILE_RADIUS = 0.22;
const EYE_RADIUS = 1.4;
const PUPIL_RADIUS = 0.7;
const ALIGNMENT_RADIUS = 1;
const ALIGNMENT_PUPIL_RADIUS = 0.22;
const CARD_RADIUS = 3.2;

const utf8 = new TextEncoder();

qrcode.stringToBytes = (text: string) => Array.from(utf8.encode(text));

export type QrShapeOptions = { plain?: boolean };

export type QrShapes = {
  modules: number;
  version: number;
  viewBox: string;
  card: { x: number; y: number; size: number; radius: number };
  tiles: string;
  eyeRings: string;
  eyePupils: string;
  alignmentRing: string | null;
  alignmentPupil: string | null;
  logoTransform: string | null;
  isDark: (row: number, col: number) => boolean;
  isCleared: (row: number, col: number) => boolean;
};

const rounded = (value: number) => Number(value.toFixed(3));

function roundedSquare(x: number, y: number, size: number, radius: number): string {
  const r = Math.min(radius, size / 2);
  const end = x + size;
  const bottom = y + size;
  const arc = `A${r} ${r} 0 0 1`;
  return (
    `M${rounded(x + r)} ${rounded(y)}H${rounded(end - r)}${arc} ${rounded(end)} ${rounded(y + r)}` +
    `V${rounded(bottom - r)}${arc} ${rounded(end - r)} ${rounded(bottom)}` +
    `H${rounded(x + r)}${arc} ${rounded(x)} ${rounded(bottom - r)}` +
    `V${rounded(y + r)}${arc} ${rounded(x + r)} ${rounded(y)}Z`
  );
}

function ring(x: number, y: number, size: number, radius: number): string {
  return (
    roundedSquare(x, y, size, radius) +
    roundedSquare(x + 1, y + 1, size - 2, Math.max(radius - 1, 0))
  );
}

function clapViewBox(): { origin: number; size: number } {
  const [origin = 0, , size = 1] = CLAP.viewBox.split(' ').map(Number);
  return { origin, size };
}

function dataTiles(n: number, drawn: (row: number, col: number) => boolean): string {
  const inset = (1 - TILE_SIZE) / 2;
  let tiles = '';
  for (let row = 0; row < n; row += 1) {
    for (let col = 0; col < n; col += 1) {
      if (drawn(row, col)) tiles += roundedSquare(col + inset, row + inset, TILE_SIZE, TILE_RADIUS);
    }
  }
  return tiles;
}

const BRANDED_STYLE = { level: 'H', quiet: QUIET_ZONE, radius: CARD_RADIUS, logo: true } as const;
const PLAIN_STYLE = { level: 'M', quiet: PLAIN_QUIET_ZONE, radius: 0, logo: false } as const;

export function qrShapes(value: string, { plain = false }: QrShapeOptions = {}): QrShapes {
  const style = plain ? PLAIN_STYLE : BRANDED_STYLE;
  const qr = qrcode(0, style.level);
  qr.addData(value);
  qr.make();
  const n = qr.getModuleCount();
  const version = (n - 17) / 4;
  const quiet = style.quiet;
  const hasLogo =
    style.logo && version >= FIRST_VERSION_WITH_LOGO && version <= LAST_VERSION_WITH_LOGO;
  const logoStart = (n - LOGO_CLEARING) / 2;
  const alignmentCenter = version >= 2 ? n - FINDER_SPAN : null;

  const isDark = (row: number, col: number) =>
    row >= 0 && col >= 0 && row < n && col < n && qr.isDark(row, col);
  const inFinder = (row: number, col: number) =>
    (row < FINDER_SPAN && col < FINDER_SPAN) ||
    (row < FINDER_SPAN && col >= n - FINDER_SPAN) ||
    (row >= n - FINDER_SPAN && col < FINDER_SPAN);
  const inAlignment = (row: number, col: number) =>
    alignmentCenter !== null &&
    Math.abs(row - alignmentCenter) <= 2 &&
    Math.abs(col - alignmentCenter) <= 2;
  const isCleared = (row: number, col: number) =>
    hasLogo &&
    row >= logoStart &&
    row < logoStart + LOGO_CLEARING &&
    col >= logoStart &&
    col < logoStart + LOGO_CLEARING;

  const tiles = dataTiles(
    n,
    (row, col) =>
      isDark(row, col) && !inFinder(row, col) && !inAlignment(row, col) && !isCleared(row, col)
  );

  const finders = [
    [0, 0],
    [0, n - FINDER_SPAN],
    [n - FINDER_SPAN, 0],
  ] as const;
  const eyeRings = finders.map(([row, col]) => ring(col, row, FINDER_SPAN, EYE_RADIUS)).join('');
  const eyePupils = finders
    .map(([row, col]) => roundedSquare(col + 2, row + 2, 3, PUPIL_RADIUS))
    .join('');

  const alignmentStart = alignmentCenter === null ? null : alignmentCenter - 2;
  const { origin, size } = clapViewBox();
  const logoScale = LOGO_MODULES / size;
  const logoOffset = logoStart + (LOGO_CLEARING - LOGO_MODULES) / 2;

  return {
    modules: n,
    version,
    viewBox: `${-quiet} ${-quiet} ${n + quiet * 2} ${n + quiet * 2}`,
    card: { x: -quiet, y: -quiet, size: n + quiet * 2, radius: style.radius },
    tiles,
    eyeRings,
    eyePupils,
    alignmentRing:
      alignmentStart === null
        ? null
        : ring(alignmentStart, alignmentStart, ALIGNMENT_SPAN, ALIGNMENT_RADIUS),
    alignmentPupil:
      alignmentStart === null
        ? null
        : roundedSquare(alignmentStart + 2, alignmentStart + 2, 1, ALIGNMENT_PUPIL_RADIUS),
    logoTransform: hasLogo
      ? `translate(${rounded(logoOffset)} ${rounded(logoOffset)}) scale(${rounded(logoScale)}) translate(${-origin} ${-origin})`
      : null,
    isDark,
    isCleared,
  };
}

const fill = (color: string) => `fill="${color}"`;

export function qrSvgMarkup(shapes: QrShapes, pixelSize: number): string {
  const { card } = shapes;
  const alignment =
    shapes.alignmentRing && shapes.alignmentPupil
      ? `<path d="${shapes.alignmentRing}" fill-rule="evenodd" ${fill(QR_COLORS.ink)}/>` +
        `<path d="${shapes.alignmentPupil}" ${fill(QR_COLORS.ink)}/>`
      : '';
  const logo = shapes.logoTransform
    ? `<g transform="${shapes.logoTransform}">${renderClapShapes(QR_COLORS.accent)}</g>`
    : '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${shapes.viewBox}" width="${pixelSize}" height="${pixelSize}" shape-rendering="geometricPrecision">` +
    `<rect x="${card.x}" y="${card.y}" width="${card.size}" height="${card.size}" rx="${card.radius}" ${fill(QR_COLORS.paper)}/>` +
    `<path d="${shapes.tiles}" ${fill(QR_COLORS.ink)}/>` +
    `<path d="${shapes.eyeRings}" fill-rule="evenodd" ${fill(QR_COLORS.accent)}/>` +
    `<path d="${shapes.eyePupils}" ${fill(QR_COLORS.accent)}/>` +
    alignment +
    logo +
    `</svg>`
  );
}

export function qrSvgDataUrl(
  value: string,
  pixelSize: number,
  options: QrShapeOptions = {}
): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrSvgMarkup(qrShapes(value, options), pixelSize))}`;
}
