import { describe, expect, it } from 'vitest';

import {
  isSafeTmdbLogoUrl,
  tmdbLogoSrcForUi,
  toAbsoluteTmdbLogoUrl,
} from '@/shared/utils/tmdbLogo';

describe('toAbsoluteTmdbLogoUrl', () => {
  it('returns the trimmed value for blank input', () => {
    expect(toAbsoluteTmdbLogoUrl('   ')).toBe('');
  });

  it('keeps an already-absolute TMDB url', () => {
    expect(toAbsoluteTmdbLogoUrl('https://image.tmdb.org/t/p/w45/x.png')).toBe(
      'https://image.tmdb.org/t/p/w45/x.png'
    );
  });

  it('prefixes protocol-relative urls', () => {
    expect(toAbsoluteTmdbLogoUrl('//image.tmdb.org/x.png')).toBe('https://image.tmdb.org/x.png');
  });

  it('prefixes root-relative paths with the TMDB host', () => {
    expect(toAbsoluteTmdbLogoUrl('/t/p/w45/x.png')).toBe('https://image.tmdb.org/t/p/w45/x.png');
  });

  it('upgrades an http TMDB url to https', () => {
    expect(toAbsoluteTmdbLogoUrl('http://image.tmdb.org/t/p/w45/x.png')).toBe(
      'https://image.tmdb.org/t/p/w45/x.png'
    );
  });

  it('leaves unrelated hosts and unparseable values untouched', () => {
    expect(toAbsoluteTmdbLogoUrl('https://example.com/x.png')).toBe('https://example.com/x.png');
    expect(toAbsoluteTmdbLogoUrl('not a url')).toBe('not a url');
  });
});

describe('isSafeTmdbLogoUrl', () => {
  it('rejects null', () => {
    expect(isSafeTmdbLogoUrl(null)).toBe(false);
  });

  it('accepts a TMDB https url', () => {
    expect(isSafeTmdbLogoUrl('/t/p/w45/x.png')).toBe(true);
  });

  it('rejects non-TMDB and malformed urls', () => {
    expect(isSafeTmdbLogoUrl('https://evil.example.com/x.png')).toBe(false);
    expect(isSafeTmdbLogoUrl('::::')).toBe(false);
  });
});

describe('tmdbLogoSrcForUi', () => {
  it('rewrites the size segment to w154', () => {
    expect(tmdbLogoSrcForUi('https://image.tmdb.org/t/p/w500/x.png')).toBe(
      'https://image.tmdb.org/t/p/w154/x.png'
    );
  });

  it('returns the absolute url for a non-TMDB host', () => {
    expect(tmdbLogoSrcForUi('https://example.com/x.png')).toBe('https://example.com/x.png');
  });
});
