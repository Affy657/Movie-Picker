import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import CountBadge from '@/shared/components/CountBadge';
import styles from '@/shared/components/CountBadge.module.css';

describe('CountBadge', () => {
  it('shows the count on a filled primary pill by default', () => {
    render(<CountBadge value={3} data-testid="badge" />);

    const badge = screen.getByTestId('badge');
    expect(badge.textContent).toBe('3');
    expect(badge.className.split(' ').sort()).toEqual([styles.badge, styles.primary].sort());
  });

  it('takes the small size and the success or neutral tone', () => {
    render(
      <>
        <CountBadge value={1} size="sm" tone="success" data-testid="small" />
        <CountBadge value="9+" tone="neutral" data-testid="neutral" />
      </>
    );

    expect(screen.getByTestId('small').className).toContain(styles.sm);
    expect(screen.getByTestId('small').className).toContain(styles.success);
    expect(screen.getByTestId('neutral').className).toContain(styles.neutral);
    expect(screen.getByTestId('neutral').textContent).toBe('9+');
  });

  it('passes native attributes through, so a decorative count leaves the accessibility tree', () => {
    render(<CountBadge value={2} aria-hidden="true" className="placed" data-testid="badge" />);

    const badge = screen.getByTestId('badge');
    expect(badge).toHaveAttribute('aria-hidden', 'true');
    expect(badge.className).toContain('placed');
  });
});
