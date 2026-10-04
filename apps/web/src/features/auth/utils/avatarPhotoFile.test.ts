import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AVATAR_PHOTO_OUTPUT_SIZE,
  checkAvatarPhotoFile,
  checkAvatarPhotoSize,
  loadAvatarPhoto,
  renderAvatarPhoto,
} from '@/features/auth/utils/avatarPhotoFile';

function file(type: string, bytes = 1024): File {
  return new File([new Uint8Array(bytes)], 'photo', { type });
}

describe('checkAvatarPhotoFile', () => {
  it.each(['image/jpeg', 'image/png', 'image/webp'])('accepts %s', (type) => {
    expect(checkAvatarPhotoFile(file(type))).toBeNull();
  });

  it.each(['image/gif', 'image/svg+xml', 'image/heic', 'application/pdf'])(
    'refuses the format %s',
    (type) => {
      expect(checkAvatarPhotoFile(file(type))).toBe('unsupported');
    }
  );

  it('lets a file without a declared type through, the browser decides when reading it', () => {
    expect(checkAvatarPhotoFile(file(''))).toBeNull();
  });

  it('refuses a file above 10 MB', () => {
    expect(checkAvatarPhotoFile(file('image/jpeg', 10 * 1024 * 1024 + 1))).toBe('tooLarge');
  });

  it('accepts a file of exactly 10 MB', () => {
    expect(checkAvatarPhotoFile(file('image/jpeg', 10 * 1024 * 1024))).toBeNull();
  });
});

describe('checkAvatarPhotoSize', () => {
  it('accepts 128 pixels on the short side', () => {
    expect(checkAvatarPhotoSize(128, 900)).toBeNull();
  });

  it('refuses under 128 pixels on either side', () => {
    expect(checkAvatarPhotoSize(127, 900)).toBe('tooSmall');
    expect(checkAvatarPhotoSize(900, 127)).toBe('tooSmall');
  });
});

describe('renderAvatarPhoto', () => {
  afterEach(() => vi.restoreAllMocks());

  function mockCanvas(blobFor: (type: string) => Blob | null) {
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage,
      imageSmoothingQuality: 'low',
    } as unknown as CanvasRenderingContext2D);
    const toBlob = vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (
      this: HTMLCanvasElement,
      callback,
      type
    ) {
      callback(blobFor(type ?? 'image/png'));
    });
    return { drawImage, toBlob };
  }

  it('draws the cropped square at 256 pixels and encodes it in WebP', async () => {
    const { drawImage } = mockCanvas((type) => new Blob(['x'], { type }));
    const image = document.createElement('img');

    const blob = await renderAvatarPhoto(image, { x: 10, y: 20, size: 300 });

    expect(blob.type).toBe('image/webp');
    expect(drawImage).toHaveBeenCalledWith(
      image,
      10,
      20,
      300,
      300,
      0,
      0,
      AVATAR_PHOTO_OUTPUT_SIZE,
      AVATAR_PHOTO_OUTPUT_SIZE
    );
  });

  it('falls back to JPEG where the browser cannot encode WebP', async () => {
    const { toBlob } = mockCanvas(
      (type) => new Blob(['x'], { type: type === 'image/webp' ? 'image/png' : type })
    );

    const blob = await renderAvatarPhoto(document.createElement('img'), { x: 0, y: 0, size: 300 });

    expect(blob.type).toBe('image/jpeg');
    expect(toBlob).toHaveBeenCalledTimes(2);
  });

  it('fails when the browser cannot draw', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);

    await expect(
      renderAvatarPhoto(document.createElement('img'), { x: 0, y: 0, size: 300 })
    ).rejects.toThrow();
  });
});

describe('loadAvatarPhoto', () => {
  const RealImage = globalThis.Image;

  afterEach(() => {
    globalThis.Image = RealImage;
    vi.restoreAllMocks();
  });

  function fakeImage(outcome: { width: number; height: number } | 'error') {
    globalThis.Image = class {
      naturalWidth = outcome === 'error' ? 0 : outcome.width;
      naturalHeight = outcome === 'error' ? 0 : outcome.height;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        queueMicrotask(() => (outcome === 'error' ? this.onerror?.() : this.onload?.()));
      }
    } as unknown as typeof Image;
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:photo');
    return vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  }

  it('gives the decoded photo with its size and its address', async () => {
    fakeImage({ width: 800, height: 600 });

    const photo = await loadAvatarPhoto(file('image/jpeg'));

    expect(photo).toMatchObject({ url: 'blob:photo', width: 800, height: 600 });
  });

  it('refuses a file the browser cannot decode and frees its address', async () => {
    const revoke = fakeImage('error');

    await expect(loadAvatarPhoto(file('image/jpeg'))).rejects.toMatchObject({
      reason: 'unsupported',
    });
    expect(revoke).toHaveBeenCalledWith('blob:photo');
  });

  it('refuses a photo under 128 pixels and frees its address', async () => {
    const revoke = fakeImage({ width: 100, height: 600 });

    await expect(loadAvatarPhoto(file('image/png'))).rejects.toMatchObject({ reason: 'tooSmall' });
    expect(revoke).toHaveBeenCalledWith('blob:photo');
  });
});
