import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  BANNER_PHOTO_MAX_OUTPUT_BYTES,
  BANNER_PHOTO_OUTPUT,
  checkBannerPhotoSize,
  renderBannerPhoto,
} from '@/features/profile/utils/bannerPhotoFile';

describe('checkBannerPhotoSize', () => {
  it('accepts 1280 by 720 pixels and more', () => {
    expect(checkBannerPhotoSize(1280, 720)).toBeNull();
    expect(checkBannerPhotoSize(4000, 3000)).toBeNull();
  });

  it('refuses a narrower or a lower image', () => {
    expect(checkBannerPhotoSize(1279, 900)).toBe('tooSmall');
    expect(checkBannerPhotoSize(2000, 719)).toBe('tooSmall');
  });
});

describe('renderBannerPhoto', () => {
  afterEach(() => vi.restoreAllMocks());

  function mockCanvas(blobFor: (type: string, quality: number | undefined) => Blob | null) {
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage,
      imageSmoothingQuality: 'low',
    } as unknown as CanvasRenderingContext2D);
    const toBlob = vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (
      this: HTMLCanvasElement,
      callback,
      type,
      quality
    ) {
      callback(blobFor(type ?? 'image/png', quality as number | undefined));
    });
    return { drawImage, toBlob };
  }

  const rect = { x: 10, y: 20, width: 1600, height: 900 };

  it('draws the cropped area at 1600 by 900 and encodes it in WebP', async () => {
    const { drawImage } = mockCanvas((type) => new Blob(['x'], { type }));
    const image = document.createElement('img');

    const blob = await renderBannerPhoto(image, rect);

    expect(blob.type).toBe('image/webp');
    expect(drawImage).toHaveBeenCalledWith(
      image,
      10,
      20,
      1600,
      900,
      0,
      0,
      BANNER_PHOTO_OUTPUT.width,
      BANNER_PHOTO_OUTPUT.height
    );
  });

  it('lowers the quality until the image fits what the server accepts', async () => {
    const heavy = new Uint8Array(BANNER_PHOTO_MAX_OUTPUT_BYTES + 1);
    const { toBlob } = mockCanvas((type, quality) =>
      quality !== undefined && quality > 0.7
        ? new Blob([heavy], { type })
        : new Blob(['x'], { type })
    );

    const blob = await renderBannerPhoto(document.createElement('img'), rect);

    expect(blob.size).toBeLessThanOrEqual(BANNER_PHOTO_MAX_OUTPUT_BYTES);
    expect(toBlob.mock.calls.length).toBeGreaterThan(1);
  });

  it('falls back to JPEG where the browser cannot encode WebP', async () => {
    mockCanvas((type) => new Blob(['x'], { type: type === 'image/webp' ? 'image/png' : type }));

    const blob = await renderBannerPhoto(document.createElement('img'), rect);

    expect(blob.type).toBe('image/jpeg');
  });

  it('fails when no quality makes the image light enough', async () => {
    const heavy = new Uint8Array(BANNER_PHOTO_MAX_OUTPUT_BYTES + 1);
    mockCanvas((type) => new Blob([heavy], { type }));

    await expect(renderBannerPhoto(document.createElement('img'), rect)).rejects.toThrow();
  });
});
