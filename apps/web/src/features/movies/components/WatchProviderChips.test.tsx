import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LocaleProvider } from '@/shared/i18n';
import WatchProviderChips from '@/features/movies/components/WatchProviderChips';

function renderWithLocale(ui: React.ReactElement) {
  return render(<LocaleProvider>{ui}</LocaleProvider>);
}

describe('WatchProviderChips', () => {
  it('sans logo TMDB, affiche le nom du fournisseur', () => {
    renderWithLocale(
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
    renderWithLocale(
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
    expect(screen.getByRole('group', { name: /disney plus.*abonnement/i })).toBeInTheDocument();
  });

  it('ne rend rien si liste vide', () => {
    const { container } = renderWithLocale(<WatchProviderChips providers={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('accepte un chemin TMDB relatif pour le logo', () => {
    renderWithLocale(
      <WatchProviderChips
        providers={[
          {
            providerId: 8,
            name: 'Disney Plus',
            logoPath: '/t/p/w45/disney.png',
            type: 'flatrate',
          },
        ]}
      />
    );
    const img = document.querySelector('img');
    expect(img?.getAttribute('src')).toMatch(/^https:\/\/image\.tmdb\.org\/t\/p\/w154\//);
  });

  it('avec watchPageUrl TMDB valide, chaque puce est un lien', () => {
    renderWithLocale(
      <WatchProviderChips
        providers={[
          {
            providerId: 8,
            name: 'Netflix',
            logoPath: null,
            type: 'flatrate',
          },
        ]}
        watchPageUrl="https://www.themoviedb.org/movie/550/watch"
      />
    );
    const link = screen.getByRole('link', { name: /netflix/i });
    expect(link).toHaveAttribute('href', 'https://www.themoviedb.org/movie/550/watch');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer noopener');
  });

  it('ignore watchPageUrl non TMDB', () => {
    renderWithLocale(
      <WatchProviderChips
        providers={[
          {
            providerId: 8,
            name: 'Netflix',
            logoPath: null,
            type: 'flatrate',
          },
        ]}
        watchPageUrl="https://evil.example/phishing"
      />
    );
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('Netflix')).toBeInTheDocument();
  });
});
