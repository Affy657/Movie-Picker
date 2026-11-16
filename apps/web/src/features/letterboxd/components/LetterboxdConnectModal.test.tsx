import { describe, it, expect, beforeAll, afterEach, afterAll, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import LetterboxdConnectModal from './LetterboxdConnectModal';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import {
  createLetterboxdConfirmHandler,
  createLetterboxdSyncHandler,
  TEST_API_V1,
} from '@/mocks/handlers';

function renderModal() {
  return render(
    <AppTestProviders>
      <LetterboxdConnectModal open onClose={() => undefined} />
    </AppTestProviders>
  );
}

const authedUserHandler = http.get(`${TEST_API_V1}/auth/me`, () =>
  HttpResponse.json({
    userId: 'u1',
    displayName: 'Alice',
    emailMasked: 'a***@test.local',
    uiTheme: 'system',
    accentColor: 'default',
    ratingScale: 'ten',
    letterboxdUsername: null,
  })
);

function patchMeHandler() {
  return http.patch(`${TEST_API_V1}/auth/me`, async ({ request }) => {
    const body = (await request.json()) as { letterboxdUsername?: string | null };
    return HttpResponse.json({
      userId: 'u1',
      displayName: 'Alice',
      emailMasked: 'a***@test.local',
      letterboxdUsername: body.letterboxdUsername ?? null,
    });
  });
}

describe('LetterboxdConnectModal (MSW)', () => {
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
  beforeEach(() => {
    localStorage.setItem('moviepicker-locale', 'fr');
  });
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('connecte puis affiche le bilan directement quand rien n’est ambigu', async () => {
    const user = userEvent.setup();
    server.use(
      authedUserHandler,
      patchMeHandler(),
      http.post(`${TEST_API_V1}/letterboxd/sync`, () =>
        HttpResponse.json({
          skipped: false,
          added: 3,
          removed: 0,
          unmatchedTitles: [],
          pendingChoices: [],
          totalOnLetterboxd: 3,
          totalTruncated: 0,
        })
      )
    );

    renderModal();

    await user.type(screen.getByLabelText('Pseudo Letterboxd'), 'affy657');
    await user.click(screen.getByRole('button', { name: 'Connecter et importer' }));

    expect(
      await screen.findByText('À voir : 3 film(s) ajouté(s), 0 retiré(s).')
    ).toBeInTheDocument();
    expect(screen.queryByText(/introuvable/)).not.toBeInTheDocument();
    expect(screen.queryByText(/laissé/)).not.toBeInTheDocument();
  });

  it('tells the titles not found on TMDB apart from the titles left pending', async () => {
    const user = userEvent.setup();
    server.use(
      authedUserHandler,
      patchMeHandler(),
      http.post(`${TEST_API_V1}/letterboxd/sync`, () =>
        HttpResponse.json({
          skipped: false,
          added: 2,
          removed: 0,
          unmatchedTitles: ['Unfindable Movie'],
          pendingChoices: [
            {
              rowIndex: 1,
              title: 'Midnight Mass',
              year: '2021',
              letterboxdSlug: 'midnight-mass-2021',
              candidates: [
                {
                  tmdbId: 97400,
                  mediaType: 'tv',
                  title: 'Sermons de minuit',
                  year: '2021',
                  posterPath: null,
                  voteAverage: 7.5,
                },
              ],
            },
            {
              rowIndex: 2,
              title: 'Spider-Man',
              year: '1977',
              letterboxdSlug: 'spider-man-1977',
              candidates: [
                {
                  tmdbId: 1,
                  mediaType: 'movie',
                  title: 'Spider-Man',
                  year: '1977',
                  posterPath: null,
                  voteAverage: 5.1,
                },
              ],
            },
          ],
          totalOnLetterboxd: 10,
          totalTruncated: 0,
        })
      ),
      http.post(`${TEST_API_V1}/letterboxd/confirm`, () =>
        HttpResponse.json({ added: 1, alreadyPresent: 0 })
      )
    );

    renderModal();

    await user.type(screen.getByLabelText('Pseudo Letterboxd'), 'affy657');
    await user.click(screen.getByRole('button', { name: 'Connecter et importer' }));

    await user.click(await screen.findByRole('radio', { name: /Sermons de minuit/ }));
    await user.click(screen.getByRole('button', { name: 'Confirmer et suivant' }));

    await screen.findByRole('radio', { name: /Spider-Man/ });
    await user.click(screen.getByRole('button', { name: 'Décider plus tard' }));

    expect(await screen.findByText('1 titre introuvable sur TMDB')).toBeInTheDocument();
    expect(
      screen.getByText('1 titre laissé en attente, à décider à la prochaine synchronisation')
    ).toBeInTheDocument();

    const unmatchedList = screen.getByText('Unfindable Movie').closest('ul');
    expect(unmatchedList).not.toBeNull();
    expect(unmatchedList).not.toHaveTextContent('Spider-Man');

    const undecidedList = screen.getByText('Spider-Man (1977)').closest('ul');
    expect(undecidedList).not.toBeNull();
    expect(undecidedList).not.toHaveTextContent('Unfindable Movie');

    expect(
      await screen.findByText('À voir : 2 film(s) ajouté(s), 0 retiré(s).')
    ).toBeInTheDocument();
    expect(screen.getByText('1 titre confirmé à la main')).toBeInTheDocument();
  });

  async function connect(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText('Pseudo Letterboxd'), 'affy657');
    await user.click(screen.getByRole('button', { name: 'Connecter et importer' }));
  }

  it('reports the films vus of an account with nothing to watch', async () => {
    const user = userEvent.setup();
    server.use(
      authedUserHandler,
      patchMeHandler(),
      createLetterboxdSyncHandler({
        added: 0,
        watchedAdded: 42,
        watchedUnmatchedTitles: ['Court Oublié (1981)'],
      })
    );

    renderModal();
    await connect(user);

    expect(
      await screen.findByText('Films vus : 42 film(s) ajouté(s), 0 retiré(s).')
    ).toBeInTheDocument();
    expect(screen.getByText('À voir : 0 film(s) ajouté(s), 0 retiré(s).')).toBeInTheDocument();
    expect(screen.getByText('1 titre introuvable sur TMDB')).toBeInTheDocument();
    expect(screen.getByText('Court Oublié (1981)')).toBeInTheDocument();
  });

  it('says the watchlist could not be read, and keeps what Films vus brought', async () => {
    const user = userEvent.setup();
    server.use(
      authedUserHandler,
      patchMeHandler(),
      createLetterboxdSyncHandler({
        error: 'letterboxd_watchlist_incomplete',
        watchedAdded: 5,
      })
    );

    renderModal();
    await connect(user);

    expect(
      await screen.findByText(
        /Watchlist Letterboxd inaccessible\. Vérifiez l'orthographe du pseudo/
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Films vus : 5 film(s) ajouté(s), 0 retiré(s).')).toBeInTheDocument();
    expect(screen.queryByText(/^À voir :/)).not.toBeInTheDocument();
  });

  it('counts the films vus confirmed by hand with the others', async () => {
    const user = userEvent.setup();
    server.use(
      authedUserHandler,
      patchMeHandler(),
      createLetterboxdSyncHandler({
        watchedPendingChoices: [
          {
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
              },
            ],
          },
        ],
      }),
      createLetterboxdConfirmHandler(undefined, { added: 0, watchedAdded: 1 })
    );

    renderModal();
    await connect(user);

    await user.click(await screen.findByRole('radio', { name: /Alien, le huitième passager/ }));
    await user.click(screen.getByRole('button', { name: /Confirmer et terminer/ }));

    expect(await screen.findByText('1 titre confirmé à la main')).toBeInTheDocument();
  });

  it('also asks about the films vus Letterboxd could not match with certainty', async () => {
    const user = userEvent.setup();
    server.use(
      authedUserHandler,
      patchMeHandler(),
      createLetterboxdSyncHandler({
        watchedPendingChoices: [
          {
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
              },
            ],
          },
        ],
      })
    );

    renderModal();

    await user.type(screen.getByLabelText('Pseudo Letterboxd'), 'affy657');
    await user.click(screen.getByRole('button', { name: 'Connecter et importer' }));

    expect(
      await screen.findByRole('radio', { name: /Alien, le huitième passager/ })
    ).toBeInTheDocument();
    expect(screen.getByText('Films vus')).toBeInTheDocument();
  });
});
