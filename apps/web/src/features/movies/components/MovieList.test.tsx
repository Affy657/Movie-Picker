import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import userEvent from '@testing-library/user-event';
import MovieList from '@/features/movies/components/MovieList';
import type { MovieData, WatchProviderOffer } from '@/shared/types/movie';
import { LocaleProvider } from '@/shared/i18n';
import { QueryClientWrapper } from '@/test-utils/queryWrapper';
import { stubHoverCapability } from '@/test-utils/matchMedia';

const renderDetailsModal = vi.fn();

vi.mock('@/features/movies/components/MovieDetailsModal', () => ({
  default: ({ open, initialTab }: { open: boolean; initialTab?: string }) => {
    renderDetailsModal();
    return open ? <div data-testid="details-modal-open" data-tab={initialTab} /> : null;
  },
}));

function renderWithLocale(ui: React.ReactElement) {
  return render(
    <MemoryRouter>
      <QueryClientWrapper>
        <LocaleProvider>{ui}</LocaleProvider>
      </QueryClientWrapper>
    </MemoryRouter>
  );
}

const movies: MovieData[] = [
  {
    id: 'm1',
    eventId: 'e1',
    participantId: 'p1',
    tmdbId: 1,
    title: 'Inception',
    year: '2010',
    posterPath: null,
    proposerPseudo: 'Alice',
    score: 2,
    up: 3,
    down: 1,
  },
  {
    id: 'm2',
    eventId: 'e1',
    participantId: 'p2',
    tmdbId: 2,
    title: 'Matrix',
    year: '1999',
    posterPath: null,
    proposerPseudo: 'Bob',
    score: -1,
    up: 0,
    down: 1,
  },
];

const flatrateOnly: WatchProviderOffer[] = [
  { providerId: 8, name: 'Netflix', logoPath: null, type: 'flatrate' },
];
const rentBuyOnly: WatchProviderOffer[] = [
  { providerId: 2, name: 'Apple TV', logoPath: null, type: 'rent' },
  { providerId: 68, name: 'Microsoft', logoPath: null, type: 'buy' },
];
const mixedProviders: WatchProviderOffer[] = [...flatrateOnly, ...rentBuyOnly];

function baseProps() {
  return {
    slug: 's',
    participantId: null as string | null,
    participantPseudo: null as string | null,
    isFinished: false,
    onVote: vi.fn().mockResolvedValue(undefined),
    onRemove: vi.fn(),
    refresh: vi.fn(),
    onActionError: vi.fn(),
    isMobile: false,
  };
}

describe('MovieList', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('does not mount the movie details modal before its first opening', async () => {
    renderDetailsModal.mockClear();
    renderWithLocale(
      <MovieList
        movies={[{ ...movies[0]!, watchProviders: mixedProviders }]}
        {...baseProps()}
        viewMode="grid"
      />
    );
    expect(renderDetailsModal).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: /Location/ }));
    expect(await screen.findByTestId('details-modal-open')).toBeInTheDocument();
    expect(renderDetailsModal).toHaveBeenCalled();
  });

  it('renders the empty state handed by its owner when the list is empty', () => {
    const { container } = renderWithLocale(<MovieList movies={[]} {...baseProps()} />);
    expect(container).toBeEmptyDOMElement();

    renderWithLocale(
      <MovieList movies={[]} {...baseProps()} emptyState={<p>Rien pour l’instant</p>} />
    );
    expect(screen.getByText('Rien pour l’instant')).toBeInTheDocument();
  });

  describe('vue liste (ligne dense)', () => {
    it('affiche la liste des films avec titre et proposeur', () => {
      renderWithLocale(<MovieList movies={movies} {...baseProps()} viewMode="list" />);
      expect(screen.getByRole('heading', { name: 'Inception' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Matrix' })).toBeInTheDocument();
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });

    it("n'affiche le rang que si showRank est vrai", () => {
      const { rerender } = renderWithLocale(
        <MovieList movies={movies} {...baseProps()} viewMode="list" showRank={false} />
      );
      expect(screen.getAllByTestId('movie-rank').every((el) => el.textContent === '')).toBe(true);

      rerender(
        <MemoryRouter>
          <QueryClientWrapper>
            <LocaleProvider>
              <MovieList movies={movies} {...baseProps()} viewMode="list" showRank />
            </LocaleProvider>
          </QueryClientWrapper>
        </MemoryRouter>
      );
      const ranks = screen.getAllByTestId('movie-rank');
      expect(ranks.map((el) => el.textContent)).toEqual(['1', '2']);
    });

    it('shows the sortable column header when showHeader and the sort are provided', async () => {
      const onSetSort = vi.fn();
      renderWithLocale(
        <MovieList
          movies={movies}
          {...baseProps()}
          viewMode="list"
          showHeader
          sortBy="score"
          sortDir="desc"
          onSetSort={onSetSort}
        />
      );
      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: /score/i }));
      expect(onSetSort).toHaveBeenCalledWith('score');
      await user.click(screen.getByRole('button', { name: /durée/i }));
      expect(onSetSort).toHaveBeenCalledWith('duration');
    });

    it('does not show the header when showHeader is false', () => {
      renderWithLocale(
        <MovieList
          movies={movies}
          {...baseProps()}
          viewMode="list"
          showHeader={false}
          sortBy="score"
          sortDir="desc"
          onSetSort={vi.fn()}
        />
      );
      expect(screen.queryByRole('button', { name: /^score$/i })).not.toBeInTheDocument();
    });

    it('does not show the header on mobile', () => {
      renderWithLocale(
        <MovieList
          movies={movies}
          {...baseProps()}
          isMobile
          viewMode="list"
          showHeader
          sortBy="score"
          sortDir="desc"
          onSetSort={vi.fn()}
        />
      );
      expect(screen.queryByRole('button', { name: /^score$/i })).not.toBeInTheDocument();
    });

    it('shows the winner badge only on the designated movie', () => {
      renderWithLocale(
        <MovieList movies={movies} {...baseProps()} viewMode="list" winnerMovieIds={['m1']} />
      );
      expect(screen.getByText('Film gagnant')).toBeInTheDocument();
      expect(screen.getAllByText('Film gagnant')).toHaveLength(1);
    });

    it('in grid view, the winner marker sits on the poster, outside the title', () => {
      renderWithLocale(
        <MovieList movies={movies} {...baseProps()} viewMode="grid" winnerMovieIds={['m2', 'm1']} />
      );
      const badge = screen.getByText('Gagnant 1');
      expect(badge.closest('h3')).toBeNull();
      expect(badge.closest('[class*=posterCol]')).not.toBeNull();
    });

    it('numbers the winners as soon as there are several', () => {
      renderWithLocale(
        <MovieList movies={movies} {...baseProps()} viewMode="list" winnerMovieIds={['m2', 'm1']} />
      );
      expect(screen.getByText('Gagnant 1')).toBeInTheDocument();
      expect(screen.getByText('Gagnant 2')).toBeInTheDocument();
      expect(screen.queryByText('Film gagnant')).not.toBeInTheDocument();
    });

    it('in list view, the removal mode only offers the designated movies as selectable', () => {
      renderWithLocale(
        <MovieList
          movies={movies}
          {...baseProps()}
          viewMode="list"
          winnerMovieIds={['m1']}
          selection={{
            active: true,
            mode: 'remove',
            selectableIds: ['m1'],
            onSelect: vi.fn(),
          }}
        />
      );
      expect(screen.getByTestId('remove-winner-m1')).toBeInTheDocument();
      expect(screen.queryByTestId('remove-winner-m2')).not.toBeInTheDocument();
    });

    it('in list view, the manual pick ignores the movies that already won', () => {
      renderWithLocale(
        <MovieList
          movies={movies}
          {...baseProps()}
          viewMode="list"
          winnerMovieIds={['m1']}
          selection={{ active: true, mode: 'pick', selectableIds: ['m2'], onSelect: vi.fn() }}
        />
      );
      expect(screen.queryByTestId('manual-pick-m1')).not.toBeInTheDocument();
      expect(screen.getByTestId('manual-pick-m2')).toBeInTheDocument();
    });

    it('laisse la colonne rang vide sur les lignes gagnantes', () => {
      renderWithLocale(
        <MovieList
          movies={movies}
          {...baseProps()}
          viewMode="list"
          showRank
          winnerMovieIds={['m1']}
        />
      );
      const ranks = screen.getAllByTestId('movie-rank').map((el) => el.textContent);
      expect(ranks).toEqual(['', '1']);
    });

    it('shows vote and seen mark in list view with a participantId', async () => {
      const onVote = vi.fn().mockResolvedValue(undefined);
      renderWithLocale(
        <MovieList
          movies={movies}
          {...baseProps()}
          participantId="p0"
          participantPseudo="Alice"
          onVote={onVote}
          viewMode="list"
        />
      );
      const upButtons = screen.getAllByRole('button', { name: /^Voter pour / });
      await userEvent.click(upButtons[0]!);
      expect(onVote).toHaveBeenCalledWith('m1', 1);
      expect(screen.getAllByRole('button', { name: /Marquer « déjà vu »/ })).toHaveLength(2);
    });

    it('hides the vote buttons and shows a read-only tally when the movie night is over', () => {
      renderWithLocale(
        <MovieList
          movies={[movies[0]!]}
          {...baseProps()}
          participantId="p0"
          participantPseudo="Alice"
          isFinished
          viewMode="list"
        />
      );
      expect(screen.queryByRole('button', { name: /Voter pour/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Marquer/ })).not.toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('caps the displayed platforms and offers a unified overflow badge', async () => {
      const manyProviders: WatchProviderOffer[] = [
        { providerId: 1, name: 'A', logoPath: null, type: 'flatrate' },
        { providerId: 2, name: 'B', logoPath: null, type: 'flatrate' },
        { providerId: 3, name: 'C', logoPath: null, type: 'flatrate' },
        { providerId: 4, name: 'D', logoPath: null, type: 'flatrate' },
      ];
      renderWithLocale(
        <MovieList
          movies={[{ ...movies[0]!, watchProviders: manyProviders }]}
          {...baseProps()}
          viewMode="list"
        />
      );
      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.getByText('B')).toBeInTheDocument();
      expect(screen.queryByText('C')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /2 autres offres/i })).toBeInTheDocument();
    });

    it('shows a label when no offer is available', () => {
      renderWithLocale(
        <MovieList
          movies={[{ ...movies[0]!, watchProviders: [] }]}
          {...baseProps()}
          viewMode="list"
        />
      );
      expect(screen.getByText(/pas en streaming/i)).toBeInTheDocument();
    });

    it('split bar: proportions the for/against segments and exposes the detail in a tooltip', () => {
      renderWithLocale(
        <MovieList
          movies={[{ ...movies[0]!, up: 3, down: 1, score: 2 }]}
          {...baseProps()}
          viewMode="list"
        />
      );
      expect(screen.getByText('+2')).toBeInTheDocument();
      expect(screen.getByText('3 pour, 1 contre')).toBeInTheDocument();
    });

    it('split bar: no segment as long as no vote has been cast', () => {
      renderWithLocale(
        <MovieList
          movies={[{ ...movies[0]!, up: 0, down: 0, score: 0 }]}
          {...baseProps()}
          viewMode="list"
        />
      );
      expect(screen.getAllByText('0').length).toBeGreaterThan(0);
      expect(screen.queryByText('0 pour, 0 contre')).not.toBeInTheDocument();
    });

    it('vote failure: shows the error on the affected row with a Retry button', async () => {
      const onRetryVote = vi.fn();
      renderWithLocale(
        <MovieList
          movies={movies}
          {...baseProps()}
          participantId="p0"
          participantPseudo="Alice"
          viewMode="list"
          voteErrors={{
            m1: { message: 'Votre vote n’a pas été enregistré. Vérifiez votre connexion.' },
          }}
          onRetryVote={onRetryVote}
        />
      );
      expect(
        screen.getByText('Votre vote n’a pas été enregistré. Vérifiez votre connexion.')
      ).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: /réessayer/i }));
      expect(onRetryVote).toHaveBeenCalledWith('m1');
    });

    it('mobile row: switches to a disclosure chevron, no three-dot menu', () => {
      renderWithLocale(
        <MovieList
          movies={[{ ...movies[0]!, tmdbId: 27205 }]}
          {...baseProps()}
          isMobile
          viewMode="list"
        />
      );
      expect(screen.queryByRole('button', { name: /plus d’actions/i })).not.toBeInTheDocument();
    });
  });

  describe('vue grille', () => {
    it('affiche le proposeur, sans les genres', () => {
      renderWithLocale(
        <MovieList
          movies={[{ ...movies[0]!, genreIds: [28, 12] }]}
          {...baseProps()}
          viewMode="grid"
        />
      );
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.queryByText(/action/i)).not.toBeInTheDocument();
    });

    it('mounts no kebab on a device without hover capability', () => {
      renderWithLocale(
        <MovieList movies={[movies[0]!]} {...baseProps()} isMobile viewMode="grid" />
      );
      expect(screen.queryByRole('button', { name: /plus d’actions/i })).not.toBeInTheDocument();
      expect(screen.getByTestId('poster-details-trigger')).toBeInTheDocument();
    });

    it('mounts the kebab on a hover-capable device, whatever the isMobile prop says', () => {
      stubHoverCapability();
      renderWithLocale(
        <MovieList movies={[movies[0]!]} {...baseProps()} isMobile viewMode="grid" />
      );
      expect(screen.getByRole('button', { name: /plus d’actions/i })).toBeInTheDocument();
    });

    it('keeps the kebab without hover for a movie that has no details to open', () => {
      renderWithLocale(
        <MovieList
          movies={[{ ...movies[0]!, tmdbId: 0 }]}
          {...baseProps()}
          participantId="p0"
          participantPseudo="Alice"
          isHost
          viewMode="grid"
        />
      );
      expect(screen.getByRole('button', { name: /plus d’actions/i })).toBeInTheDocument();
    });

    it('kebab menu: lists the items in the unified order for the host', async () => {
      stubHoverCapability();
      renderWithLocale(
        <MovieList
          movies={[movies[0]!]}
          {...baseProps()}
          participantId="p0"
          participantPseudo="Alice"
          isHost
          viewMode="grid"
          onToggleWatchlist={vi.fn()}
          onToggleWheelExclusion={vi.fn()}
        />
      );
      await userEvent.click(screen.getByRole('button', { name: /Plus d’actions/ }));
      const names = screen
        .getAllByRole('menuitem')
        .map((el) => el.getAttribute('aria-label') ?? el.textContent);
      expect(names).toEqual([
        'Voir les détails',
        'Ajouter à ma liste',
        'Exclure du tirage',
        'Ouvrir sur Letterboxd',
        'Retirer « Inception » en tant qu’hôte',
      ]);
      expect(
        screen.queryByRole('menuitem', { name: /imdb|allociné|tmdb/i })
      ).not.toBeInTheDocument();
      expect(screen.getAllByRole('separator')).toHaveLength(2);
    });

    it('vue grille : abonnement seul → chips flatrate, aucune pastille location/achat', () => {
      renderWithLocale(
        <MovieList
          movies={[{ ...movies[0]!, watchProviders: flatrateOnly }]}
          {...baseProps()}
          viewMode="grid"
        />
      );
      expect(screen.getByText('Netflix')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Location/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Achat/ })).not.toBeInTheDocument();
    });

    it('grid view: separates rental and purchase from flatrate in two distinct chips that open the modal', async () => {
      renderWithLocale(
        <MovieList
          movies={[{ ...movies[0]!, watchProviders: mixedProviders }]}
          {...baseProps()}
          viewMode="grid"
        />
      );
      expect(screen.getByText('Netflix')).toBeInTheDocument();
      const rentBtn = screen.getByRole('button', { name: /Location/ });
      const buyBtn = screen.getByRole('button', { name: /Achat/ });
      expect(screen.queryByTestId('details-modal-open')).not.toBeInTheDocument();
      await userEvent.click(rentBtn);
      const modal = await screen.findByTestId('details-modal-open');
      expect(modal).toBeInTheDocument();
      expect(modal).toHaveAttribute('data-tab', 'dispo');
      expect(buyBtn).toBeInTheDocument();
    });

    it('vue grille : sans abonnement, affiche uniquement les pastilles location/achat', () => {
      renderWithLocale(
        <MovieList
          movies={[{ ...movies[0]!, watchProviders: rentBuyOnly }]}
          {...baseProps()}
          viewMode="grid"
        />
      );
      expect(screen.queryByText('Netflix')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Location/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Achat/ })).toBeInTheDocument();
    });

    it('selection mode in grid view: also neutralises the usual actions', () => {
      renderWithLocale(
        <MovieList
          movies={[movies[0]!]}
          {...baseProps()}
          participantId="p0"
          participantPseudo="Alice"
          viewMode="grid"
          selection={{ active: true, mode: 'pick' as const, onSelect: vi.fn() }}
        />
      );
      const pickButton = screen.getByTestId('manual-pick-m1');
      expect(pickButton).toBeInTheDocument();
      const voteButton = screen.getByRole('button', { name: /^Voter pour/ });
      expect(voteButton.closest('[inert]')).not.toBeNull();
    });

    it('menu kebab : propose « Exclure du tirage » et appelle le callback avec le film', async () => {
      stubHoverCapability();
      const onToggleWheelExclusion = vi.fn();
      renderWithLocale(
        <MovieList
          movies={[movies[0]!]}
          {...baseProps()}
          participantId="p0"
          participantPseudo="Alice"
          isHost
          viewMode="grid"
          onToggleWheelExclusion={onToggleWheelExclusion}
        />
      );
      await userEvent.click(screen.getByRole('button', { name: /Plus d’actions/ }));
      await userEvent.click(screen.getByRole('menuitem', { name: 'Exclure du tirage' }));
      expect(onToggleWheelExclusion).toHaveBeenCalledWith(expect.objectContaining({ id: 'm1' }));
    });

    it('menu kebab : « Retirer » appelle le callback avec le film, sans le retirer directement', async () => {
      stubHoverCapability();
      const onRemove = vi.fn();
      renderWithLocale(
        <MovieList
          movies={[movies[0]!]}
          {...baseProps()}
          participantId="p0"
          participantPseudo="Alice"
          isHost
          viewMode="grid"
          onRemove={onRemove}
        />
      );
      await userEvent.click(screen.getByRole('button', { name: /Plus d’actions/ }));
      await userEvent.click(
        screen.getByRole('menuitem', { name: /Retirer « Inception » en tant qu.hôte/ })
      );
      expect(onRemove).toHaveBeenCalledWith(expect.objectContaining({ id: 'm1' }));
    });

    it('kebab menu: switches to "Put back in the draw" for a movie already excluded', async () => {
      stubHoverCapability();
      renderWithLocale(
        <MovieList
          movies={[{ ...movies[0]!, excludedFromWheel: true }]}
          {...baseProps()}
          participantId="p0"
          participantPseudo="Alice"
          isHost
          viewMode="grid"
          onToggleWheelExclusion={vi.fn()}
        />
      );
      await userEvent.click(screen.getByRole('button', { name: /Plus d’actions/ }));
      expect(screen.getByRole('menuitem', { name: 'Réintégrer au tirage' })).toBeInTheDocument();
      expect(screen.queryByRole('menuitem', { name: 'Exclure du tirage' })).not.toBeInTheDocument();
    });

    it('excluded movie: announces its state to screen readers', () => {
      renderWithLocale(
        <MovieList
          movies={[{ ...movies[0]!, excludedFromWheel: true }]}
          {...baseProps()}
          viewMode="grid"
        />
      );
      expect(screen.getByText('Film exclu du tirage')).toBeInTheDocument();
    });

    it('selection mode: an excluded movie is not selectable', () => {
      renderWithLocale(
        <MovieList
          movies={[{ ...movies[0]!, excludedFromWheel: true }, movies[1]!]}
          {...baseProps()}
          viewMode="grid"
          selection={{ active: true, mode: 'pick' as const, onSelect: vi.fn() }}
        />
      );
      expect(screen.queryByTestId('manual-pick-m1')).not.toBeInTheDocument();
      expect(screen.getByTestId('manual-pick-m2')).toBeInTheDocument();
    });

    it('selection mode: clicking a card calls onSelect with the right movie', async () => {
      const onSelect = vi.fn();
      renderWithLocale(
        <MovieList
          movies={movies}
          {...baseProps()}
          viewMode="grid"
          selection={{ active: true, mode: 'pick', onSelect }}
        />
      );
      await userEvent.click(screen.getByTestId('manual-pick-m2'));
      expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'm2', title: 'Matrix' }));
    });
  });
});
