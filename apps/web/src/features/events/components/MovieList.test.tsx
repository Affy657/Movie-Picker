import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import userEvent from '@testing-library/user-event';
import MovieList from '@/features/events/components/MovieList';
import type { MovieData, WatchProviderOffer } from '@/shared/types/movie';
import { LocaleProvider } from '@/shared/i18n';
import { QueryClientWrapper } from '@/test-utils/queryWrapper';
import { stubHoverCapability } from '@/test-utils/matchMedia';

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>;
}

function renderWithLocale(ui: React.ReactElement, withLocation = false) {
  return render(
    <MemoryRouter>
      <QueryClientWrapper>
        <LocaleProvider>{ui}</LocaleProvider>
      </QueryClientWrapper>
      {withLocation ? <LocationProbe /> : null}
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

    it('names the film column once and offers its two sorts in a menu', async () => {
      const onSetSort = vi.fn();
      renderWithLocale(
        <MovieList
          movies={movies}
          {...baseProps()}
          viewMode="list"
          showHeader
          sortBy="createdAt"
          sortDir="asc"
          onSetSort={onSetSort}
        />
      );
      const user = userEvent.setup();
      expect(screen.queryByRole('button', { name: /^ajout$/i })).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Trier par film' }));
      const menu = screen.getByRole('menu', { name: 'Trier par film' });
      expect(within(menu).getByRole('menuitemradio', { name: 'Ordre d’ajout' })).toHaveAttribute(
        'aria-checked',
        'true'
      );

      await user.click(within(menu).getByRole('menuitemradio', { name: 'Titre' }));
      expect(onSetSort).toHaveBeenCalledWith('title');
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('shows logos instead of provider names, three at most before a +N button', () => {
      const six: WatchProviderOffer[] = [
        'Netflix',
        'Amazon Prime Video',
        'Disney Plus',
        'HBO Max',
        'Canal+',
        'Paramount Plus',
      ].map((name, i) => ({ providerId: i + 1, name, logoPath: null, type: 'flatrate' }));
      renderWithLocale(
        <MovieList
          movies={[{ ...movies[0]!, watchProviders: six }]}
          {...baseProps()}
          viewMode="list"
        />
      );

      expect(screen.queryByText('Netflix')).not.toBeInTheDocument();
      expect(screen.getAllByRole('img', { name: /Netflix|Amazon/ })).toHaveLength(2);
      expect(
        screen.getByRole('button', { name: '+4 : voir les 6 abonnements de « Inception »' })
      ).toHaveTextContent('+4');
    });

    it('turns the seen button into an eye without text and keeps the note on one line without a bin', () => {
      renderWithLocale(
        <MovieList
          movies={[{ ...movies[0]!, pitchNote: 'À voir absolument' }]}
          {...baseProps()}
          participantId="p1"
          participantPseudo="Alice"
          viewMode="list"
        />
      );

      const eye = screen.getByRole('button', { name: 'Marquer « déjà vu » pour Inception' });
      expect(eye).not.toHaveTextContent(/déjà vu/i);
      expect(screen.getByText(/À voir absolument/)).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Supprimer la note sur Inception' })
      ).not.toBeInTheDocument();
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
      expect(screen.getAllByRole('img', { name: 'Film gagnant' })).toHaveLength(1);
      expect(
        screen.getByRole('img', { name: 'Film gagnant' }).closest('[data-testid="movie-rank"]')
      ).not.toBeNull();
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
      expect(screen.getByRole('img', { name: 'Gagnant 1' })).toBeInTheDocument();
      expect(screen.getByRole('img', { name: 'Gagnant 2' })).toBeInTheDocument();
      expect(screen.queryByRole('img', { name: 'Film gagnant' })).not.toBeInTheDocument();
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

    it.each(['list', 'grid'] as const)(
      'marks a vote that waits for the network as pending, in %s view',
      (viewMode) => {
        renderWithLocale(
          <MovieList
            movies={[{ ...movies[0]!, myVote: 1, pendingVote: true }, movies[1]!]}
            {...baseProps()}
            participantId="p0"
            participantPseudo="Alice"
            onVote={vi.fn()}
            viewMode={viewMode}
          />
        );

        expect(screen.getAllByRole('img', { name: 'Vote en attente du réseau' })).toHaveLength(1);
      }
    );

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

    it('keeps the row menu on a touch screen, where it is the only way to delete a note', () => {
      renderWithLocale(<MovieList movies={movies} {...baseProps()} viewMode="list" />);

      expect(screen.getAllByRole('button', { name: /plus d’actions/i })).toHaveLength(2);
    });

    it('shows the subscription logo alone when rentals and purchases also exist', () => {
      renderWithLocale(
        <MovieList
          movies={[{ ...movies[0]!, watchProviders: mixedProviders }]}
          {...baseProps()}
          viewMode="list"
        />
      );
      expect(screen.getByRole('img', { name: 'Netflix' })).toBeInTheDocument();
      expect(screen.queryByText('Location')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /abonnements/i })).not.toBeInTheDocument();
    });

    it('shows a label when no offer is available', () => {
      renderWithLocale(
        <MovieList
          movies={[{ ...movies[0]!, watchProviders: [] }]}
          {...baseProps()}
          viewMode="list"
        />
      );
      expect(screen.getByText('Aucune offre')).toBeInTheDocument();
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
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Votre vote n’a pas été enregistré. Vérifiez votre connexion.'
      );
      await userEvent.click(
        screen.getByRole('button', { name: 'Réessayer le vote pour Inception' })
      );
      expect(onRetryVote).toHaveBeenCalledWith('m1');
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

    it('keeps the kebab on a device without hover capability, next to the poster link', () => {
      renderWithLocale(
        <MovieList movies={[movies[0]!]} {...baseProps()} isMobile viewMode="grid" />
      );
      expect(screen.getByRole('button', { name: /plus d’actions/i })).toBeInTheDocument();
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

    it('grid view: shows the subscription logo, or Location when the film can only be rented', () => {
      const { rerender } = renderWithLocale(
        <MovieList
          movies={[{ ...movies[0]!, watchProviders: mixedProviders }]}
          {...baseProps()}
          viewMode="grid"
        />
      );
      expect(screen.getByRole('img', { name: 'Netflix' })).toBeInTheDocument();
      expect(screen.queryByText('Location')).not.toBeInTheDocument();

      rerender(
        <MemoryRouter>
          <QueryClientWrapper>
            <LocaleProvider>
              <MovieList
                movies={[{ ...movies[0]!, watchProviders: rentBuyOnly }]}
                {...baseProps()}
                viewMode="grid"
              />
            </LocaleProvider>
          </QueryClientWrapper>
        </MemoryRouter>
      );
      expect(screen.getByText('Location')).toBeInTheDocument();
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

    it('once the wheel is locked, offers the host no movie removal the API would refuse', async () => {
      stubHoverCapability();
      renderWithLocale(
        <MovieList
          movies={[movies[0]!]}
          {...baseProps()}
          participantId="p0"
          participantPseudo="Hôte"
          isHost
          viewMode="grid"
          wheelLocked
        />
      );
      await userEvent.click(screen.getByRole('button', { name: /Plus d’actions/ }));
      expect(screen.getByRole('menuitem', { name: 'Voir les détails' })).toBeInTheDocument();
      expect(screen.queryByRole('menuitem', { name: /Retirer/ })).not.toBeInTheDocument();
    });

    it.each([
      ['on a computer', false],
      ['on a phone', true],
    ])('shows the pitch note to everyone in the list view %s', (_device, isMobile) => {
      renderWithLocale(
        <MovieList
          movies={[{ ...movies[0]!, pitchNote: 'Un casse dans les rêves' }]}
          {...baseProps()}
          isMobile={isMobile}
          viewMode="list"
        />
      );

      expect(screen.getByText('Un casse dans les rêves')).toBeInTheDocument();
    });

    it.each([
      ['on a computer', false],
      ['on a phone', true],
    ])('lets the proposer write a pitch note from the list view %s', async (_device, isMobile) => {
      renderWithLocale(
        <MovieList
          movies={[movies[0]!]}
          {...baseProps()}
          participantId="p1"
          participantPseudo="Alice"
          isMobile={isMobile}
          viewMode="list"
        />
      );

      await userEvent.click(screen.getByRole('button', { name: 'Ajouter une note' }));

      expect(screen.getByPlaceholderText('Vendez votre film en quelques mots…')).toHaveFocus();
    });

    it.each(['grid', 'list'] as const)(
      'lets the host take a pitch note down from the %s view',
      async (viewMode) => {
        stubHoverCapability();
        const onRemoveNote = vi.fn();
        const pitched = { ...movies[0]!, pitchNote: 'Un casse dans les rêves' };
        renderWithLocale(
          <MovieList
            movies={[pitched]}
            {...baseProps()}
            participantId="p2"
            participantPseudo="Bob"
            isHost
            viewMode={viewMode}
            onRemoveNote={onRemoveNote}
          />
        );

        expect(
          screen.queryByRole('button', { name: 'Supprimer la note sur Inception' })
        ).not.toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: /plus d’actions/i }));
        await userEvent.click(
          screen.getByRole('menuitem', { name: 'Supprimer la note sur Inception' })
        );

        expect(onRemoveNote).toHaveBeenCalledWith(pitched);
      }
    );

    it('lets the proposer take their own pitch note down, not the other guests', async () => {
      stubHoverCapability();
      const pitchedList = (participantId: string) => (
        <MemoryRouter>
          <QueryClientWrapper>
            <LocaleProvider>
              <MovieList
                movies={[{ ...movies[0]!, pitchNote: 'Un casse dans les rêves' }]}
                {...baseProps()}
                participantId={participantId}
                participantPseudo="Alice"
                viewMode="list"
                onRemoveNote={vi.fn()}
              />
            </LocaleProvider>
          </QueryClientWrapper>
        </MemoryRouter>
      );
      const { rerender } = render(pitchedList('p1'));
      await userEvent.click(screen.getByRole('button', { name: /plus d’actions/i }));
      expect(
        screen.getByRole('menuitem', { name: 'Supprimer la note sur Inception' })
      ).toBeInTheDocument();
      await userEvent.keyboard('{Escape}');

      rerender(pitchedList('p2'));
      await userEvent.click(screen.getByRole('button', { name: /plus d’actions/i }));
      expect(
        screen.queryByRole('menuitem', { name: 'Supprimer la note sur Inception' })
      ).not.toBeInTheDocument();
    });

    it('offers no removal of a pitch note once the wheel is locked', () => {
      renderWithLocale(
        <MovieList
          movies={[{ ...movies[0]!, pitchNote: 'Un casse dans les rêves' }]}
          {...baseProps()}
          isHost
          wheelLocked
          viewMode="list"
          onRemoveNote={vi.fn()}
        />
      );

      expect(
        screen.queryByRole('button', { name: 'Supprimer la note sur Inception' })
      ).not.toBeInTheDocument();
    });

    it('once the wheel is locked, offers the proposer no pitch note to add', () => {
      const proposerList = (wheelLocked: boolean) => (
        <MemoryRouter>
          <QueryClientWrapper>
            <LocaleProvider>
              <MovieList
                movies={[movies[0]!]}
                {...baseProps()}
                participantId="p1"
                participantPseudo="Alice"
                viewMode="grid"
                wheelLocked={wheelLocked}
              />
            </LocaleProvider>
          </QueryClientWrapper>
        </MemoryRouter>
      );
      const { rerender } = render(proposerList(false));
      expect(screen.getByRole('button', { name: 'Ajouter une note' })).toBeInTheDocument();

      rerender(proposerList(true));
      expect(screen.queryByRole('button', { name: 'Ajouter une note' })).not.toBeInTheDocument();
    });

    it('keeps the pitch note read-only for its proposer once the night is finished or the wheel locked', () => {
      const pitchedList = (state: { isFinished: boolean; wheelLocked: boolean }) => (
        <MemoryRouter>
          <QueryClientWrapper>
            <LocaleProvider>
              <MovieList
                movies={[{ ...movies[0]!, pitchNote: 'Un casse dans les rêves' }]}
                {...baseProps()}
                participantId="p1"
                participantPseudo="Alice"
                viewMode="grid"
                isFinished={state.isFinished}
                wheelLocked={state.wheelLocked}
              />
            </LocaleProvider>
          </QueryClientWrapper>
        </MemoryRouter>
      );
      const { rerender } = render(pitchedList({ isFinished: false, wheelLocked: false }));
      expect(screen.getByRole('button', { name: 'Un casse dans les rêves' })).toBeInTheDocument();

      rerender(pitchedList({ isFinished: true, wheelLocked: false }));
      expect(screen.getByText('Un casse dans les rêves')).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Un casse dans les rêves' })
      ).not.toBeInTheDocument();

      rerender(pitchedList({ isFinished: false, wheelLocked: true }));
      expect(screen.getByText('Un casse dans les rêves')).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Un casse dans les rêves' })
      ).not.toBeInTheDocument();
    });
  });
});
