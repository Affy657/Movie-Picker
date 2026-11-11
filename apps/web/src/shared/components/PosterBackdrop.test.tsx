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

  it('draws no glow without a poster', () => {
    const { container } = render(<PosterBackdrop posterPath={null} glow />);
    expect(container).toBeEmptyDOMElement();
  });
});
