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
        closeLabel="Fermer"
      />
    );

    const heading = screen.getByRole('heading', { level: 2, name: 'Partager' });
    expect(heading).toHaveAttribute('id', 'share-title');
  });

  it('le bouton de fermeture porte son libellé et déclenche onClose', async () => {
    const onClose = vi.fn();
    render(<DialogTitleBar titleId="t" title="Titre" onClose={onClose} closeLabel="Fermer" />);

    await userEvent.click(screen.getByRole('button', { name: 'Fermer' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
