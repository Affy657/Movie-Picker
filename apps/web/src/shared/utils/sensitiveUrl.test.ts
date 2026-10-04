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

  it('returns a URL without query string, or without sensitive key, as is', () => {
    expect(redactSensitiveUrl('https://www.movie-picker.fr/e/Ab3dE_9xYz')).toBe(
      'https://www.movie-picker.fr/e/Ab3dE_9xYz'
    );
    expect(redactSensitiveUrl('/search?q=token')).toBe('/search?q=token');
    expect(redactSensitiveUrl('/page#token=abc')).toBe('/page#token=abc');
  });
});
