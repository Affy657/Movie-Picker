import { describe, expect, it } from 'vitest';
import { entryOriginOf } from '@/shared/analytics/entryOrigin';

describe('entryOriginOf', () => {
  it.each([
    ['/e/abc123', 'event'],
    ['/e/abc123?rate', 'event'],
    ['/r/abc123', 'recap'],
    ['/l/token/rejoindre', 'list'],
    ['/u/ad0', 'profile'],
    ['/', 'other'],
    ['/films', 'other'],
    ['/e', 'other'],
    ['/e/', 'other'],
    ['https://evil.example/e/abc', 'other'],
    ['', 'other'],
    [null, 'other'],
  ])('reads %s as %s, like the server does', (returnTo, origin) => {
    expect(entryOriginOf(returnTo)).toBe(origin);
  });
});
