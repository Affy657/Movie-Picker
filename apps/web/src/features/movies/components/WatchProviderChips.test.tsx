import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import WatchProviderChips from '@/features/movies/components/WatchProviderChips';

describe('WatchProviderChips', () => {
  it('sans logo TMDB, affiche le nom du fournisseur', () => {
    render(
      <WatchProviderChips
        providers={[
          { providerId: 1, name: 'Service A', logoPath: null, type: 'flatrate' },
          { providerId: 2, name: 'Service B', logoPath: null, type: 'rent' },
        ]}
      />
    );
    expect(screen.getByText('Service A')).toBeInTheDocument();
    expect(screen.getByText('Service B')).toBeInTheDocument();
  });

  it('avec logo TMDB, affiche seulement l’icône (nom en aria-label)', () => {
    render(
      <WatchProviderChips
        providers={[
          {
            providerId: 8,
            name: 'Disney Plus',
            logoPath: 'https://image.tmdb.org/t/p/w45/test.png',
            type: 'flatrate',
          },
        ]}
      />
    );
    expect(document.querySelector('img[src*="image.tmdb.org"]')).toBeTruthy();
    expect(screen.queryByText('Disney Plus')).not.toBeInTheDocument();
    expect(screen.getByRole('listitem', { name: /disney plus.*abonnement/i })).toBeInTheDocument();
  });

  it('ne rend rien si liste vide', () => {
    const { container } = render(<WatchProviderChips providers={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
