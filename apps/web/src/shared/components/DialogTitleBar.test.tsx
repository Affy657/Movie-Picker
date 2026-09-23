import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DialogTitleBar from '@/shared/components/DialogTitleBar';

describe('DialogTitleBar', () => {
  it('rend le titre en h2 avec l’identifiant attendu par la modale', () => {
    render(
      <DialogTitleBar
        titleId="share-title"
        title="Partager"
        onClose={vi.fn()}
        closeAriaLabel="Fermer"
      />
    );

    const heading = screen.getByRole('heading', { level: 2, name: 'Partager' });
    expect(heading).toHaveAttribute('id', 'share-title');
  });

  it('the close button carries its label and triggers onClose', async () => {
    const onClose = vi.fn();
    render(<DialogTitleBar titleId="t" title="Titre" onClose={onClose} closeAriaLabel="Fermer" />);

    await userEvent.click(screen.getByRole('button', { name: 'Fermer' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders a detail under the title, outside the heading', () => {
    render(
      <DialogTitleBar
        titleId="t"
        title="Films à confirmer"
        detail={<span data-testid="progress">1 sur 3</span>}
        onClose={vi.fn()}
        closeAriaLabel="Fermer"
      />
    );

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Films à confirmer');
    expect(screen.getByTestId('progress').closest('h2')).toBeNull();
  });
});
