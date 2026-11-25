import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import PosterBackdrop from './PosterBackdrop';

describe('PosterBackdrop', () => {
  it('keeps the scrim without a poster', () => {
    const { container } = render(<PosterBackdrop posterPath={null} />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('blurs the poster into a decorative glow', () => {
    const { container } = render(<PosterBackdrop posterPath="/p/cars.jpg" glow />);
    const glow = container.firstElementChild;
    expect(glow).toHaveAttribute('aria-hidden', 'true');
    expect(glow?.querySelector('img')?.getAttribute('src')).toContain('cars.jpg');
    expect(glow?.querySelector('img')).toHaveAttribute('alt', '');
  });

  it('blurs the smallest poster the relay serves, behind the page as in a glow', () => {
    const relayed = '/api/v1/posters/tmdb/w500/cars.jpg';
    const { container: backdrop } = render(<PosterBackdrop posterPath={relayed} />);
    const { container: glow } = render(<PosterBackdrop posterPath={relayed} glow />);

    for (const image of [backdrop.querySelector('img'), glow.querySelector('img')]) {
      expect(image?.getAttribute('src')).toMatch(/\/api\/v1\/posters\/tmdb\/w92\/cars\.jpg$/);
    }
  });

  it('draws no glow without a poster', () => {
    const { container } = render(<PosterBackdrop posterPath={null} glow />);
    expect(container).toBeEmptyDOMElement();
  });
});
