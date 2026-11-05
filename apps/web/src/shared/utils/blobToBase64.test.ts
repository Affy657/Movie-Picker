import { describe, expect, it } from 'vitest';
import { blobToBase64 } from '@/shared/utils/blobToBase64';

describe('blobToBase64', () => {
  it('returns the content without the data URL prefix', async () => {
    await expect(blobToBase64(new Blob(['hello'], { type: 'image/webp' }))).resolves.toBe(
      'aGVsbG8='
    );
  });

  it('reads a file the same way', async () => {
    await expect(
      blobToBase64(new File(['hello'], 'shot.png', { type: 'image/png' }))
    ).resolves.toBe('aGVsbG8=');
  });
});
