import { describe, expect, it } from 'vitest';
import { REDACTED_QUERY_VALUE, redactSensitiveUrl } from '@/shared/utils/sensitiveUrl';

describe('redactSensitiveUrl', () => {
  it('masks the reset token, the host token and the API key, whatever their case', () => {
    expect(redactSensitiveUrl('https://www.movie-picker.fr/reset?token=abc123')).toBe(
      `https://www.movie-picker.fr/reset?token=${REDACTED_QUERY_VALUE}`
    );
    expect(redactSensitiveUrl('/e/Ab3dE_9xYz?Host=secret&tab=movies')).toBe(
      `/e/Ab3dE_9xYz?Host=${REDACTED_QUERY_VALUE}&tab=movies`
    );
    expect(redactSensitiveUrl('/x?api_key=k&token=t')).toBe(
      `/x?api_key=${REDACTED_QUERY_VALUE}&token=${REDACTED_QUERY_VALUE}`
    );
  });

  it('keeps the other parameters and the fragment untouched', () => {
    expect(redactSensitiveUrl('/reset?lang=fr&token=abc#form')).toBe(
      `/reset?lang=fr&token=${REDACTED_QUERY_VALUE}#form`
    );
  });

  it('reads a percent-encoded key the way the server decodes it, and keeps its original spelling', () => {
    expect(redactSensitiveUrl('/reset?to%6Ben=abc123')).toBe(
      `/reset?to%6Ben=${REDACTED_QUERY_VALUE}`
    );
    expect(redactSensitiveUrl('/e/Ab3dE_9xYz?%68%6F%73%74=secret&tab=movies')).toBe(
      `/e/Ab3dE_9xYz?%68%6F%73%74=${REDACTED_QUERY_VALUE}&tab=movies`
    );
    expect(redactSensitiveUrl('/x?API%5FKEY=k')).toBe(`/x?API%5FKEY=${REDACTED_QUERY_VALUE}`);
  });

  it('keeps a key whose encoding is malformed, or that only decodes to a lookalike, as is', () => {
    expect(redactSensitiveUrl('/x?tok%en=abc&%E0%A4%A=1')).toBe('/x?tok%en=abc&%E0%A4%A=1');
    expect(redactSensitiveUrl('/x?to+ken=abc&token%20=abc')).toBe('/x?to+ken=abc&token%20=abc');
  });

  it('masks the list invitation token in the path of the join page, relative or absolute', () => {
    expect(redactSensitiveUrl('/l/7xK2pQ/rejoindre')).toBe(`/l/${REDACTED_QUERY_VALUE}/rejoindre`);
    expect(redactSensitiveUrl('https://www.movie-picker.fr/L/7xK2pQ/rejoindre?lang=fr#top')).toBe(
      `https://www.movie-picker.fr/L/${REDACTED_QUERY_VALUE}/rejoindre?lang=fr#top`
    );
    expect(redactSensitiveUrl('/l/7xK2pQ')).toBe(`/l/${REDACTED_QUERY_VALUE}`);
  });

  it('masks the list invitation token in the API route of the preview and of the join', () => {
    expect(redactSensitiveUrl('https://api.movie-picker.fr/api/v1/lists/join/7xK2pQ')).toBe(
      `https://api.movie-picker.fr/api/v1/lists/join/${REDACTED_QUERY_VALUE}`
    );
    expect(redactSensitiveUrl('POST /api/v1/lists/join/7xK2pQ?x=1')).toBe(
      `POST /api/v1/lists/join/${REDACTED_QUERY_VALUE}?x=1`
    );
    expect(redactSensitiveUrl('GET https://api.movie-picker.fr/api/v1/lists/join/7xK2pQ')).toBe(
      `GET https://api.movie-picker.fr/api/v1/lists/join/${REDACTED_QUERY_VALUE}`
    );
  });

  it('masks a returnTo that leads back to a token, and keeps the others', () => {
    expect(redactSensitiveUrl('/login?returnTo=%2Fl%2F7xK2pQ%2Frejoindre')).toBe(
      `/login?returnTo=${REDACTED_QUERY_VALUE}`
    );
    expect(
      redactSensitiveUrl(
        'https://api.movie-picker.fr/api/v1/auth/oauth/google/start?returnTo=%2Freset%3Ftoken%3Dabc'
      )
    ).toBe(
      `https://api.movie-picker.fr/api/v1/auth/oauth/google/start?returnTo=${REDACTED_QUERY_VALUE}`
    );
    expect(
      redactSensitiveUrl('/register?returnTo=%2Flogin%3FreturnTo%3D%252Fl%252F7xK2pQ%252Frejoindre')
    ).toBe(`/register?returnTo=${REDACTED_QUERY_VALUE}`);
    expect(redactSensitiveUrl('/login?returnTo=%2Flistes%2Fl1')).toBe(
      '/login?returnTo=%2Flistes%2Fl1'
    );
  });

  it('leaves the paths that only look like an invitation untouched', () => {
    expect(redactSensitiveUrl('/listes/l1')).toBe('/listes/l1');
    expect(redactSensitiveUrl('/u/lea/listes/l1')).toBe('/u/lea/listes/l1');
    expect(redactSensitiveUrl('https://image.tmdb.org/t/p/w500/l/abc.jpg')).toBe(
      'https://image.tmdb.org/t/p/w500/l/abc.jpg'
    );
    expect(redactSensitiveUrl('/api/v1/lists/l1/members')).toBe('/api/v1/lists/l1/members');
    expect(redactSensitiveUrl('Ciné l/abc')).toBe('Ciné l/abc');
  });

  it('returns a URL without query string, or without sensitive key, as is', () => {
    expect(redactSensitiveUrl('https://www.movie-picker.fr/e/Ab3dE_9xYz')).toBe(
      'https://www.movie-picker.fr/e/Ab3dE_9xYz'
    );
    expect(redactSensitiveUrl('/search?q=token')).toBe('/search?q=token');
    expect(redactSensitiveUrl('/page#token=abc')).toBe('/page#token=abc');
  });
});
