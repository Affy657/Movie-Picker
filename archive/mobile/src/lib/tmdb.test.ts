import { logoUrl, posterUrl } from './tmdb';

describe('tmdb helpers', () => {
  it('builds a poster URL', () => {
    expect(posterUrl('/abc.jpg')).toContain('/w342/abc.jpg');
    expect(posterUrl('/abc.jpg', 'w500')).toContain('/w500/abc.jpg');
  });

  it('handles missing leading slash', () => {
    expect(posterUrl('xyz.jpg')).toContain('/xyz.jpg');
  });

  it('returns null for empty input', () => {
    expect(posterUrl(null)).toBeNull();
    expect(posterUrl(undefined)).toBeNull();
  });

  it('builds a logo URL', () => {
    expect(logoUrl('/netflix.png')).toContain('/w45/netflix.png');
  });
});
