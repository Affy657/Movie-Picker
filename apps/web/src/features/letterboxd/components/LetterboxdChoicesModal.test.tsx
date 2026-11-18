import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import LetterboxdChoicesModal from './LetterboxdChoicesModal';
import modalStyles from '@/shared/components/Modal.module.css';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { createLetterboxdConfirmHandler, TEST_API_V1 } from '@/mocks/handlers';
import type { LetterboxdPendingChoice } from '@/features/letterboxd/api/letterboxdApi';

const ONE_CHOICE: LetterboxdPendingChoice[] = [
  {
    rowIndex: 1,
    title: 'Midnight Mass',
    year: '2021',
    letterboxdSlug: 'midnight-mass-2021',
    target: 'watchlist',
    rating: null,
    watchedOn: null,
    candidates: [
      {
        tmdbId: 97400,
        mediaType: 'tv',
        title: 'Sermons de minuit',
        year: '2021',
        posterPath: null,
        voteAverage: 7.5,
        genreIds: [18, 9648],
        runtimeMinutes: null,
      },
      {
        tmdbId: 714995,
        mediaType: 'movie',
        title: 'The Manson Brothers',
        year: '2021',
        posterPath: null,
        voteAverage: 4.2,
        genreIds: [],
        runtimeMinutes: null,
      },
    ],
  },
];

const TWO_CHOICES: LetterboxdPendingChoice[] = [
  ...ONE_CHOICE,
  {
    rowIndex: 2,
    title: 'Spider-Man',
    year: '1977',
    letterboxdSlug: 'spider-man-1977',
    target: 'watchlist',
    rating: null,
    watchedOn: null,
    candidates: [
      {
        tmdbId: 1,
        mediaType: 'movie',
        title: 'Spider-Man',
        year: '1977',
        posterPath: null,
        voteAverage: 5.1,
        genreIds: [],
        runtimeMinutes: 94,
      },
    ],
  },
];

const WATCHED_CHOICE: LetterboxdPendingChoice = {
  rowIndex: 5000,
  title: 'Alien',
  year: '1979',
  letterboxdSlug: 'alien',
  target: 'watched',
  rating: 8,
  watchedOn: '2019-10-12',
  candidates: [
    {
      tmdbId: 348,
      mediaType: 'movie',
      title: 'Alien, le huitième passager',
      year: '1979',
      posterPath: null,
      voteAverage: 8.1,
      genreIds: [27, 878],
      runtimeMinutes: 117,
    },
  ],
};

function renderModal(
  choices: LetterboxdPendingChoice[] = ONE_CHOICE,
  onConfirmed: (
    result: { added: number; alreadyPresent: number },
    unresolved: LetterboxdPendingChoice[]
  ) => void = () => undefined,
  onClose = () => undefined
) {
  return render(
    <AppTestProviders>
      <LetterboxdChoicesModal open choices={choices} onClose={onClose} onConfirmed={onConfirmed} />
    </AppTestProviders>
  );
}

describe('LetterboxdChoicesModal (MSW)', () => {
  const server = setupServer();

  beforeAll(() => {
    server.listen({ onUnhandledFrame: 'error' });
    if (!HTMLDialogElement.prototype.showModal) {
      HTMLDialogElement.prototype.showModal = function showModal() {
        this.setAttribute('open', '');
      };
    }
    if (!HTMLDialogElement.prototype.close) {
      HTMLDialogElement.prototype.close = function close() {
        this.removeAttribute('open');
        this.dispatchEvent(new Event('close'));
      };
    }
  });
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('shows one title at a time with the candidates, none preselected', () => {
    renderModal(ONE_CHOICE);

    expect(screen.getByRole('heading', { name: 'Un titre à confirmer' })).toBeInTheDocument();
    expect(screen.getByText('Midnight Mass')).toBeInTheDocument();
    expect(screen.getByText('Letterboxd, 2021')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Sermons de minuit/ })).toHaveAttribute(
      'aria-checked',
      'false'
    );
    expect(screen.getByRole('button', { name: 'Confirmer et terminer' })).toBeDisabled();
  });

  it('scrolls the title and its candidates above a footer that wraps its actions', () => {
    renderModal(TWO_CHOICES);

    const body = screen.getByText('Midnight Mass').closest(`.${modalStyles.body}`);
    expect(body).not.toBeNull();
    expect(body).toContainElement(screen.getByRole('radio', { name: /Sermons de minuit/ }));

    const next = screen.getByRole('button', { name: 'Confirmer et suivant' });
    expect(body).not.toContainElement(next);
    const actions = next.closest<HTMLElement>(`.${modalStyles.actions}`);
    expect(actions).not.toBeNull();
    expect(actions?.lastElementChild).toBe(next);
    expect(within(actions!).getByRole('button', { name: 'Passer' })).toBeInTheDocument();

    const footer = actions!.closest(`.${modalStyles.footer}`);
    expect(footer).toContainElement(screen.getByRole('button', { name: 'Décider plus tard' }));
  });

  it('confirms the selected choice and reports the result on the last title', async () => {
    const user = userEvent.setup();
    let received: unknown;

    server.use(
      http.post(`${TEST_API_V1}/letterboxd/confirm`, async ({ request }) => {
        received = (await request.json()) as { selections: unknown };
        return HttpResponse.json({ added: 1, alreadyPresent: 0, pendingReconciliationCount: 0 });
      })
    );

    const onConfirmed = (result: { added: number; alreadyPresent: number }) => {
      expect(result).toEqual({
        added: 1,
        alreadyPresent: 0,
        watchedAdded: 0,
        watchedAlreadyPresent: 0,
        pendingReconciliationCount: 0,
      });
    };
    renderModal(ONE_CHOICE, onConfirmed);

    await user.click(screen.getByRole('radio', { name: /Sermons de minuit/ }));
    await user.click(screen.getByRole('button', { name: 'Confirmer et terminer' }));

    await waitFor(() =>
      expect(received).toEqual({
        selections: [
          {
            tmdbId: 97400,
            mediaType: 'tv',
            title: 'Sermons de minuit',
            year: '2021',
            posterPath: null,
            voteAverage: 7.5,
            genreIds: [18, 9648],
            runtimeMinutes: null,
            letterboxdSlug: 'midnight-mass-2021',
          },
        ],
        watchedSelections: [],
        remainingUnresolvedCount: 0,
      })
    );
  });

  it('permet de refuser explicitement un titre via « aucun de ces films »', async () => {
    const user = userEvent.setup();
    renderModal(ONE_CHOICE);

    await user.click(screen.getByRole('radio', { name: 'Aucun de ces films, ignorer ce titre' }));

    expect(screen.getByRole('button', { name: 'Confirmer et terminer' })).toBeEnabled();
  });

  it('moves to the next title and sends every answer on the last screen', async () => {
    const user = userEvent.setup();
    let received: unknown;

    server.use(
      http.post(`${TEST_API_V1}/letterboxd/confirm`, async ({ request }) => {
        received = (await request.json()) as { selections: unknown };
        return HttpResponse.json({ added: 1, alreadyPresent: 0, pendingReconciliationCount: 0 });
      })
    );

    renderModal(TWO_CHOICES);

    expect(
      screen.getByText('Titre 1 sur 2. Lequel de ces films correspond à votre entrée Letterboxd ?')
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Passer' }));

    expect(
      screen.getByText('Titre 2 sur 2. Lequel de ces films correspond à votre entrée Letterboxd ?')
    ).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: /Spider-Man/ }));
    await user.click(screen.getByRole('button', { name: 'Confirmer et terminer' }));

    await waitFor(() =>
      expect(received).toEqual({
        selections: [
          {
            tmdbId: 1,
            mediaType: 'movie',
            title: 'Spider-Man',
            year: '1977',
            posterPath: null,
            voteAverage: 5.1,
            genreIds: [],
            runtimeMinutes: 94,
            letterboxdSlug: 'spider-man-1977',
          },
        ],
        watchedSelections: [],
        remainingUnresolvedCount: 1,
      })
    );
  });

  it.each([
    { how: 'skipped with Passer', settle: 'skip' as const },
    { how: 'refused with « aucun de ces films »', settle: 'none' as const },
  ])(
    'reports a title $how as still pending, as the count sent to the API does',
    async ({ settle }) => {
      const user = userEvent.setup();
      let received: { remainingUnresolvedCount: number } | undefined;
      let unresolvedTitles: string[] | undefined;

      server.use(
        http.post(`${TEST_API_V1}/letterboxd/confirm`, async ({ request }) => {
          received = (await request.json()) as { remainingUnresolvedCount: number };
          return HttpResponse.json({ added: 1, alreadyPresent: 0, pendingReconciliationCount: 1 });
        })
      );

      renderModal(TWO_CHOICES, (_result, unresolved) => {
        unresolvedTitles = unresolved.map((choice) => choice.title);
      });

      if (settle === 'skip') {
        await user.click(screen.getByRole('button', { name: 'Passer' }));
      } else {
        await user.click(
          screen.getByRole('radio', { name: 'Aucun de ces films, ignorer ce titre' })
        );
        await user.click(screen.getByRole('button', { name: 'Confirmer et suivant' }));
      }
      await user.click(screen.getByRole('radio', { name: /Spider-Man/ }));
      await user.click(screen.getByRole('button', { name: 'Confirmer et terminer' }));

      await waitFor(() => expect(unresolvedTitles).toEqual(['Midnight Mass']));
      expect(received?.remainingUnresolvedCount).toBe(1);
    }
  );

  it('tells a title for À voir from a film vu, with the date and rating of the film vu', async () => {
    const user = userEvent.setup();
    renderModal([...ONE_CHOICE, WATCHED_CHOICE]);

    expect(screen.getByText('À voir')).toBeInTheDocument();
    expect(screen.queryByText('Films vus')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Passer' }));

    expect(screen.getByText('Films vus')).toBeInTheDocument();
    expect(screen.getByText('Vu le 12 oct. 2019, noté 4/5')).toBeInTheDocument();
  });

  it.each([
    { what: 'a date only', rating: null, watchedOn: '2019-10-12', shown: 'Vu le 12 oct. 2019' },
    { what: 'a rating only', rating: 7, watchedOn: null, shown: 'Noté 3,5/5' },
  ])('describes a film vu with $what', ({ rating, watchedOn, shown }) => {
    renderModal([{ ...WATCHED_CHOICE, rating, watchedOn }]);

    expect(screen.getByText(shown)).toBeInTheDocument();
  });

  it('sends a confirmed film vu apart, with its rating and date', async () => {
    const user = userEvent.setup();
    let received: unknown;
    server.use(
      createLetterboxdConfirmHandler(
        (body) => {
          received = body;
        },
        { watchedAdded: 1 }
      )
    );

    renderModal([...ONE_CHOICE, WATCHED_CHOICE]);

    await user.click(screen.getByRole('button', { name: 'Passer' }));
    await user.click(screen.getByRole('radio', { name: /Alien, le huitième passager/ }));
    await user.click(screen.getByRole('button', { name: 'Confirmer et terminer' }));

    await waitFor(() =>
      expect(received).toEqual({
        selections: [],
        watchedSelections: [
          {
            tmdbId: 348,
            mediaType: 'movie',
            title: 'Alien, le huitième passager',
            year: '1979',
            posterPath: null,
            voteAverage: 8.1,
            runtimeMinutes: 117,
            genreIds: [27, 878],
            letterboxdSlug: 'alien',
            rating: 8,
            watchedOn: '2019-10-12',
          },
        ],
        remainingUnresolvedCount: 1,
      })
    );
  });

  it('allows deciding later by sending only the titles already settled', async () => {
    const user = userEvent.setup();
    let received: unknown;

    server.use(
      http.post(`${TEST_API_V1}/letterboxd/confirm`, async ({ request }) => {
        received = (await request.json()) as { selections: unknown };
        return HttpResponse.json({ added: 1, alreadyPresent: 0, pendingReconciliationCount: 1 });
      })
    );

    const onConfirmed = (
      result: { added: number; alreadyPresent: number },
      unresolved: LetterboxdPendingChoice[]
    ) => {
      expect(result).toEqual({
        added: 1,
        alreadyPresent: 0,
        watchedAdded: 0,
        watchedAlreadyPresent: 0,
        pendingReconciliationCount: 1,
      });
      expect(unresolved.map((c) => c.title)).toEqual(['Spider-Man']);
    };
    renderModal(TWO_CHOICES, onConfirmed);

    await user.click(screen.getByRole('radio', { name: /Sermons de minuit/ }));
    await user.click(screen.getByRole('button', { name: 'Décider plus tard' }));

    await waitFor(() =>
      expect(received).toEqual({
        selections: [
          {
            tmdbId: 97400,
            mediaType: 'tv',
            title: 'Sermons de minuit',
            year: '2021',
            posterPath: null,
            voteAverage: 7.5,
            genreIds: [18, 9648],
            runtimeMinutes: null,
            letterboxdSlug: 'midnight-mass-2021',
          },
        ],
        watchedSelections: [],
        remainingUnresolvedCount: 1,
      })
    );
  });
});
