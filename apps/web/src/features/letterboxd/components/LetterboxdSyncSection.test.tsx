import { describe, it, expect, beforeAll, afterEach, afterAll, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import AccountPage from '@/app/pages/account/AccountPage';
import { AppTestProviders, createTestQueryClient } from '@/test-utils/queryWrapper';
import { queryKeys } from '@/shared/hooks/queryKeys';
import {
  createLetterboxdConfirmHandler,
  createLetterboxdSyncHandler,
  TEST_API_V1,
} from '@/mocks/handlers';
import type { components } from '@/shared/api/generated/openapiSchema';

const { track } = vi.hoisted(() => ({ track: vi.fn() }));
vi.mock('@/shared/hooks/useAnalytics', () => ({ useAnalytics: () => ({ track }) }));

function renderAccount(client = createTestQueryClient()) {
  return render(
    <AppTestProviders client={client}>
      <MemoryRouter initialEntries={['/settings/integrations']}>
        <Routes>
          <Route path="/settings/*" element={<AccountPage />} />
        </Routes>
      </MemoryRouter>
    </AppTestProviders>
  );
}

function meHandler(
  overrides: {
    letterboxdUsername?: string | null;
    letterboxdLastSyncAt?: string | null;
    letterboxdLastSyncError?: string | null;
    letterboxdPendingReconciliationCount?: number;
    letterboxdSyncWatchlist?: boolean;
    letterboxdSyncWatched?: boolean;
    letterboxdWatchlistCount?: number;
    letterboxdWatchedCount?: number;
  } = {}
) {
  return http.get(`${TEST_API_V1}/auth/me`, () =>
    HttpResponse.json({
      ...(overrides.letterboxdSyncWatchlist === undefined
        ? {}
        : { letterboxdSyncWatchlist: overrides.letterboxdSyncWatchlist }),
      ...(overrides.letterboxdSyncWatched === undefined
        ? {}
        : { letterboxdSyncWatched: overrides.letterboxdSyncWatched }),
      letterboxdWatchlistCount: overrides.letterboxdWatchlistCount ?? 0,
      letterboxdWatchedCount: overrides.letterboxdWatchedCount ?? 0,
      userId: 'u-acc',
      displayName: 'Pat',
      emailMasked: 'p***@test.local',
      uiTheme: 'light',
      accentColor: 'default',
      ratingScale: 'five',
      avatarId: 'alpha',
      handle: 'pat',
      bio: null,
      isProfilePublic: true,
      letterboxdUsername: overrides.letterboxdUsername ?? null,
      letterboxdLastSyncAt: overrides.letterboxdLastSyncAt ?? null,
      letterboxdLastSyncError: overrides.letterboxdLastSyncError ?? null,
      letterboxdPendingReconciliationCount: overrides.letterboxdPendingReconciliationCount ?? 0,
    })
  );
}

describe('LetterboxdSyncSection (MSW)', () => {
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
    localStorage.setItem('moviepicker-ui-preference', 'light');
  });
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('affiche le pseudo en lecture seule, sans champ de saisie', async () => {
    server.use(meHandler({ letterboxdUsername: 'dave_v' }));

    renderAccount();

    expect(await screen.findByText('dave_v')).toBeInTheDocument();
    expect(screen.queryByLabelText('Pseudo Letterboxd')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Modifier' })).toBeInTheDocument();
  });

  it('permet de modifier le pseudo via le crayon puis de valider', async () => {
    const user = userEvent.setup();
    let patched: string | null | undefined;

    server.use(
      meHandler({ letterboxdUsername: 'dave_v' }),
      http.patch(`${TEST_API_V1}/auth/me`, async ({ request }) => {
        const body = (await request.json()) as { letterboxdUsername?: string | null };
        patched = body.letterboxdUsername;
        return HttpResponse.json({
          userId: 'u-acc',
          displayName: 'Pat',
          emailMasked: 'p***@test.local',
          letterboxdUsername: body.letterboxdUsername ?? null,
          letterboxdLastSyncAt: null,
          letterboxdLastSyncError: null,
        });
      })
    );

    renderAccount();

    await user.click(await screen.findByRole('button', { name: 'Modifier' }));

    const input = screen.getByLabelText('Pseudo Letterboxd');
    expect(input).toHaveValue('dave_v');

    await user.clear(input);
    await user.type(input, 'newname');
    await user.click(screen.getByRole('button', { name: 'Enregistrer le pseudo Letterboxd' }));

    await waitFor(() => expect(patched).toBe('newname'));
  });

  it('allows disconnecting the Letterboxd account through the dedicated button', async () => {
    const user = userEvent.setup();
    let patched: string | null | undefined;

    server.use(
      meHandler({ letterboxdUsername: 'dave_v' }),
      http.patch(`${TEST_API_V1}/auth/me`, async ({ request }) => {
        const body = (await request.json()) as { letterboxdUsername?: string | null };
        patched = body.letterboxdUsername;
        return HttpResponse.json({
          userId: 'u-acc',
          displayName: 'Pat',
          emailMasked: 'p***@test.local',
          letterboxdUsername: null,
          letterboxdLastSyncAt: null,
          letterboxdLastSyncError: null,
        });
      })
    );

    renderAccount();

    await user.click(await screen.findByRole('button', { name: 'Déconnecter' }));

    await waitFor(() => expect(patched).toBe(''));
    expect(
      await screen.findByText('Ajoutez votre pseudo pour activer la synchronisation.')
    ).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith('letterboxd_disconnected');
  });

  it('annule la modification du pseudo sans envoyer de PATCH', async () => {
    const user = userEvent.setup();
    let patchCalled = false;

    server.use(
      meHandler({ letterboxdUsername: 'dave_v' }),
      http.patch(`${TEST_API_V1}/auth/me`, () => {
        patchCalled = true;
        return HttpResponse.json({});
      })
    );

    renderAccount();

    await user.click(await screen.findByRole('button', { name: 'Modifier' }));
    await user.type(screen.getByLabelText('Pseudo Letterboxd'), 'xyz');
    await user.click(screen.getByRole('button', { name: 'Annuler' }));

    expect(screen.queryByLabelText('Pseudo Letterboxd')).not.toBeInTheDocument();
    expect(screen.getByText('dave_v')).toBeInTheDocument();
    expect(patchCalled).toBe(false);
  });

  it('shows the input field straight away when no username is saved', async () => {
    server.use(meHandler({ letterboxdUsername: null }));

    renderAccount();

    expect(await screen.findByLabelText('Pseudo Letterboxd')).toHaveValue('');
    expect(screen.queryByRole('button', { name: 'Modifier' })).not.toBeInTheDocument();
  });

  it('synchronise et affiche le bilan ajouts/retraits sans ouvrir de modale quand tout est certain', async () => {
    const user = userEvent.setup();
    let syncUrl: string | null = null;

    server.use(
      meHandler({ letterboxdUsername: 'affy657' }),
      http.post(`${TEST_API_V1}/letterboxd/sync`, ({ request }) => {
        syncUrl = request.url;
        return HttpResponse.json({
          skipped: false,
          added: 3,
          removed: 1,
          unmatchedTitles: [],
          pendingChoices: [],
          totalOnLetterboxd: 10,
          totalTruncated: 0,
        });
      })
    );

    renderAccount();

    const syncButton = await screen.findByRole('button', { name: /Synchroniser maintenant/ });
    await waitFor(() => expect(syncButton).toBeEnabled());
    await user.click(syncButton);

    expect(
      await screen.findByText('À voir : 3 film(s) ajouté(s), 1 retiré(s).')
    ).toBeInTheDocument();
    expect(syncUrl).toContain('force=true');
    expect(
      screen.queryByRole('heading', { name: 'Choisir les bonnes correspondances' })
    ).not.toBeInTheDocument();
    expect(track).toHaveBeenCalledWith('letterboxd_synced', {
      mode: 'manual',
      changed: true,
      pendingChoices: 0,
    });
  });

  it('says to come back later instead of reporting zero changes when the server skips the sync', async () => {
    const user = userEvent.setup();
    server.use(
      meHandler({ letterboxdUsername: 'affy657', letterboxdLastSyncAt: '2026-08-10T12:00:00Z' }),
      http.post(`${TEST_API_V1}/letterboxd/sync`, () =>
        HttpResponse.json({
          skipped: true,
          added: 0,
          removed: 0,
          unmatchedTitles: [],
          pendingChoices: [],
          totalOnLetterboxd: 0,
          totalTruncated: 0,
        })
      )
    );

    renderAccount();

    const syncButton = await screen.findByRole('button', { name: /Synchroniser maintenant/ });
    await waitFor(() => expect(syncButton).toBeEnabled());
    await user.click(syncButton);

    expect(
      await screen.findByText(
        'Une synchronisation vient d’avoir lieu. Réessayez dans quelques minutes.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByText(/ajouté\(s\)/)).not.toBeInTheDocument();
  });

  it('opens the choice modal when the sync returns ambiguous matches', async () => {
    const user = userEvent.setup();

    server.use(
      meHandler({ letterboxdUsername: 'affy657' }),
      http.post(`${TEST_API_V1}/letterboxd/sync`, () =>
        HttpResponse.json({
          skipped: false,
          added: 0,
          removed: 0,
          unmatchedTitles: [],
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
          ],
          totalOnLetterboxd: 1,
          totalTruncated: 0,
        })
      )
    );

    renderAccount();

    const syncButton = await screen.findByRole('button', { name: /Synchroniser maintenant/ });
    await waitFor(() => expect(syncButton).toBeEnabled());
    await user.click(syncButton);

    expect(
      await screen.findByRole('heading', { name: 'Un titre à confirmer' })
    ).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Sermons de minuit/ })).toBeInTheDocument();
  });

  it('shows a pending reconciliation and opens the choice modal on click', async () => {
    const user = userEvent.setup();

    server.use(
      meHandler({ letterboxdUsername: 'affy657', letterboxdPendingReconciliationCount: 2 }),
      http.post(`${TEST_API_V1}/letterboxd/sync`, () =>
        HttpResponse.json({
          skipped: false,
          added: 0,
          removed: 0,
          unmatchedTitles: [],
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
          ],
          totalOnLetterboxd: 1,
          totalTruncated: 0,
        })
      )
    );

    renderAccount();

    const attention = await screen.findByText(
      /2 films n.ont pas pu être identifiés automatiquement\./
    );
    expect(attention.closest('output')).toBeInTheDocument();
    const pendingButton = await screen.findByRole('button', { name: 'Les confirmer' });
    await user.click(pendingButton);

    expect(
      await screen.findByRole('heading', { name: 'Un titre à confirmer' })
    ).toBeInTheDocument();
  });

  it('updates the number of remaining films after a partial reconciliation', async () => {
    const user = userEvent.setup();

    server.use(
      meHandler({ letterboxdUsername: 'affy657', letterboxdPendingReconciliationCount: 2 }),
      http.post(`${TEST_API_V1}/letterboxd/sync`, () =>
        HttpResponse.json({
          skipped: false,
          added: 0,
          removed: 0,
          unmatchedTitles: [],
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
          totalOnLetterboxd: 2,
          totalTruncated: 0,
        })
      ),
      http.post(`${TEST_API_V1}/letterboxd/confirm`, () =>
        HttpResponse.json({ added: 1, alreadyPresent: 0, pendingReconciliationCount: 1 })
      )
    );

    renderAccount();

    const pendingButton = await screen.findByRole('button', { name: 'Les confirmer' });
    await user.click(pendingButton);

    expect(
      await screen.findByRole('heading', { name: '2 titres à confirmer' })
    ).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: /Sermons de minuit/ }));
    await user.click(screen.getByRole('button', { name: 'Décider plus tard' }));

    expect(await screen.findByText('1 film(s) ajouté(s).')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Choisir pour 1 film/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Les confirmer' })).not.toBeInTheDocument();
  });

  it('lists the films not found on TMDB in a disclosure', async () => {
    const user = userEvent.setup();

    server.use(
      meHandler({ letterboxdUsername: 'affy657' }),
      http.post(`${TEST_API_V1}/letterboxd/sync`, () =>
        HttpResponse.json({
          skipped: false,
          added: 0,
          removed: 0,
          unmatchedTitles: ['Film Obscur (1974)'],
          pendingChoices: [],
          totalOnLetterboxd: 1,
          totalTruncated: 0,
        })
      )
    );

    renderAccount();

    const syncButton = await screen.findByRole('button', { name: /Synchroniser maintenant/ });
    await waitFor(() => expect(syncButton).toBeEnabled());
    await user.click(syncButton);

    expect(
      await screen.findByText('Voir les 1 film(s) introuvable(s) sur TMDB')
    ).toBeInTheDocument();
    expect(screen.getByText('Film Obscur (1974)')).toBeInTheDocument();
  });

  it('masque la synchronisation et signale qu’elle est inactive sans pseudo', async () => {
    server.use(meHandler({ letterboxdUsername: null }));

    renderAccount();

    expect(
      await screen.findByText('Ajoutez votre pseudo pour activer la synchronisation.')
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Synchroniser maintenant/ })
    ).not.toBeInTheDocument();
  });

  it('shows the date of the last successful synchronisation', async () => {
    server.use(
      meHandler({
        letterboxdUsername: 'affy657',
        letterboxdLastSyncAt: '2026-08-10T12:00:00Z',
      })
    );

    renderAccount();

    expect(await screen.findByText(/Synchronisé le/)).toBeInTheDocument();
  });

  it('shows the error of the last failed synchronisation', async () => {
    server.use(
      meHandler({
        letterboxdUsername: 'affy657',
        letterboxdLastSyncError: 'letterboxd_watchlist_incomplete',
      })
    );

    renderAccount();

    const alerts = await screen.findAllByRole('alert');
    expect(
      alerts.some((el) => el.textContent?.includes('Watchlist Letterboxd inaccessible.'))
    ).toBe(true);
  });

  it.each([
    ['letterboxd_sync_unavailable', 'ne répond pas pour le moment'],
    ['letterboxd_sync_failed', 'Synchronisation impossible.'],
    ['letterboxd_watched_incomplete', 'Films vus sur Letterboxd inaccessibles.'],
  ])('translates the stored code %s of a failed synchronisation', async (code, expected) => {
    server.use(meHandler({ letterboxdUsername: 'affy657', letterboxdLastSyncError: code }));

    renderAccount();

    const alerts = await screen.findAllByRole('alert');
    expect(alerts.some((el) => el.textContent?.includes(expected))).toBe(true);
  });

  it('shows a stored sync error verbatim when it is not a known code', async () => {
    server.use(
      meHandler({
        letterboxdUsername: 'affy657',
        letterboxdLastSyncError: 'Watchlist Letterboxd de « affy657 » inaccessible.',
      })
    );

    renderAccount();

    const alerts = await screen.findAllByRole('alert');
    expect(
      alerts.some((el) =>
        el.textContent?.includes('Watchlist Letterboxd de « affy657 » inaccessible.')
      )
    ).toBe(true);
  });

  it('shows the server error message when the synchronisation fails', async () => {
    const user = userEvent.setup();

    server.use(
      meHandler({ letterboxdUsername: 'inconnu' }),
      http.post(`${TEST_API_V1}/letterboxd/sync`, () =>
        HttpResponse.json(
          {
            error: 'Letterboxd synchronization failed',
            reason: 'letterboxd_watchlist_incomplete',
          },
          { status: 400 }
        )
      )
    );

    renderAccount();

    const syncButton = await screen.findByRole('button', { name: /Synchroniser maintenant/ });
    await waitFor(() => expect(syncButton).toBeEnabled());
    await user.click(syncButton);

    expect(await screen.findByText(/inaccessible/)).toBeInTheDocument();
  });

  it('ouvre la bulle d’information sur le fonctionnement de la synchronisation', async () => {
    const user = userEvent.setup();
    server.use(meHandler({ letterboxdUsername: 'affy657' }));

    renderAccount();

    const trigger = await screen.findByRole('button', { name: 'Comment ça marche' });
    expect(
      screen.queryByText(/Votre watchlist Letterboxd publique est recopiée ici/)
    ).not.toBeInTheDocument();

    await user.click(trigger);

    expect(
      screen.getByText(/Votre watchlist Letterboxd publique est recopiée ici/)
    ).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  async function clickSync(user: ReturnType<typeof userEvent.setup>) {
    const syncButton = await screen.findByRole('button', { name: /Synchroniser maintenant/ });
    await waitFor(() => expect(syncButton).toBeEnabled());
    await user.click(syncButton);
  }

  describe('what Letterboxd syncs', () => {
    it('shows the À voir and Films vus switches under the username, on by default, with the Letterboxd counts', async () => {
      server.use(
        meHandler({
          letterboxdUsername: 'affy657',
          letterboxdWatchlistCount: 140,
          letterboxdWatchedCount: 122,
        })
      );

      renderAccount();

      expect(await screen.findByRole('switch', { name: 'À voir' })).toHaveAttribute(
        'aria-checked',
        'true'
      );
      expect(screen.getByRole('switch', { name: 'Films vus' })).toHaveAttribute(
        'aria-checked',
        'true'
      );
      expect(screen.getByText('Votre watchlist Letterboxd, 140 titres.')).toBeInTheDocument();
      expect(
        screen.getByText('Vos films vus Letterboxd, avec leur date et votre note. 122 films.')
      ).toBeInTheDocument();
    });

    it('counts a single title and a single film in the singular', async () => {
      server.use(
        meHandler({
          letterboxdUsername: 'affy657',
          letterboxdWatchlistCount: 1,
          letterboxdWatchedCount: 1,
        })
      );

      renderAccount();

      expect(await screen.findByText('Votre watchlist Letterboxd, 1 titre.')).toBeInTheDocument();
      expect(
        screen.getByText('Vos films vus Letterboxd, avec leur date et votre note. 1 film.')
      ).toBeInTheDocument();
    });

    it('reflects the switches saved on the account', async () => {
      server.use(meHandler({ letterboxdUsername: 'affy657', letterboxdSyncWatched: false }));

      renderAccount();

      expect(await screen.findByRole('switch', { name: 'Films vus' })).toHaveAttribute(
        'aria-checked',
        'false'
      );
      expect(screen.getByRole('switch', { name: 'À voir' })).toHaveAttribute(
        'aria-checked',
        'true'
      );
    });

    it('offers no switch before a username is saved', async () => {
      server.use(meHandler({ letterboxdUsername: null }));

      renderAccount();

      await screen.findByLabelText('Pseudo Letterboxd');
      expect(screen.queryByRole('switch', { name: 'À voir' })).not.toBeInTheDocument();
      expect(screen.queryByRole('switch', { name: 'Films vus' })).not.toBeInTheDocument();
    });

    it('turns the Films vus sync off at once and saves it on the account', async () => {
      const user = userEvent.setup();
      let patched: unknown = null;
      server.use(
        meHandler({ letterboxdUsername: 'affy657' }),
        http.patch(`${TEST_API_V1}/auth/me`, async ({ request }) => {
          patched = await request.json();
          await new Promise(() => undefined);
        })
      );

      renderAccount();

      await user.click(await screen.findByRole('switch', { name: 'Films vus' }));

      expect(screen.getByRole('switch', { name: 'Films vus' })).toHaveAttribute(
        'aria-checked',
        'false'
      );
      expect(screen.getByRole('switch', { name: 'À voir' })).toHaveAttribute(
        'aria-checked',
        'true'
      );
      await waitFor(() => expect(patched).toEqual({ letterboxdSyncWatched: false }));
    });

    it('puts the switch back and says so when the setting is not saved', async () => {
      const user = userEvent.setup();
      server.use(
        meHandler({ letterboxdUsername: 'affy657', letterboxdSyncWatchlist: false }),
        http.patch(`${TEST_API_V1}/auth/me`, () =>
          HttpResponse.json({ code: 500, reason: 'internal_error' }, { status: 500 })
        )
      );

      renderAccount();

      await user.click(await screen.findByRole('switch', { name: 'À voir' }));

      expect(await screen.findByText('Réglage non enregistré. Réessayez.')).toBeInTheDocument();
      expect(screen.getByRole('switch', { name: 'À voir' })).toHaveAttribute(
        'aria-checked',
        'false'
      );
    });

    it('explains that nothing was read when both syncs are off, without an error', async () => {
      const user = userEvent.setup();
      server.use(
        meHandler({
          letterboxdUsername: 'affy657',
          letterboxdSyncWatchlist: false,
          letterboxdSyncWatched: false,
        }),
        createLetterboxdSyncHandler({ skipped: true })
      );

      renderAccount();
      await clickSync(user);

      expect(
        await screen.findByText(
          'Les deux synchronisations sont coupées : rien n’a été lu sur Letterboxd.'
        )
      ).toBeInTheDocument();
      expect(screen.queryByText(/Une synchronisation vient d’avoir lieu/)).not.toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('reports the changes of À voir and of Films vus', async () => {
      const user = userEvent.setup();
      server.use(
        meHandler({ letterboxdUsername: 'affy657' }),
        createLetterboxdSyncHandler({ added: 3, removed: 1, watchedAdded: 12, watchedRemoved: 2 })
      );

      renderAccount();
      await clickSync(user);

      expect(
        await screen.findByText('À voir : 3 film(s) ajouté(s), 1 retiré(s).')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Films vus : 12 film(s) ajouté(s), 2 retiré(s).')
      ).toBeInTheDocument();
    });

    it('reports only the lists that are synced', async () => {
      const user = userEvent.setup();
      server.use(
        meHandler({ letterboxdUsername: 'affy657', letterboxdSyncWatchlist: false }),
        createLetterboxdSyncHandler({ watchedAdded: 4 })
      );

      renderAccount();
      await clickSync(user);

      expect(
        await screen.findByText('Films vus : 4 film(s) ajouté(s), 0 retiré(s).')
      ).toBeInTheDocument();
      expect(screen.queryByText(/^À voir :/)).not.toBeInTheDocument();
    });

    it('tells the films the Films vus sync took out of À voir, even with the À voir sync off', async () => {
      const user = userEvent.setup();
      server.use(
        meHandler({ letterboxdUsername: 'affy657', letterboxdSyncWatchlist: false }),
        createLetterboxdSyncHandler({ removed: 2, watchedAdded: 2 })
      );

      renderAccount();
      await clickSync(user);

      expect(
        await screen.findByText('Films vus : 2 film(s) ajouté(s), 0 retiré(s).')
      ).toBeInTheDocument();
      expect(screen.getByText('À voir : 0 film(s) ajouté(s), 2 retiré(s).')).toBeInTheDocument();
    });

    it('tells apart the watched films Letterboxd no longer serves from a too long watchlist', async () => {
      const user = userEvent.setup();
      server.use(
        meHandler({ letterboxdUsername: 'affy657' }),
        createLetterboxdSyncHandler({
          watchedAdded: 41,
          totalTruncated: 3,
          watchedTotalTruncated: 693,
        })
      );

      renderAccount();
      await clickSync(user);

      expect(
        await screen.findByText(
          'Films vus : Letterboxd ne laisse lire que vos films sortis récemment et votre journal, 693 autre(s) film(s) n’ont pas pu être lus. Importez le fichier d’export de Letterboxd pour les récupérer.'
        )
      ).toBeInTheDocument();
      expect(
        screen.getByText('3 film(s) non traité(s) : trop de films pour une seule fois.')
      ).toBeInTheDocument();
    });

    it('says which list could not be read, and keeps what the other one brought', async () => {
      const user = userEvent.setup();
      server.use(
        meHandler({ letterboxdUsername: 'affy657' }),
        createLetterboxdSyncHandler({ added: 2, error: 'letterboxd_watched_incomplete' })
      );

      renderAccount();
      await clickSync(user);

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('Films vus sur Letterboxd inaccessibles.');
      expect(screen.getByText('À voir : 2 film(s) ajouté(s), 0 retiré(s).')).toBeInTheDocument();
      expect(screen.queryByText(/^Films vus :/)).not.toBeInTheDocument();
    });

    it('lists the films vus not found on TMDB with the others', async () => {
      const user = userEvent.setup();
      server.use(
        meHandler({ letterboxdUsername: 'affy657' }),
        createLetterboxdSyncHandler({
          unmatchedTitles: ['Film Obscur (1974)'],
          watchedUnmatchedTitles: ['Court Oublié (1981)'],
        })
      );

      renderAccount();
      await clickSync(user);

      expect(
        await screen.findByText('Voir les 2 film(s) introuvable(s) sur TMDB')
      ).toBeInTheDocument();
      expect(screen.getByText('Film Obscur (1974)')).toBeInTheDocument();
      expect(screen.getByText('Court Oublié (1981)')).toBeInTheDocument();
    });

    it('refreshes Films vus, the lists and the film pages once Letterboxd changed the films vus', async () => {
      const user = userEvent.setup();
      const client = createTestQueryClient();
      const invalidate = vi.spyOn(client, 'invalidateQueries');
      server.use(
        meHandler({ letterboxdUsername: 'affy657' }),
        createLetterboxdSyncHandler({ watchedRemoved: 1 })
      );

      renderAccount(client);
      await clickSync(user);

      await waitFor(() =>
        expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.watched.all })
      );
      expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.lists.all });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.watchlist.list });
    });
  });

  describe('films vus to confirm', () => {
    const WATCHED_CHOICE: components['schemas']['LetterboxdImportRowResponse'] = {
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

    it('opens the confirmation with the films vus to confirm, their date and rating', async () => {
      const user = userEvent.setup();
      server.use(
        meHandler({ letterboxdUsername: 'affy657', letterboxdPendingReconciliationCount: 1 }),
        createLetterboxdSyncHandler({ watchedPendingChoices: [WATCHED_CHOICE] })
      );

      renderAccount();
      await user.click(await screen.findByRole('button', { name: 'Les confirmer' }));

      const dialog = await screen.findByRole('dialog', { name: 'Un titre à confirmer' });
      expect(within(dialog).getByText('Films vus')).toBeInTheDocument();
      expect(within(dialog).getByText('Vu le 12 oct. 2019, noté 4/5')).toBeInTheDocument();
    });

    it('sends the chosen film vu and tells where the confirmed films went', async () => {
      const user = userEvent.setup();
      let confirmed: components['schemas']['LetterboxdImportConfirmRequest'] | null = null;
      server.use(
        meHandler({ letterboxdUsername: 'affy657', letterboxdPendingReconciliationCount: 1 }),
        createLetterboxdSyncHandler({ watchedPendingChoices: [WATCHED_CHOICE] }),
        createLetterboxdConfirmHandler(
          (body) => {
            confirmed = body;
          },
          { watchedAdded: 1 }
        )
      );

      renderAccount();
      await user.click(await screen.findByRole('button', { name: 'Les confirmer' }));
      await user.click(await screen.findByRole('radio', { name: /Alien, le huitième passager/ }));
      await user.click(screen.getByRole('button', { name: 'Confirmer et terminer' }));

      expect(
        await screen.findByText('0 film(s) ajouté(s) à « À voir », 1 à « Films vus ».')
      ).toBeInTheDocument();
      expect(confirmed).toMatchObject({
        selections: [],
        watchedSelections: [{ tmdbId: 348, rating: 8, watchedOn: '2019-10-12' }],
        remainingUnresolvedCount: 0,
      });
    });
  });
});
