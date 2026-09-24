import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import ProfileFavoritesSection from './ProfileFavoritesSection';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import type { MovieLibraryActions } from '@/features/movies/components/MovieBrowseCard';
import type { FavoriteTitle } from '@/shared/types/movie';

const HEAT: FavoriteTitle = {
  tmdbId: 949,
  mediaType: 'movie',
  title: 'Heat',
  year: '1995',
  posterPath: null,
};
const INCEPTION: FavoriteTitle = {
  tmdbId: 27205,
  mediaType: 'movie',
  title: 'Inception',
  year: '2010',
  posterPath: '/api/v1/posters/abc',
};
const TWIN_PEAKS: FavoriteTitle = {
  tmdbId: 1920,
  mediaType: 'tv',
  title: 'Twin Peaks',
  year: '1990',
  posterPath: null,
};

const SETTINGS_ANCHOR = '/settings/profil#favoris';

const library: MovieLibraryActions = {
  hasHover: false,
  isLoggedIn: false,
  has: () => false,
  toggle: vi.fn(),
  propose: vi.fn(),
};

function renderSection(favorites: FavoriteTitle[], isOwnProfile = false, onOpenDetails = vi.fn()) {
  render(
    <AppTestProviders>
      <MemoryRouter>
        <ProfileFavoritesSection
          favorites={favorites}
          isOwnProfile={isOwnProfile}
          library={library}
          onOpenDetails={onOpenDetails}
        />
      </MemoryRouter>
    </AppTestProviders>
  );
  return onOpenDetails;
}

describe('ProfileFavoritesSection', () => {
  it('shows a visitor the favorites in the order they were picked, without ranks', () => {
    renderSection([HEAT, INCEPTION, TWIN_PEAKS]);

    const section = screen.getByRole('region', { name: 'Ses favoris' });
    expect(
      within(section)
        .getAllByRole('heading', { level: 3 })
        .map((heading) => heading.textContent)
    ).toEqual(['Heat', 'Inception', 'Twin Peaks']);
    expect(within(section).getByText('1995')).toBeInTheDocument();
    expect(within(section).queryByText(/^[123]$/)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /modifier/i })).not.toBeInTheDocument();
  });

  it('renders nothing for a visitor when there is no favorite', () => {
    renderSection([]);

    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });

  it('shows a visitor only the titles that were picked, without free places', () => {
    renderSection([HEAT, TWIN_PEAKS]);

    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(2);
    expect(screen.queryByRole('link', { name: /ajouter un favori/i })).not.toBeInTheDocument();
  });

  it('marks a series with its badge', () => {
    renderSection([HEAT, TWIN_PEAKS]);

    expect(screen.getByText('Série')).toBeInTheDocument();
  });

  it('asks for the details of the favorite that was clicked', async () => {
    const user = userEvent.setup();
    const onOpenDetails = renderSection([HEAT, TWIN_PEAKS]);

    await user.click(screen.getByRole('button', { name: /voir les détails de « twin peaks »/i }));

    expect(onOpenDetails).toHaveBeenCalledWith(TWIN_PEAKS);
  });

  it('invites an owner without favorites to pick some, for their eyes only', () => {
    renderSection([], true);

    expect(screen.getByRole('region', { name: 'Mes favoris' })).toBeInTheDocument();
    expect(screen.getByText('Visible par vous seul')).toBeInTheDocument();
    expect(screen.getByText(/choisissez jusqu’à trois films ou séries/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Choisir mes favoris' })).toHaveAttribute(
      'href',
      SETTINGS_ANCHOR
    );
  });

  it('lets an owner edit the favorites and fill the free places', () => {
    renderSection([HEAT], true);

    expect(screen.getByRole('link', { name: /^modifier mes favoris$/i })).toHaveAttribute(
      'href',
      SETTINGS_ANCHOR
    );
    const freePlaces = screen.getAllByRole('link', { name: 'Ajouter un favori' });
    expect(freePlaces).toHaveLength(2);
    freePlaces.forEach((place) => expect(place).toHaveAttribute('href', SETTINGS_ANCHOR));
  });

  it('shows an owner with three favorites the edit link and no free place', () => {
    renderSection([HEAT, INCEPTION, TWIN_PEAKS], true);

    expect(screen.getByRole('link', { name: /^modifier mes favoris$/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Ajouter un favori' })).not.toBeInTheDocument();
    expect(screen.queryByText('Visible par vous seul')).not.toBeInTheDocument();
  });
});
