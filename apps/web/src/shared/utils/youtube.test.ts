import { describe, expect, it } from 'vitest';

import { extractYouTubeId, youTubeEmbedUrl } from '@/shared/utils/youtube';

const VALID = 'dQw4w9WgXcQ';

describe('extractYouTubeId', () => {
  it('returns null for empty input', () => {
    expect(extractYouTubeId(null)).toBeNull();
    expect(extractYouTubeId(undefined)).toBeNull();
    expect(extractYouTubeId('')).toBeNull();
  });

  it('rejects non-https URLs', () => {
    expect(extractYouTubeId(`http://youtube.com/watch?v=${VALID}`)).toBeNull();
  });

  it('reads the v param on youtube.com/watch', () => {
    expect(extractYouTubeId(`https://www.youtube.com/watch?v=${VALID}`)).toBe(VALID);
    expect(extractYouTubeId(`https://m.youtube.com/watch?v=${VALID}`)).toBe(VALID);
  });

  it('returns null when watch has no v param', () => {
    expect(extractYouTubeId('https://youtube.com/watch')).toBeNull();
  });

  it('parses /embed/ and /v/ paths', () => {
    expect(extractYouTubeId(`https://www.youtube.com/embed/${VALID}`)).toBe(VALID);
    expect(extractYouTubeId(`https://www.youtube.com/v/${VALID}`)).toBe(VALID);
  });

  it('keeps only the first path segment as id', () => {
    expect(extractYouTubeId(`https://www.youtube.com/embed/${VALID}/extra`)).toBe(VALID);
  });

  it('parses youtu.be short links', () => {
    expect(extractYouTubeId(`https://youtu.be/${VALID}`)).toBe(VALID);
  });

  it('rejects ids that violate the allowed alphabet or length', () => {
    expect(extractYouTubeId('https://youtu.be/abc')).toBeNull();
    expect(extractYouTubeId('https://youtu.be/abc.def')).toBeNull();
  });

  it('returns null for unrelated hosts', () => {
    expect(extractYouTubeId(`https://vimeo.com/watch?v=${VALID}`)).toBeNull();
  });

  it('returns null for malformed URLs', () => {
    expect(extractYouTubeId('not a url')).toBeNull();
  });
});

describe('youTubeEmbedUrl', () => {
  it('builds an embed URL from a valid id', () => {
    expect(youTubeEmbedUrl(`https://youtu.be/${VALID}`)).toBe(
      `https://www.youtube.com/embed/${VALID}`
    );
  });

  it('returns null when no id can be extracted', () => {
    expect(youTubeEmbedUrl('https://vimeo.com/123')).toBeNull();
    expect(youTubeEmbedUrl(null)).toBeNull();
  });
});
