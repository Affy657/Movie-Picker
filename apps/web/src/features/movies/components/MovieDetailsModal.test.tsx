import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MovieDetailsModal, {
  type MovieDetailsEventContext,
} from '@/features/movies/components/MovieDetailsModal';
import { useMovieDetails } from '@/features/movies/hooks/useMovieDetails';
import type { MovieData } from '@/shared/types/movie';
import { LocaleProvider } from '@/shared/i18n';

vi.mock('@/features/movies/hooks/useMovieDetails', () => ({ useMovieDetails: vi.fn() }));

const mockUseMovieDetails = vi.mocked(useMovieDetails);

function renderWithLocale(ui: React.ReactElement) {
  return render(<LocaleProvider>{ui}</LocaleProvider>);
}

const movie: MovieData = {
  id: 'm1',
  eventId: 'e1',
  participantId: 'p1',
  tmdbId: 27205,
  title: 'Inception',
  year: '2010',
  posterPath: null,
  proposerPseudo: 'Alice',
  score: 2,
  up: 3,
  down: 1,
  myVote: null,
  seenCount: 1,
  seenByPseudos: ['Bob'],
  votersUpPseudos: ['Alice', 'Bob', 'Tom'],
  createdAt: '2026-08-20T10:00:00.000Z',
};

function eventContext(overrides: Partial<MovieDetailsEventContext> = {}): MovieDetailsEventContext {
  return {
    movie,
    canAct: true,
    participantCount: 5,
    onVote: vi.fn(),
    iMarkedSeen: false,
    seenPending: false,
    onToggleSeen: vi.fn(),
    seenOthers: ['Bob'],
    seenOthersHint: 'Déjà vu par Bob.',
    proposerAvatarId: '',
    canRemove: true,
    isMine: true,
    isHost: false,
    onRemove: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseMovieDetails.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
  } as never);
});

describe('MovieDetailsModal', () => {
  it("ne rend rien tant que la modale n'est pas ouverte", () => {
    const { container } = renderWithLocale(
      <MovieDetailsModal open={false} title="Inception" tmdbId={27205} onClose={vi.fn()} />
    );
    expect(container.querySelector('[role="tablist"]')).not.toBeInTheDocument();
  });

  it("affiche l'en-tête avec titre, année, durée et note", () => {
    renderWithLocale(
      <MovieDetailsModal
        open
        title="Inception"
        year="2010"
        tmdbId={27205}
        runtimeLabel="2h28"
        voteLabel="3,6/5"
        onClose={vi.fn()}
      />
    );
    expect(screen.getByRole('heading', { name: 'Inception' })).toBeInTheDocument();
    expect(screen.getByText('2010')).toBeInTheDocument();
    expect(screen.getByText('2h28')).toBeInTheDocument();
    expect(screen.getByText('3,6/5')).toBeInTheDocument();
  });

  it('sans contexte de soirée : seulement deux onglets, ouverts sur « Le film »', () => {
    renderWithLocale(<MovieDetailsModal open title="Inception" tmdbId={27205} onClose={vi.fn()} />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((el) => el.textContent)).toEqual([
      expect.stringContaining('Le film'),
      expect.stringContaining('Où regarder'),
    ]);
    expect(screen.getByRole('tab', { name: /Le film/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('avec contexte de soirée : trois onglets, ouverts sur « La soirée »', () => {
    renderWithLocale(
      <MovieDetailsModal
        open
        title="Inception"
        tmdbId={27205}
        eventContext={eventContext()}
        onClose={vi.fn()}
      />
    );
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(3);
    expect(screen.getByRole('tab', { name: /La soirée/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('respecte un onglet initial explicite (ex. « Où regarder »)', () => {
    renderWithLocale(
      <MovieDetailsModal
        open
        title="Inception"
        tmdbId={27205}
        initialTab="dispo"
        eventContext={eventContext()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByRole('tab', { name: /Où regarder/ })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('onglet Le film : affiche la rangée de liens externes', () => {
    renderWithLocale(
      <MovieDetailsModal
        open
        title="Inception"
        year="2010"
        tmdbId={27205}
        initialTab="film"
        onClose={vi.fn()}
      />
    );
    expect(screen.getByRole('link', { name: /Letterboxd/i })).toHaveAttribute(
      'href',
      'https://letterboxd.com/tmdb/27205/'
    );
    expect(screen.getByRole('link', { name: /IMDb/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /AlloCiné/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /TMDB/i })).toBeInTheDocument();
  });

  it('changer d’onglet au clic affiche le panneau correspondant', async () => {
    renderWithLocale(
      <MovieDetailsModal
        open
        title="Inception"
        tmdbId={27205}
        eventContext={eventContext()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText('Score')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: /Où regarder/ }));
    expect(screen.queryByText('Score')).not.toBeInTheDocument();
    expect(screen.getByText(/pas en streaming/i)).toBeInTheDocument();
  });

  it('onglet La soirée : affiche le score, les votants « pour » et le proposeur', () => {
    renderWithLocale(
      <MovieDetailsModal
        open
        title="Inception"
        tmdbId={27205}
        eventContext={eventContext()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText('+2')).toBeInTheDocument();
    expect(screen.getByText('Alice, Bob, Tom')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('onglet La soirée : les boutons de vote appellent onVote avec 1 puis -1', async () => {
    const onVote = vi.fn();
    renderWithLocale(
      <MovieDetailsModal
        open
        title="Inception"
        tmdbId={27205}
        eventContext={eventContext({ onVote })}
        onClose={vi.fn()}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Voter pour' }));
    await userEvent.click(screen.getByRole('button', { name: 'Voter contre' }));
    expect(onVote).toHaveBeenNthCalledWith(1, 1);
    expect(onVote).toHaveBeenNthCalledWith(2, -1);
  });

  it('onglet La soirée : masque le bloc « Mon vote » quand canAct est faux', () => {
    renderWithLocale(
      <MovieDetailsModal
        open
        title="Inception"
        tmdbId={27205}
        eventContext={eventContext({ canAct: false })}
        onClose={vi.fn()}
      />
    );
    expect(screen.queryByText('Mon vote')).not.toBeInTheDocument();
  });

  it('pied de page : bascule la liste, exclut du tirage et retire de la soirée', async () => {
    const onToggleWatchlist = vi.fn();
    const onToggle = vi.fn();
    const onRemove = vi.fn();
    renderWithLocale(
      <MovieDetailsModal
        open
        title="Inception"
        tmdbId={27205}
        eventContext={eventContext({
          onToggleWatchlist,
          wheelExclusion: { excluded: false, onToggle },
          onRemove,
        })}
        onClose={vi.fn()}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter à ma liste' }));
    expect(onToggleWatchlist).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: 'Exclure du tirage' }));
    expect(onToggle).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: /Retirer/ }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('pied de page : aucune action affichée sans contexte de soirée', () => {
    renderWithLocale(<MovieDetailsModal open title="Inception" tmdbId={27205} onClose={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Ajouter à ma liste' })).not.toBeInTheDocument();
  });

  it('sans watchProviders fournis (ex. depuis Ma liste) : récupère les disponibilités via useMovieDetails', () => {
    mockUseMovieDetails.mockReturnValue({
      data: {
        tmdbId: 27205,
        overview: null,
        tagline: null,
        director: null,
        cast: [],
        runtimeMinutes: null,
        genres: [],
        releaseDate: null,
        trailerUrl: null,
        watchProviders: [{ providerId: 8, name: 'Netflix', logoPath: null, type: 'flatrate' }],
        tmdbWatchPageUrl: 'https://www.themoviedb.org/movie/27205/watch',
      },
      isLoading: false,
      isError: false,
    } as never);

    renderWithLocale(
      <MovieDetailsModal
        open
        title="Inception"
        tmdbId={27205}
        initialTab="dispo"
        onClose={vi.fn()}
      />
    );

    expect(screen.getByRole('tab', { name: /Où regarder/ })).toHaveTextContent('1');
    expect(screen.getByText('Netflix')).toBeInTheDocument();
  });

  it('avec watchProviders fournis (ex. carte de soirée déjà enrichie) : ignore useMovieDetails', () => {
    mockUseMovieDetails.mockReturnValue({
      data: {
        tmdbId: 27205,
        overview: null,
        tagline: null,
        director: null,
        cast: [],
        runtimeMinutes: null,
        genres: [],
        releaseDate: null,
        trailerUrl: null,
        watchProviders: [{ providerId: 8, name: 'Netflix', logoPath: null, type: 'flatrate' }],
        tmdbWatchPageUrl: 'https://www.themoviedb.org/movie/27205/watch',
      },
      isLoading: false,
      isError: false,
    } as never);

    renderWithLocale(
      <MovieDetailsModal
        open
        title="Inception"
        tmdbId={27205}
        initialTab="dispo"
        watchProviders={[]}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText(/pas en streaming/i)).toBeInTheDocument();
    expect(screen.queryByText('Netflix')).not.toBeInTheDocument();
  });

  it('le bouton fermer appelle onClose', async () => {
    const onClose = vi.fn();
    renderWithLocale(<MovieDetailsModal open title="Inception" tmdbId={27205} onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: /fermer/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
