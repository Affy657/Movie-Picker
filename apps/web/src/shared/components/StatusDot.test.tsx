import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatusDot from '@/shared/components/StatusDot';
import styles from '@/shared/components/StatusDot.module.css';

describe('StatusDot', () => {
  it('is a decorative dot in the current colour', () => {
    render(<StatusDot data-testid="dot" />);

    const dot = screen.getByTestId('dot');
    expect(dot).toHaveAttribute('aria-hidden', 'true');
    expect(dot.className).toBe(styles.dot);
  });

  it('pulses when asked to', () => {
    render(<StatusDot pulsing data-testid="dot" />);

    expect(screen.getByTestId('dot').className).toContain(styles.pulsing);
  });
});
