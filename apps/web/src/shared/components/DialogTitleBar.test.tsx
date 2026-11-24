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

  it('puts a back button before the title and extra actions before the close button', async () => {
    const onBack = vi.fn();
    render(
      <DialogTitleBar
        titleId="t"
        title="QR code"
        leading={
          <button type="button" onClick={onBack}>
            Retour
          </button>
        }
        actions={<button type="button">Rechercher</button>}
        onClose={vi.fn()}
        closeAriaLabel="Fermer"
      />
    );

    const buttons = screen
      .getAllByRole('button')
      .map((button) => button.textContent || button.getAttribute('aria-label'));
    expect(buttons).toEqual(['Retour', 'Rechercher', 'Fermer']);
    await userEvent.click(screen.getByRole('button', { name: 'Retour' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('renders its children under the title row, outside the heading', () => {
    render(
      <DialogTitleBar titleId="t" title="Abonnés" onClose={vi.fn()} closeAriaLabel="Fermer">
        <div data-testid="tabs">Onglets</div>
      </DialogTitleBar>
    );

    expect(screen.getByTestId('tabs').closest('h2')).toBeNull();
  });

  it('keeps the title for assistive technologies when a replacement takes the row', () => {
    render(
      <DialogTitleBar
        titleId="t"
        title="Abonnés et abonnements"
        replacement={<input aria-label="Rechercher" />}
        onClose={vi.fn()}
        closeAriaLabel="Fermer"
      />
    );

    expect(screen.getByRole('heading', { level: 2, name: 'Abonnés et abonnements' })).toHaveClass(
      'visually-hidden'
    );
    expect(screen.getByRole('textbox', { name: 'Rechercher' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Fermer' })).toBeNull();
  });
});
