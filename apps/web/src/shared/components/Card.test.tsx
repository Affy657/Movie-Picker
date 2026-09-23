import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter } from 'react-router';
import Card from '@/shared/components/Card';
import styles from '@/shared/components/Card.module.css';

describe('Card', () => {
  it('rend une div et conserve la classe fournie', () => {
    render(
      <Card className="extra" data-testid="c">
        Contenu
      </Card>
    );

    const card = screen.getByTestId('c');
    expect(card.tagName).toBe('DIV');
    expect(card.className).toContain('extra');
  });

  it('accepte une balise de remplacement et reste interactive', async () => {
    const onClick = vi.fn();
    render(
      <Card as="button" interactive padding="sm" onClick={onClick}>
        Ouvrir
      </Card>
    );

    await userEvent.click(screen.getByRole('button', { name: 'Ouvrir' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('sinks into its parent surface with surface="sunken"', () => {
    render(
      <Card surface="sunken" data-testid="card">
        Rappel
      </Card>
    );

    expect(screen.getByTestId('card').className).toContain(styles.sunken);
  });

  it('takes the props of the component it renders as, a router link for instance', () => {
    render(
      <MemoryRouter>
        <Card as={Link} to="/films/collection/10" interactive>
          Collection
        </Card>
      </MemoryRouter>
    );

    const link = screen.getByRole('link', { name: 'Collection' });
    expect(link).toHaveAttribute('href', '/films/collection/10');
    expect(link.className).toContain(styles.interactive);
  });
});
