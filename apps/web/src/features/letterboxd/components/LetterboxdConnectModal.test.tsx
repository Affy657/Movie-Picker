import { describe, it, expect, beforeAll, afterEach, afterAll, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import LetterboxdConnectModal from './LetterboxdConnectModal';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { TEST_API_V1 } from '@/mocks/handlers';

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
    server.listen({ onUnhandledRequest: 'error' });
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

    expect(await screen.findByText('3 titres ajoutés à votre liste')).toBeInTheDocument();
    expect(screen.queryByText(/introuvable/)).not.toBeInTheDocument();
    expect(screen.queryByText(/laissé/)).not.toBeInTheDocument();
  });

  it('distingue les titres introuvables sur TMDB des titres laissés en attente', async () => {
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

    expect(await screen.findByText('2 titres ajoutés à votre liste')).toBeInTheDocument();
    expect(screen.getByText('1 titre confirmé à la main')).toBeInTheDocument();
  });
});
