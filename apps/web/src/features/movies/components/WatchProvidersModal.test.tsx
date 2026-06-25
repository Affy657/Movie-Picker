import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LocaleProvider } from '@/shared/i18n';
import type { WatchProviderOffer } from '@/shared/types/movie';
import WatchProvidersModal from './WatchProvidersModal';

const providers: WatchProviderOffer[] = [
  { providerId: 8, name: 'Netflix', logoPath: null, type: 'flatrate' },
  { providerId: 9, name: 'Prime Video', logoPath: null, type: 'rent' },
  { providerId: 10, name: 'Apple TV', logoPath: null, type: 'buy' },
];

function wrap(ui: ReactNode) {
  return render(<LocaleProvider>{ui}</LocaleProvider>);
}

describe('WatchProvidersModal', () => {
  it('affiche le titre, le film et les plateformes des trois catégories', () => {
    wrap(
      <WatchProvidersModal
        open
        movieTitle="Dune : Deuxième Partie"
        providers={providers}
        watchPageUrl={null}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText('Où regarder')).toBeInTheDocument();
    expect(screen.getByText('Dune : Deuxième Partie')).toBeInTheDocument();
    expect(screen.getByText('Netflix')).toBeInTheDocument();
    expect(screen.getByText('Prime Video')).toBeInTheDocument();
    expect(screen.getByText('Apple TV')).toBeInTheDocument();
  });

  it('appelle onClose au clic sur le bouton de fermeture', () => {
    const onClose = vi.fn();
    wrap(
      <WatchProvidersModal
        open
        movieTitle="Dune"
        providers={providers}
        watchPageUrl={null}
        onClose={onClose}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /fermer/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('affiche le message vide quand aucune plateforme', () => {
    wrap(
      <WatchProvidersModal
        open
        movieTitle="Dune"
        providers={[]}
        watchPageUrl={null}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText(/pas en streaming/i)).toBeInTheDocument();
  });
});
