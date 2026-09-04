import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MovieList from '@/features/movies/components/MovieList';
import type { MovieData, WatchProviderOffer } from '@/shared/types/movie';
import { LocaleProvider } from '@/shared/i18n';
import { QueryClientWrapper } from '@/test-utils/queryWrapper';

vi.mock('@/features/movies/components/MovieDetailsModal', () => ({
  default: ({ open, initialTab }: { open: boolean; initialTab?: string }) =>
    open ? <div data-testid="details-modal-open" data-tab={initialTab} /> : null,
}));

function renderWithLocale(ui: React.ReactElement) {
  return render(
    <QueryClientWrapper>
      <LocaleProvider>{ui}</LocaleProvider>
    </QueryClientWrapper>
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
  it('affiche un placeholder si liste vide', () => {
    renderWithLocale(<MovieList movies={[]} {...baseProps()} />);
    expect(screen.getByText(/aucun film proposé/i)).toBeInTheDocument();
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
        <QueryClientWrapper>
          <LocaleProvider>
            <MovieList movies={movies} {...baseProps()} viewMode="list" showRank />
          </LocaleProvider>
        </QueryClientWrapper>
      );
      const ranks = screen.getAllByTestId('movie-rank');
      expect(ranks.map((el) => el.textContent)).toEqual(['1', '2']);
    });

    it("affiche l'en-tête de colonnes triable quand showHeader et le tri sont fournis", async () => {
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

    it("n'affiche pas l'en-tête quand showHeader est faux", () => {
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

    it("n'affiche pas l'en-tête sur mobile", () => {
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

    it('affiche le badge gagnant uniquement sur le film désigné', () => {
      renderWithLocale(
        <MovieList movies={movies} {...baseProps()} viewMode="list" winnerMovieId="m1" />
      );
      expect(screen.getByText('Film gagnant')).toBeInTheDocument();
      expect(screen.getAllByText('Film gagnant')).toHaveLength(1);
    });

    it('affiche vote et déjà-vu en vue liste avec participantId', async () => {
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

    it('masque les boutons de vote et affiche un décompte en lecture seule quand la soirée est terminée', () => {
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

    it('plafonne les plateformes affichées et propose un badge de dépassement unifié', async () => {
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

    it("affiche un libellé quand aucune offre n'est disponible", () => {
      renderWithLocale(
        <MovieList
          movies={[{ ...movies[0]!, watchProviders: [] }]}
          {...baseProps()}
          viewMode="list"
        />
      );
      expect(screen.getByText(/pas en streaming/i)).toBeInTheDocument();
    });

    it('barre de répartition : proportionne les segments pour/contre et expose le détail en infobulle', () => {
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

    it('barre de répartition : aucun segment tant qu’aucun vote n’a été exprimé', () => {
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

    it("échec de vote : affiche l'erreur sur la ligne concernée avec un bouton Réessayer", async () => {
      const onRetryVote = vi.fn();
      renderWithLocale(
        <MovieList
          movies={movies}
          {...baseProps()}
          participantId="p0"
          participantPseudo="Alice"
          viewMode="list"
          voteErrors={{ m1: { message: 'Ton vote n’a pas été enregistré. Vérifie ta connexion.' } }}
          onRetryVote={onRetryVote}
        />
      );
      expect(
        screen.getByText('Ton vote n’a pas été enregistré. Vérifie ta connexion.')
      ).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: /réessayer/i }));
      expect(onRetryVote).toHaveBeenCalledWith('m1');
    });

    it('ligne mobile : bascule sur un chevron de divulgation, pas de menu à trois points', () => {
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

    it('affiche aussi le menu kebab sur mobile', () => {
      renderWithLocale(
        <MovieList movies={[movies[0]!]} {...baseProps()} isMobile viewMode="grid" />
      );
      expect(screen.getByRole('button', { name: /plus d’actions/i })).toBeInTheDocument();
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

    it('vue grille : sépare la location et l’achat du flatrate dans deux pastilles distinctes qui ouvrent la modale', async () => {
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
      const modal = screen.getByTestId('details-modal-open');
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

    it('mode sélection en vue grille : neutralise aussi les actions habituelles', () => {
      renderWithLocale(
        <MovieList
          movies={[movies[0]!]}
          {...baseProps()}
          participantId="p0"
          participantPseudo="Alice"
          viewMode="grid"
          selection={{ active: true, onSelect: vi.fn() }}
        />
      );
      const pickButton = screen.getByTestId('manual-pick-m1');
      expect(pickButton).toBeInTheDocument();
      const voteButton = screen.getByRole('button', { name: /^Voter pour/ });
      expect(voteButton.closest('[inert]')).not.toBeNull();
    });

    it('menu kebab : propose « Exclure du tirage » et appelle le callback avec le film', async () => {
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

    it('menu kebab : bascule sur « Réintégrer au tirage » pour un film déjà exclu', async () => {
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

    it('film exclu : annonce son état aux lecteurs d’écran', () => {
      renderWithLocale(
        <MovieList
          movies={[{ ...movies[0]!, excludedFromWheel: true }]}
          {...baseProps()}
          viewMode="grid"
        />
      );
      expect(screen.getByText('Film exclu du tirage')).toBeInTheDocument();
    });

    it('mode sélection : un film exclu n’est pas sélectionnable', () => {
      renderWithLocale(
        <MovieList
          movies={[{ ...movies[0]!, excludedFromWheel: true }, movies[1]!]}
          {...baseProps()}
          viewMode="grid"
          selection={{ active: true, onSelect: vi.fn() }}
        />
      );
      expect(screen.queryByTestId('manual-pick-m1')).not.toBeInTheDocument();
      expect(screen.getByTestId('manual-pick-m2')).toBeInTheDocument();
    });

    it('mode sélection : cliquer sur une carte appelle onSelect avec le bon film', async () => {
      const onSelect = vi.fn();
      renderWithLocale(
        <MovieList
          movies={movies}
          {...baseProps()}
          viewMode="grid"
          selection={{ active: true, onSelect }}
        />
      );
      await userEvent.click(screen.getByTestId('manual-pick-m2'));
      expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'm2', title: 'Matrix' }));
    });
  });
});
