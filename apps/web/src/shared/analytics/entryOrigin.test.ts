import { describe, expect, it } from 'vitest';
import { entryOriginOf } from '@/shared/analytics/entryOrigin';

describe('entryOriginOf', () => {
  it.each([
    ['/e/abc123', 'event'],
    ['/e/abc123?rate', 'event'],
    ['/r/abc123', 'recap'],
    ['/l/token/rejoindre', 'list'],
    ['/u/ad0', 'profile'],
    ['/new?from=recap', 'recap'],
    ['/new?step=2&from=list', 'list'],
    ['/e/abc123?from=recap', 'event'],
    ['/new?from=other', 'other'],
    ['/new?from=elsewhere', 'other'],
    ['/new?source=recap', 'other'],
    ['https://evil.example/new?from=recap', 'other'],
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
