import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadStoryAssets, svgElementToImage } from './storyAssets';

const loadedSrc: string[] = [];
const fetchedSrc: string[] = [];
const fetchedInit: Array<RequestInit | undefined> = [];
let failingSrc: string[] = [];

class FakeImage {
  private listeners = new Map<string, () => void>();
  addEventListener(type: string, listener: () => void) {
    this.listeners.set(type, listener);
  }
  set src(value: string) {
    loadedSrc.push(value);
    queueMicrotask(() => this.listeners.get('load')?.());
  }
}

const revoked: string[] = [];

beforeEach(() => {
  loadedSrc.length = 0;
  fetchedSrc.length = 0;
  fetchedInit.length = 0;
  revoked.length = 0;
  failingSrc = [];
  vi.stubGlobal('Image', FakeImage);
  vi.stubGlobal(
    'fetch',
    vi.fn(async (src: string, init?: RequestInit) => {
      fetchedSrc.push(src);
      fetchedInit.push(init);
      if (failingSrc.some((failing) => src.includes(failing)))
        throw new TypeError('Failed to fetch');
      return {
        ok: !src.includes('missing'),
        mode: init?.mode,
        text: async () => '<svg viewBox="0 0 200 200"></svg>',
        blob: async () => new Blob(['jpeg'], { type: 'image/jpeg' }),
      };
    })
  );
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: vi.fn(() => 'blob:story'),
    revokeObjectURL: vi.fn((url: string) => revoked.push(url)),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('loadStoryAssets', () => {
  it('fetches a poster rather than reusing the image cache of the page', async () => {
    const assets = await loadStoryAssets(['https://api.movie-picker.fr/api/v1/posters/abc']);

    expect(assets.size).toBe(1);
    expect(fetchedSrc).toEqual(['https://api.movie-picker.fr/api/v1/posters/abc']);
    expect(fetchedInit[0]).toMatchObject({ mode: 'cors', cache: 'reload' });
    expect(loadedSrc).toEqual(['blob:story']);
  });

  it('gives an avatar its intrinsic size before drawing it', async () => {
    const assets = await loadStoryAssets([
      'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=a',
    ]);

    expect(assets.size).toBe(1);
    expect(loadedSrc).toEqual(['blob:story']);
    expect(revoked).toEqual(['blob:story']);
  });

  it('loads each source once', async () => {
    await loadStoryAssets(['/p.jpg', '/p.jpg']);

    expect(fetchedSrc).toEqual(['/p.jpg']);
  });

  it('leaves out what the browser refuses to read', async () => {
    failingSrc = ['/broken.jpg'];

    const assets = await loadStoryAssets(['/broken.jpg', '/ok.jpg']);

    expect(assets.has('/broken.jpg')).toBe(false);
    expect(assets.has('/ok.jpg')).toBe(true);
  });

  it('leaves out a vector that does not answer', async () => {
    const assets = await loadStoryAssets(['/missing.svg']);

    expect(assets.size).toBe(0);
  });

  it('reuses across stories what it already loaded', async () => {
    const shared = new Map<string, Promise<CanvasImageSource | null>>();

    await loadStoryAssets(['/avatar.svg', '/p1.jpg'], shared);
    const assets = await loadStoryAssets(['/avatar.svg', '/p2.jpg'], shared);

    expect(fetchedSrc).toEqual(['/avatar.svg', '/p1.jpg', '/p2.jpg']);
    expect(assets.has('/avatar.svg')).toBe(true);
  });

  it('gives a source that failed another chance', async () => {
    const shared = new Map<string, Promise<CanvasImageSource | null>>();
    failingSrc = ['/flaky.jpg'];

    await loadStoryAssets(['/flaky.jpg'], shared);
    failingSrc = [];
    const assets = await loadStoryAssets(['/flaky.jpg'], shared);

    expect(assets.has('/flaky.jpg')).toBe(true);
  });
});

describe('svgElementToImage', () => {
  it('draws the rendered qr code', async () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

    expect(await svgElementToImage(svg)).not.toBeNull();
    expect(loadedSrc).toEqual(['blob:story']);
  });

  it('has nothing to draw without a qr code', async () => {
    expect(await svgElementToImage(null)).toBeNull();
  });
});
