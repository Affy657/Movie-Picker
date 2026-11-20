import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { LocaleProvider } from '@/shared/i18n';
import { QueryClientWrapper } from '@/test-utils/queryWrapper';
import { stubMatchMedia } from '@/test-utils/matchMedia';
import type { LibraryEntry } from '@/features/library/hooks/useLibraryToolbar';
import ListMoviesPage from './ListMoviesPage';

vi.mock('@/features/auth/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, isLoading: false }),
}));

vi.mock('@/shared/hooks/useAnalytics', () => ({
  useAnalytics: () => ({ track: vi.fn() }),
}));

function film(tmdbId: number, title: string, voteAverage: number): LibraryEntry {
  return {
    tmdbId,
    mediaType: 'movie',
    title,
    year: '2000',
    posterPath: null,
    voteAverage,
    runtimeMinutes: 100,
    createdAt: '2026-01-01T00:00:00Z',
  };
}

type PageProps = ComponentProps<typeof ListMoviesPage<LibraryEntry>>;

function renderPage(overrides: Partial<PageProps> = {}) {
  return render(
    <QueryClientWrapper>
      <LocaleProvider>
        <MemoryRouter>
          <ListMoviesPage
            title="À voir"
            subtitle={null}
            items={[film(200, 'Ancien Mais Bien Noté', 9), film(201, 'Recent Mais Mal Noté', 3)]}
            isLoading={false}
            isError={false}
            storageScope="watchlist"
            emptyIcon={null}
            labels={{
              listAria: 'Films de ma liste',
              loading: 'Chargement',
              loadError: 'Erreur',
              emptyTitle: 'Vide',
              emptyMessage: 'Rien',
            }}
            card={{
              inWatchlist: () => true,
              showListBadge: false,
              onToggleWatchlist: vi.fn(),
              error: null,
            }}
            {...overrides}
          />
        </MemoryRouter>
      </LocaleProvider>
    </QueryClientWrapper>
  );
}

function precedes(first: HTMLElement, second: HTMLElement): boolean {
  return !!(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);
}

const menu = <button type="button">Actions de la liste</button>;

describe('ListMoviesPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('gives the focus back to the filters toggle when Escape closes the filters panel', async () => {
    const user = userEvent.setup();
    renderPage();

    const toggle = screen.getByRole('button', { name: /^filtres$/i });
    await user.click(toggle);
    const panelId = toggle.getAttribute('aria-controls')!;
    within(document.getElementById(panelId)!).getAllByRole('button')[0]!.focus();
    await user.keyboard('{Escape}');

    expect(document.getElementById(panelId)).toBeNull();
    expect(toggle).toHaveFocus();
  });

  describe('header', () => {
    it('says Publique and Letterboxd on the line of the count, not in their own badges', () => {
      renderPage({
        subtitle: '7 films, 4 vus',
        header: { isPublic: true, letterboxdSynced: true },
      });

      const meta = screen.getByText('7 films, 4 vus').closest('p')!;
      expect(within(meta).getByText('Publique')).toBeInTheDocument();
      expect(within(meta).getByText('Synchronisée avec Letterboxd')).toBeInTheDocument();
    });

    it('says who the list comes from on its own line under the count', () => {
      renderPage({
        subtitle: '7 films, 4 vus',
        header: { source: <span>Avec Alice et Bob</span> },
      });

      const meta = screen.getByText('7 films, 4 vus').closest('p')!;
      const source = screen.getByText('Avec Alice et Bob');
      expect(meta).not.toContainElement(source);
      expect(precedes(meta, source)).toBe(true);
    });

    it('draws a cover of the first three posters it is given', () => {
      const { container } = renderPage({
        header: { cover: ['/a.jpg', '/b.jpg', '/c.jpg', '/d.jpg'], progress: 57 },
      });

      const fan = container.querySelector('[data-count]')!;
      expect(fan).toHaveAttribute('data-count', '3');
      expect(fan.querySelectorAll('img')).toHaveLength(3);
    });

    it('puts Piocher first, then the main action, then the menu', () => {
      renderPage({
        randomPick: { historyKey: 'test.randomPick', source: 'watchlist' },
        header: { primary: () => <button type="button">Enregistrée</button>, menu },
      });

      const pick = screen.getByRole('button', { name: 'Piocher un film' });
      const saved = screen.getByRole('button', { name: 'Enregistrée' });
      expect(precedes(pick, saved)).toBe(true);
      expect(precedes(saved, screen.getByRole('button', { name: 'Actions de la liste' }))).toBe(
        true
      );
    });

    it('puts Piocher before Ajouter un film', () => {
      renderPage({
        randomPick: { historyKey: 'test.randomPick', source: 'watchlist' },
        onAddItem: vi.fn(),
      });

      expect(
        precedes(
          screen.getByRole('button', { name: 'Piocher un film' }),
          screen.getByRole('button', { name: 'Ajouter un film' })
        )
      ).toBe(true);
    });

    it('on a phone, keeps the menu beside the title and the full-length actions below the description', () => {
      stubMatchMedia(true);
      renderPage({
        description: 'Pour la soirée du 31 octobre',
        randomPick: { historyKey: 'test.randomPick', source: 'watchlist' },
        onAddItem: vi.fn(),
        header: { menu },
      });

      const menuButton = screen.getByRole('button', { name: 'Actions de la liste' });
      const description = screen.getByText('Pour la soirée du 31 octobre');
      const pick = screen.getByRole('button', { name: 'Piocher un film' });
      expect(screen.getByRole('button', { name: 'Ajouter un film' })).toBeInTheDocument();
      expect(precedes(menuButton, description)).toBe(true);
      expect(precedes(description, pick)).toBe(true);
    });
  });

  describe('toolbar', () => {
    it('sorts from a menu rather than a row of chips', () => {
      renderPage();

      expect(screen.queryByRole('toolbar', { name: 'Trier par' })).toBeNull();
      expect(screen.getByRole('button', { name: /ajout/i })).toBeInTheDocument();
    });

    it('on a phone, puts Griser les vus beside the search, before Filtres', () => {
      stubMatchMedia(true);
      renderPage({
        card: {
          inWatchlist: () => true,
          showListBadge: false,
          onToggleWatchlist: vi.fn(),
          isWatched: () => false,
          error: null,
        },
      });

      const search = screen.getByRole('searchbox');
      const dim = screen.getByRole('button', { name: 'Griser les vus' });
      expect(precedes(search, dim)).toBe(true);
      expect(precedes(dim, screen.getByRole('button', { name: /^filtres$/i }))).toBe(true);
    });
  });
});
