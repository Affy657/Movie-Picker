import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { qrCardFileName, qrCardSpec, renderQrCardImage, siteOf } from './qrCardImage';

const sizes: Array<{ width: number; height: number; type?: string }> = [];

class LoadedImage {
  private listeners = new Map<string, () => void>();
  addEventListener(type: string, listener: () => void) {
    this.listeners.set(type, listener);
  }
  set src(_value: string) {
    queueMicrotask(() => this.listeners.get('load')?.());
  }
}

beforeEach(() => {
  sizes.length = 0;
  vi.stubGlobal('Image', LoadedImage);
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: false, text: async () => '' }))
  );
  HTMLCanvasElement.prototype.toBlob = function toBlob(callback: BlobCallback, type?: string) {
    sizes.push({ width: this.width, height: this.height, type });
    callback(new Blob(['png'], { type: type ?? 'image/png' }));
  };
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('qrCardSpec', () => {
  it('names the site without its protocol nor www', () => {
    const spec = qrCardSpec({
      title: 'Soirée du vendredi',
      detail: 'Jeudi 26 nov. à 20:30',
      url: 'https://www.movie-picker.fr/e/qoU5jcDVXC',
    });

    expect(spec.site).toBe('movie-picker.fr');
    expect(spec.qrSrc).toMatch(/^data:image\/svg\+xml/);
    expect(spec.wordmark.ratio).toBeGreaterThan(5);
  });

  it('keeps what it cannot read as a URL', () => {
    expect(siteOf('pas une url')).toBe('pas une url');
  });
});

describe('renderQrCardImage', () => {
  it('draws a 1080 by 1350 PNG', async () => {
    const blob = await renderQrCardImage(
      qrCardSpec({ title: 'Soirée', detail: 'Jeudi', url: 'https://movie-picker.fr/e/abc' })
    );

    expect(blob?.type).toBe('image/png');
    expect(sizes).toEqual([{ width: 1080, height: 1350, type: 'image/png' }]);
  });
});

describe('renderQrCardImage without its code', () => {
  it('fails instead of giving an image with no QR code', async () => {
    class BrokenImage {
      private listeners = new Map<string, () => void>();
      addEventListener(type: string, listener: () => void) {
        this.listeners.set(type, listener);
      }
      set src(_value: string) {
        queueMicrotask(() => this.listeners.get('error')?.());
      }
    }
    vi.stubGlobal('Image', BrokenImage);
    const spec = qrCardSpec({
      title: 'Soirée',
      detail: 'Jeudi',
      url: 'https://movie-picker.fr/e/abc',
    });

    await expect(renderQrCardImage(spec)).rejects.toThrow();
    expect(sizes).toEqual([]);
  });
});

describe('qrCardFileName', () => {
  it('names the file after the link', () => {
    expect(qrCardFileName('qoU5jcDVXC')).toBe('movie-picker-qr-qoU5jcDVXC.png');
  });
});
