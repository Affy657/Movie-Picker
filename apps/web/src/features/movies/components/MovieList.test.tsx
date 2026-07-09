import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MovieList from '@/features/movies/components/MovieList';
import type { MovieData, WatchProviderOffer } from '@/shared/types/movie';
import { LocaleProvider } from '@/shared/i18n';
import { QueryClientWrapper } from '@/test-utils/queryWrapper';

vi.mock('@/features/movies/api/moviesApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/movies/api/moviesApi')>();
  return {
    ...actual,
    setMoviePitchNote: vi.fn().mockResolvedValue(undefined),
    deleteMoviePitchNote: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock('@/features/movies/components/WatchProvidersModal', () => ({
  default: ({ open }: { open: boolean }) =>
    open ? <div data-testid="providers-modal-open" /> : null,
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

describe('MovieList', () => {
  it('affiche un placeholder si liste vide', () => {
    renderWithLocale(
      <MovieList
        movies={[]}
        slug="s"
        participantId={null}
        participantPseudo={null}
        isFinished={false}
        onVote={vi.fn()}
        onRemove={vi.fn()}
        refresh={vi.fn()}
        onActionError={vi.fn()}
      />
    );
    expect(screen.getByText(/aucun film proposé/i)).toBeInTheDocument();
  });

  it('affiche la liste des films avec titre et score', () => {
    renderWithLocale(
      <MovieList
        movies={movies}
        slug="s"
        participantId={null}
        participantPseudo={null}
        isFinished={false}
        onVote={vi.fn()}
        onRemove={vi.fn()}
        refresh={vi.fn()}
        onActionError={vi.fn()}
      />
    );
    expect(screen.getByText('Inception')).toBeInTheDocument();
    expect(screen.getByText('Matrix')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('affiche l’indication « déjà vu par d’autres » quand seenByPseudos contient d’autres participants', () => {
    const withSeen: MovieData[] = [
      {
        ...movies[0]!,
        proposerPseudo: 'Charlie',
        seenCount: 2,
        seenByPseudos: ['Alice', 'Bob'],
      },
    ];
    renderWithLocale(
      <MovieList
        movies={withSeen}
        slug="s"
        participantId="p0"
        participantPseudo="Bob"
        isFinished={false}
        onVote={vi.fn()}
        onRemove={vi.fn()}
        refresh={vi.fn()}
        onActionError={vi.fn()}
      />
    );
    expect(screen.getByText(/Déjà vu par Alice/)).toBeInTheDocument();
  });

  it('affiche la durée formatée (2h28) et la note convertie sur 5 (sans préfixe « TMDB »)', () => {
    const withRuntime: MovieData[] = [
      {
        ...movies[0]!,
        voteAverage: 8.4,
        runtimeMinutes: 148,
      },
    ];
    renderWithLocale(
      <MovieList
        movies={withRuntime}
        slug="s"
        participantId={null}
        participantPseudo={null}
        isFinished={false}
        onVote={vi.fn()}
        onRemove={vi.fn()}
        refresh={vi.fn()}
        onActionError={vi.fn()}
      />
    );
    expect(screen.getByText(/2h28/)).toBeInTheDocument();
    expect(screen.getByText(/4\.2\/5/)).toBeInTheDocument();
    expect(screen.queryByText(/TMDB\s*\d/)).not.toBeInTheDocument();
  });

  it('affiche les boutons vote up/down + déjà vu quand pas terminé et participantId', async () => {
    const onVote = vi.fn().mockResolvedValue(undefined);
    renderWithLocale(
      <MovieList
        movies={movies}
        slug="s"
        participantId="p0"
        participantPseudo={null}
        isFinished={false}
        onVote={onVote}
        onRemove={vi.fn()}
        refresh={vi.fn()}
        onActionError={vi.fn()}
      />
    );
    const upButtons = screen.getAllByRole('button', { name: /^Voter pour / });
    await userEvent.click(upButtons[0]!);
    expect(onVote).toHaveBeenCalledWith('m1', 1);
    expect(screen.getAllByRole('button', { name: /Marquer « déjà vu »/ })).toHaveLength(2);
  });

  it('affiche la note de pitch quand pitchNote est définie', () => {
    const withPitch: MovieData[] = [{ ...movies[0]!, pitchNote: 'Film incontournable !' }];
    renderWithLocale(
      <MovieList
        movies={withPitch}
        slug="s"
        participantId={null}
        participantPseudo={null}
        isFinished={false}
        onVote={vi.fn()}
        onRemove={vi.fn()}
        refresh={vi.fn()}
        onActionError={vi.fn()}
      />
    );
    expect(screen.getByText('Film incontournable !')).toBeInTheDocument();
  });

  it("ouvre l'éditeur en cliquant sur sa propre note de pitch", async () => {
    const withPitch: MovieData[] = [{ ...movies[0]!, pitchNote: 'Mon pitch' }];
    renderWithLocale(
      <MovieList
        movies={withPitch}
        slug="s"
        participantId="p1"
        participantPseudo="Alice"
        isFinished={false}
        onVote={vi.fn()}
        onRemove={vi.fn()}
        refresh={vi.fn()}
        onActionError={vi.fn()}
      />
    );
    await userEvent.click(screen.getByText('Mon pitch'));
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it("affiche le bouton Ajouter une note et ouvre l'éditeur au clic", async () => {
    renderWithLocale(
      <MovieList
        movies={[movies[0]!]}
        slug="s"
        participantId="p1"
        participantPseudo="Alice"
        isFinished={false}
        onVote={vi.fn()}
        onRemove={vi.fn()}
        refresh={vi.fn()}
        onActionError={vi.fn()}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: /Ajouter une note/i }));
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it("enregistre une nouvelle note et ferme l'éditeur", async () => {
    const { setMoviePitchNote } = await import('@/features/movies/api/moviesApi');
    const refresh = vi.fn();
    renderWithLocale(
      <MovieList
        movies={[movies[0]!]}
        slug="test-slug"
        participantId="p1"
        participantPseudo="Alice"
        isFinished={false}
        onVote={vi.fn()}
        onRemove={vi.fn()}
        refresh={refresh}
        onActionError={vi.fn()}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: /Ajouter une note/i }));
    await userEvent.type(screen.getByRole('textbox'), 'Super film');
    await userEvent.click(screen.getByText(/Enregistrer/i));
    expect(setMoviePitchNote).toHaveBeenCalledWith('test-slug', 'm1', 'p1', 'Super film');
    expect(refresh).toHaveBeenCalled();
  });

  it('affiche les films en vue liste (MovieCardList)', () => {
    renderWithLocale(
      <MovieList
        movies={movies}
        slug="s"
        participantId={null}
        participantPseudo={null}
        isFinished={false}
        onVote={vi.fn()}
        onRemove={vi.fn()}
        refresh={vi.fn()}
        onActionError={vi.fn()}
        viewMode="list"
      />
    );
    expect(screen.getByText('Inception')).toBeInTheDocument();
    expect(screen.getByText('Matrix')).toBeInTheDocument();
  });

  it('affiche vote et déjà-vu en vue liste avec participantId', async () => {
    const onVote = vi.fn().mockResolvedValue(undefined);
    renderWithLocale(
      <MovieList
        movies={movies}
        slug="s"
        participantId="p0"
        participantPseudo="Alice"
        isFinished={false}
        onVote={onVote}
        onRemove={vi.fn()}
        refresh={vi.fn()}
        onActionError={vi.fn()}
        viewMode="list"
      />
    );
    const upButtons = screen.getAllByRole('button', { name: /^Voter pour / });
    await userEvent.click(upButtons[0]!);
    expect(onVote).toHaveBeenCalledWith('m1', 1);
    expect(screen.getAllByRole('button', { name: /Marquer « déjà vu »/ })).toHaveLength(2);
  });

  it('masque vote et déjà-vu en vue liste quand soirée terminée', () => {
    renderWithLocale(
      <MovieList
        movies={movies}
        slug="s"
        participantId="p0"
        participantPseudo="Alice"
        isFinished
        onVote={vi.fn()}
        onRemove={vi.fn()}
        refresh={vi.fn()}
        onActionError={vi.fn()}
        viewMode="list"
      />
    );
    expect(screen.queryByRole('button', { name: /Voter pour/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Marquer/ })).not.toBeInTheDocument();
  });

  it('reflète myVote sur les boutons (aria-pressed) et expose un libellé « retirer » au reclic', () => {
    const voted: MovieData[] = [
      { ...movies[0]!, myVote: 1 },
      { ...movies[1]!, myVote: -1 },
    ];
    renderWithLocale(
      <MovieList
        movies={voted}
        slug="s"
        participantId="p0"
        participantPseudo={null}
        isFinished={false}
        onVote={vi.fn()}
        onRemove={vi.fn()}
        refresh={vi.fn()}
        onActionError={vi.fn()}
      />
    );

    const upPressed = screen.getByRole('button', { name: /Retirer mon vote pour « Inception »/ });
    expect(upPressed).toHaveAttribute('aria-pressed', 'true');

    const downPressed = screen.getByRole('button', { name: /Retirer mon vote contre « Matrix »/ });
    expect(downPressed).toHaveAttribute('aria-pressed', 'true');

    const upNeutral = screen.getByRole('button', { name: /^Voter pour Matrix/ });
    expect(upNeutral).toHaveAttribute('aria-pressed', 'false');
  });

  it('vue liste : abonnement seul → chips flatrate, aucune pastille location/achat', () => {
    renderWithLocale(
      <MovieList
        movies={[{ ...movies[0]!, watchProviders: flatrateOnly }]}
        slug="s"
        participantId={null}
        participantPseudo={null}
        isFinished={false}
        onVote={vi.fn()}
        onRemove={vi.fn()}
        refresh={vi.fn()}
        onActionError={vi.fn()}
        viewMode="list"
      />
    );
    expect(screen.getByText('Netflix')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Location/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Achat/ })).not.toBeInTheDocument();
  });

  it('vue liste : sépare la location et l’achat du flatrate dans deux pastilles distinctes qui ouvrent la modale', async () => {
    renderWithLocale(
      <MovieList
        movies={[{ ...movies[0]!, watchProviders: mixedProviders }]}
        slug="s"
        participantId={null}
        participantPseudo={null}
        isFinished={false}
        onVote={vi.fn()}
        onRemove={vi.fn()}
        refresh={vi.fn()}
        onActionError={vi.fn()}
        viewMode="list"
      />
    );
    expect(screen.getByText('Netflix')).toBeInTheDocument();
    const rentBtn = screen.getByRole('button', { name: /Location/ });
    const buyBtn = screen.getByRole('button', { name: /Achat/ });
    expect(screen.queryByTestId('providers-modal-open')).not.toBeInTheDocument();
    await userEvent.click(rentBtn);
    expect(screen.getByTestId('providers-modal-open')).toBeInTheDocument();
    expect(buyBtn).toBeInTheDocument();
  });

  it('vue liste : sans abonnement, affiche uniquement les pastilles location/achat', () => {
    renderWithLocale(
      <MovieList
        movies={[{ ...movies[0]!, watchProviders: rentBuyOnly }]}
        slug="s"
        participantId={null}
        participantPseudo={null}
        isFinished={false}
        onVote={vi.fn()}
        onRemove={vi.fn()}
        refresh={vi.fn()}
        onActionError={vi.fn()}
        viewMode="list"
      />
    );
    expect(screen.queryByText('Netflix')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Location/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Achat/ })).toBeInTheDocument();
  });

  it('vue liste : type de plateforme inconnu uniquement → retombe sur le message vide plutôt qu’une zone blanche', () => {
    renderWithLocale(
      <MovieList
        movies={[
          {
            ...movies[0]!,
            watchProviders: [{ providerId: 999, name: 'Mystère', logoPath: null, type: 'ads' }],
          },
        ]}
        slug="s"
        participantId={null}
        participantPseudo={null}
        isFinished={false}
        onVote={vi.fn()}
        onRemove={vi.fn()}
        refresh={vi.fn()}
        onActionError={vi.fn()}
        viewMode="list"
      />
    );
    expect(screen.getByText(/pas en streaming/i)).toBeInTheDocument();
  });
});
