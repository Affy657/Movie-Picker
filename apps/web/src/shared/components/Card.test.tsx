import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Card from '@/shared/components/Card';

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
});
