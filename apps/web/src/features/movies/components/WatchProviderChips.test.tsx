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
        title="Mon Film"
        providers={[
          { providerId: 9999, name: 'Service A', logoPath: null, type: 'flatrate' },
          { providerId: 9998, name: 'Service B', logoPath: null, type: 'rent' },
        ]}
      />
    );
    expect(screen.getByText('Service A')).toBeInTheDocument();
    expect(screen.getByText('Service B')).toBeInTheDocument();
  });

  it("avec logo TMDB, affiche seulement l'icone (nom en aria-label)", () => {
    renderWithLocale(
      <WatchProviderChips
        title="Mon Film"
        providers={[
          {
            providerId: 9999,
            name: 'Service Inconnu',
            logoPath: 'https://image.tmdb.org/t/p/w45/test.png',
            type: 'flatrate',
          },
        ]}
      />
    );
    expect(document.querySelector('img[src*="image.tmdb.org"]')).toBeTruthy();
    expect(screen.queryByText('Service Inconnu')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: /service inconnu.*abonnement/i })).toBeInTheDocument();
  });

  it('groupe les offres par mode avec une icône libellée Abonnement / Location / Achat', () => {
    renderWithLocale(
      <WatchProviderChips
        title="Mon Film"
        providers={[
          { providerId: 8, name: 'Netflix', logoPath: null, type: 'flatrate' },
          { providerId: 3, name: 'Google Play', logoPath: null, type: 'rent' },
          { providerId: 68, name: 'Microsoft Store', logoPath: null, type: 'buy' },
        ]}
      />
    );
    expect(screen.getByLabelText('Abonnement')).toBeInTheDocument();
    expect(screen.getByLabelText('Location')).toBeInTheDocument();
    expect(screen.getByLabelText('Achat')).toBeInTheDocument();
  });

  it('ne rend rien si liste vide', () => {
    const { container } = renderWithLocale(<WatchProviderChips title="Mon Film" providers={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('accepte un chemin TMDB relatif pour le logo', () => {
    renderWithLocale(
      <WatchProviderChips
        title="Mon Film"
        providers={[
          {
            providerId: 9999,
            name: 'Service Inconnu',
            logoPath: '/t/p/w45/logo.png',
            type: 'flatrate',
          },
        ]}
      />
    );
    const img = document.querySelector('img');
    expect(img?.getAttribute('src')).toMatch(/^https:\/\/image\.tmdb\.org\/t\/p\/w154\//);
  });

  it('provider avec watchPageUrl TMDB : lien vers la page TMDB du film', () => {
    renderWithLocale(
      <WatchProviderChips
        title="Inception"
        providers={[{ providerId: 8, name: 'Netflix', logoPath: null, type: 'flatrate' }]}
        watchPageUrl="https://www.themoviedb.org/movie/27205/watch"
      />
    );
    const link = screen.getByRole('link', { name: /netflix/i });
    expect(link).toHaveAttribute('href', 'https://www.themoviedb.org/movie/27205/watch');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('provider sans watchPageUrl : pas de lien cliquable', () => {
    renderWithLocale(
      <WatchProviderChips
        title="Inception"
        providers={[{ providerId: 8, name: 'Netflix', logoPath: null, type: 'flatrate' }]}
      />
    );
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('provider inconnu + watchPageUrl TMDB valide : lien vers TMDB en fallback', () => {
    renderWithLocale(
      <WatchProviderChips
        title="Mon Film"
        providers={[
          { providerId: 9999, name: 'Service Inconnu', logoPath: null, type: 'flatrate' },
        ]}
        watchPageUrl="https://www.themoviedb.org/movie/550/watch"
      />
    );
    const link = screen.getByRole('link', { name: /service inconnu/i });
    expect(link).toHaveAttribute('href', 'https://www.themoviedb.org/movie/550/watch');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer noopener');
  });

  it('provider inconnu + watchPageUrl non TMDB : pas de lien', () => {
    renderWithLocale(
      <WatchProviderChips
        title="Mon Film"
        providers={[
          { providerId: 9999, name: 'Service Inconnu', logoPath: null, type: 'flatrate' },
        ]}
        watchPageUrl="https://evil.example/phishing"
      />
    );
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('Service Inconnu')).toBeInTheDocument();
  });
});
