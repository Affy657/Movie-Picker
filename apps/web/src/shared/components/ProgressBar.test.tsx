import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProgressBar from '@/shared/components/ProgressBar';
import styles from '@/shared/components/ProgressBar.module.css';

function fillOf(container: HTMLElement): HTMLElement {
  const fill = container.querySelector<HTMLElement>(`.${styles.fill}`);
  if (!fill) throw new Error('no fill');
  return fill;
}

describe('ProgressBar', () => {
  it('fills the track up to the value and shows its label', () => {
    const { container } = render(<ProgressBar value={65} label="65 % vus" />);

    expect(screen.getByText('65 % vus')).toBeInTheDocument();
    expect(fillOf(container).style.getPropertyValue('--progress-value')).toBe('65%');
  });

  it('keeps the fill inside the track', () => {
    const { container, rerender } = render(<ProgressBar value={140} label="plein" />);
    expect(fillOf(container).style.getPropertyValue('--progress-value')).toBe('100%');

    rerender(<ProgressBar value={-5} label="vide" />);
    expect(fillOf(container).style.getPropertyValue('--progress-value')).toBe('0%');
  });

  it('fills with the accent colour when asked', () => {
    const { container } = render(<ProgressBar value={40} label="40" tone="primary" />);

    expect(fillOf(container).className).toContain(styles.primary);
  });

  it('leaves the bar out of the accessibility tree, the label saying it all', () => {
    const { container } = render(<ProgressBar value={50} label="5 sur 10" className="placed" />);

    expect(container.querySelector(`.${styles.track}`)).toHaveAttribute('aria-hidden', 'true');
    expect(container.firstElementChild?.className).toContain('placed');
  });
});
