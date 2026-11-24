import { describe, it, expect } from 'vitest';
import jsQR from 'jsqr';
import {
  qrShapes,
  qrSvgDataUrl,
  qrSvgMarkup,
  type QrShapes,
} from '@/shared/components/qrCodeShapes';

const EVENT_URL = 'https://movie-picker.fr/e/qoU5jcDVXC';

function tileCount(path: string): number {
  return path.split('Z').filter(Boolean).length;
}

const PIXELS_PER_MODULE = 4;
const DECODE_QUIET_ZONE = 4;

function scanWithEveryClearedModuleWrong(shapes: QrShapes) {
  const side = (shapes.modules + DECODE_QUIET_ZONE * 2) * PIXELS_PER_MODULE;
  const pixels = new Uint8ClampedArray(side * side * 4).fill(255);
  for (let row = 0; row < shapes.modules; row += 1) {
    for (let col = 0; col < shapes.modules; col += 1) {
      const dark = shapes.isCleared(row, col) ? !shapes.isDark(row, col) : shapes.isDark(row, col);
      if (!dark) continue;
      for (let dy = 0; dy < PIXELS_PER_MODULE; dy += 1) {
        for (let dx = 0; dx < PIXELS_PER_MODULE; dx += 1) {
          const y = (row + DECODE_QUIET_ZONE) * PIXELS_PER_MODULE + dy;
          const x = (col + DECODE_QUIET_ZONE) * PIXELS_PER_MODULE + dx;
          const index = (y * side + x) * 4;
          pixels[index] = 0;
          pixels[index + 1] = 0;
          pixels[index + 2] = 0;
        }
      }
    }
  }
  return jsQR(pixels, side, side);
}

describe('qrShapes', () => {
  it('draws one square tile per dark data module and leaves the middle to the clap', () => {
    const shapes = qrShapes(EVENT_URL);
    const n = shapes.modules;
    let dataModules = 0;
    let cleared = 0;
    for (let row = 0; row < n; row += 1) {
      for (let col = 0; col < n; col += 1) {
        const finder =
          (row < 7 && col < 7) || (row < 7 && col >= n - 7) || (row >= n - 7 && col < 7);
        const alignment = Math.abs(row - (n - 7)) <= 2 && Math.abs(col - (n - 7)) <= 2;
        if (!shapes.isDark(row, col) || finder || alignment) continue;
        if (shapes.isCleared(row, col)) cleared += 1;
        else dataModules += 1;
      }
    }

    expect(shapes.version).toBe(5);
    expect(tileCount(shapes.tiles)).toBe(dataModules);
    expect(cleared).toBeGreaterThan(0);
    expect(shapes.logoTransform).not.toBeNull();
  });

  it('keeps a quiet zone of four modules around the code', () => {
    const shapes = qrShapes(EVENT_URL);

    expect(shapes.viewBox).toBe(`-4 -4 ${shapes.modules + 8} ${shapes.modules + 8}`);
  });

  it('leaves the middle alone when the code is too large to clear it safely', () => {
    const shapes = qrShapes(`https://movie-picker.fr/u/${'a'.repeat(60)}`);

    expect(shapes.version).toBeGreaterThan(6);
    expect(shapes.logoTransform).toBeNull();
    expect(shapes.isCleared(shapes.modules / 2, shapes.modules / 2)).toBe(false);
  });
});

describe('qrSvgMarkup', () => {
  it('draws the same shapes as the component, at the asked pixel size', () => {
    const shapes = qrShapes(EVENT_URL);
    const markup = qrSvgMarkup(shapes, 1200);

    expect(markup).toContain('width="1200" height="1200"');
    expect(markup).toContain(shapes.tiles);
    expect(markup).toContain(shapes.eyeRings);
    expect(markup).toContain(`<g transform="${shapes.logoTransform}">`);
  });

  it('wraps the drawing in a data URL an image can load', () => {
    expect(qrSvgDataUrl(EVENT_URL, 600)).toMatch(/^data:image\/svg\+xml;charset=utf-8,%3Csvg/);
  });
});

describe('reading the code back', () => {
  it.each([
    ['https://movie-picker.fr', 3],
    ['https://movie-picker.fr/e/abcd', 4],
    ['https://movie-picker.fr/e/qoU5jcDVXC', 5],
    [`https://movie-picker.fr/u/${'a'.repeat(25)}`, 6],
  ])(
    'decodes %s (version %i) even when every module under the clap reads wrong',
    (value, version) => {
      const shapes = qrShapes(value);

      expect(shapes.version).toBe(version);
      expect(shapes.logoTransform).not.toBeNull();
      expect(scanWithEveryClearedModuleWrong(shapes)?.data).toBe(value);
    }
  );

  it('encodes accented text as UTF-8', () => {
    const value = 'https://movie-picker.fr/u/élodie';

    const decoded = scanWithEveryClearedModuleWrong(qrShapes(value));

    expect(decoded?.binaryData).toEqual([...new TextEncoder().encode(value)]);
    expect(decoded?.data).toBe(value);
  });
});

describe('plain code', () => {
  it('drops the clap, the quiet zone and the high correction to stay readable when tiny', () => {
    const branded = qrShapes('https://movie-picker.fr');
    const plain = qrShapes('https://movie-picker.fr', { plain: true });

    expect(plain.logoTransform).toBeNull();
    expect(plain.modules).toBeLessThan(branded.modules);
    expect(plain.viewBox).toBe(`0 0 ${plain.modules} ${plain.modules}`);
    expect(scanWithEveryClearedModuleWrong(plain)?.data).toBe('https://movie-picker.fr');
  });
});
