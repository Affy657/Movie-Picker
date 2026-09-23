import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import BackLink from '@/shared/components/BackLink';
import styles from '@/shared/components/BackLink.module.css';

describe('BackLink', () => {
  it('renders a link back to a route, its label nudged as capitals without descender', () => {
    render(
      <MemoryRouter>
        <BackLink to="/my-events">Mes soirées</BackLink>
      </MemoryRouter>
    );

    const link = screen.getByRole('link', { name: 'Mes soirées' });
    expect(link).toHaveAttribute('href', '/my-events');
    expect(link.className).toContain(styles.root);
    expect(screen.getByText('Mes soirées').className.split(' ').sort()).toEqual(
      [styles.label, styles.labelCaps].sort()
    );
  });

  it('renders a button that goes back in history when it has no route', async () => {
    const onClick = vi.fn();
    render(<BackLink onClick={onClick}>Retour</BackLink>);

    await userEvent.click(screen.getByRole('button', { name: 'Retour' }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Retour').className.split(' ').sort()).toEqual(
      [styles.label, styles.labelCaps].sort()
    );
  });

  it('keeps the class of its caller for placement and nudges a label with a descender less', () => {
    render(
      <MemoryRouter>
        <BackLink to="/settings" className="placed">
          Ma page
        </BackLink>
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: 'Ma page' }).className).toContain('placed');
    expect(screen.getByText('Ma page').className).toBe(styles.label);
  });
});
