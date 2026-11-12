import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { BrandLoader } from '@/shared/brand/BrandLoader';
import { BrandMark } from '@/shared/brand/BrandMark';
import { BrandWordmark } from '@/shared/brand/BrandWordmark';
import { CLAP, WORDMARK, renderFaviconSvg, renderLogoSvg } from '@/shared/brand/brandArt';
import styles from '@/shared/brand/Brand.module.css';

import indexHtml from '../../../index.html?raw';
import faviconSvg from '../../../public/favicon.svg?raw';
import logoSvg from '../../../public/logo.svg?raw';

function pathData(root: ParentNode, selector: string): string[] {
  return [...root.querySelectorAll(selector)].map((element) => element.getAttribute('d') ?? '');
}

describe('brand art', () => {
  it('keeps the public logo and favicon generated from the brand source', () => {
    expect(logoSvg).toBe(renderLogoSvg());
    expect(faviconSvg).toBe(renderFaviconSvg());
  });

  it('paints the same clap and wordmark in the start shell as in the app', () => {
    const splash = new DOMParser()
      .parseFromString(indexHtml, 'text/html')
      .getElementById('splash')!;

    expect(pathData(splash, '.splash-mark path')).toEqual([CLAP.play, CLAP.stripes, CLAP.spark]);
    expect(splash.querySelector('.splash-bar')?.getAttribute('transform')).toBe(CLAP.barRest);
    expect(pathData(splash, '#splash-brand path')).toEqual([WORDMARK.movie, WORDMARK.picker]);
  });
});

describe('BrandMark', () => {
  it('is decorative and only animates on request', () => {
    const { container, rerender } = render(<BrandMark />);
    const svg = container.querySelector('svg')!;

    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).not.toHaveClass(styles.animated!);
    expect(container.querySelector(`.${styles.spark}`)).toBeNull();

    rerender(<BrandMark animation="loop" />);
    expect(svg).toHaveClass(styles.animated!);
    expect(svg).not.toHaveClass(styles.once!);
    expect(container.querySelector(`.${styles.spark}`)).not.toBeNull();
  });

  it('plays a single clap and reports when it is over', () => {
    const onAnimationEnd = vi.fn();
    const { container } = render(<BrandMark animation="once" onAnimationEnd={onAnimationEnd} />);
    const svg = container.querySelector('svg')!;

    expect(svg).toHaveClass(styles.animated!, styles.once!);
    expect(container.querySelector(`.${styles.spark}`)).not.toBeNull();

    fireEvent.animationEnd(container.querySelector(`.${styles.bar}`)!);
    expect(onAnimationEnd).toHaveBeenCalled();
  });
});

describe('BrandWordmark', () => {
  it('draws both words and the two dots without exposing them to assistive tech', () => {
    const { container } = render(<BrandWordmark />);
    const svg = container.querySelector('svg')!;

    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(pathData(svg, 'path')).toEqual([WORDMARK.movie, WORDMARK.picker]);
    expect(svg.querySelectorAll('circle')).toHaveLength(2);
  });
});

describe('BrandLoader', () => {
  it('announces the loading label next to the animated clap', () => {
    render(<BrandLoader label="Chargement…" />);

    expect(screen.getByRole('status')).toHaveTextContent('Chargement…');
  });
});
