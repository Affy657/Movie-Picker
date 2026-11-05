import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderStoryImage } from './renderStoryImage';
import type { StoryImageSpec } from './storySpec';

const spec: StoryImageSpec = {
  layout: 'films',
  title: 'Soirée du vendredi',
  date: 'vendredi 18 septembre 2026 à 20h30',
  footer: 'Le recap et les notes de chacun',
  people: { label: '8 participants', avatars: [] },
  theme: null,
  films: [
    {
      title: 'Inception',
      year: '2010',
      posterSrc: null,
      ratingValue: 9,
      ratingText: '4,5/5',
      countText: '6 notes',
      fallbackText: 'Pas encore de note',
    },
  ],
  rows: [],
  moreText: null,
};

const sizes: Array<{ width: number; height: number }> = [];

beforeEach(() => {
  sizes.length = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: false, text: async () => '' }))
  );
  HTMLCanvasElement.prototype.toBlob = function toBlob(callback: BlobCallback, type?: string) {
    sizes.push({ width: this.width, height: this.height });
    callback(new Blob(['jpeg'], { type: type ?? 'image/png' }));
  };
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('renderStoryImage', () => {
  it('draws the story on a story sized canvas', async () => {
    const blob = await renderStoryImage(spec);

    expect(blob?.type).toBe('image/jpeg');
    expect(sizes).toEqual([{ width: 1080, height: 1920 }]);
  });

  it('has no image to give when the browser draws nothing', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);

    expect(await renderStoryImage(spec)).toBeNull();
  });
});
