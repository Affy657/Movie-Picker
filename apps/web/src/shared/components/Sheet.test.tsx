import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LocaleProvider } from '@/shared/i18n';
import Sheet from './Sheet';

function wrap(ui: ReactNode) {
  return render(<LocaleProvider>{ui}</LocaleProvider>);
}

describe('Sheet', () => {
  it('affiche le titre et le contenu quand ouvert', () => {
    wrap(
      <Sheet open title="Ajouter un film" onClose={vi.fn()}>
        <p>Contenu</p>
      </Sheet>
    );
    expect(screen.getByText('Ajouter un film')).toBeInTheDocument();
    expect(screen.getByText('Contenu')).toBeInTheDocument();
  });

  it('ne rend pas le contenu quand fermé', () => {
    wrap(
      <Sheet open={false} title="Ajouter un film" onClose={vi.fn()}>
        <p>Contenu</p>
      </Sheet>
    );
    expect(screen.queryByText('Contenu')).not.toBeInTheDocument();
  });

  it('appelle onClose au clic sur le bouton de fermeture', () => {
    const onClose = vi.fn();
    wrap(
      <Sheet open title="Ajouter un film" onClose={onClose}>
        <p>Contenu</p>
      </Sheet>
    );
    fireEvent.click(screen.getByRole('button', { name: /fermer/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('affiche le footer quand fourni', () => {
    wrap(
      <Sheet open title="Ajouter un film" onClose={vi.fn()} footer={<span>Pied</span>}>
        <p>Contenu</p>
      </Sheet>
    );
    expect(screen.getByText('Pied')).toBeInTheDocument();
  });
});
