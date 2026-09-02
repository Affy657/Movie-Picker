import { describe, it, expect, beforeAll, afterEach, afterAll, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import AccountPage from '@/features/auth/pages/AccountPage';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { TEST_API_V1 } from '@/mocks/handlers';

function renderAccount() {
  return render(
    <AppTestProviders>
      <MemoryRouter initialEntries={['/settings']}>
        <Routes>
          <Route path="/settings" element={<AccountPage />} />
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
  } = {}
) {
  return http.get(`${TEST_API_V1}/auth/me`, () =>
    HttpResponse.json({
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

describe('LetterboxdImportSection (MSW)', () => {
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
    localStorage.setItem('moviepicker-ui-preference', 'light');
  });
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('affiche le pseudo en lecture seule, sans champ de saisie', async () => {
    server.use(meHandler({ letterboxdUsername: 'dave_v' }));

    renderAccount();

    expect(await screen.findByText('dave_v')).toBeInTheDocument();
    expect(screen.queryByLabelText('Pseudo Letterboxd')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Modifier le pseudo Letterboxd' })
    ).toBeInTheDocument();
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

    await user.click(await screen.findByRole('button', { name: 'Modifier le pseudo Letterboxd' }));

    const input = screen.getByLabelText('Pseudo Letterboxd');
    expect(input).toHaveValue('dave_v');

    await user.clear(input);
    await user.type(input, 'newname');
    await user.click(screen.getByRole('button', { name: 'Enregistrer le pseudo Letterboxd' }));

    await waitFor(() => expect(patched).toBe('newname'));
  });

  it('permet de déconnecter le compte Letterboxd via le bouton dédié', async () => {
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

    await user.click(
      await screen.findByRole('button', { name: 'Déconnecter le compte Letterboxd' })
    );

    await waitFor(() => expect(patched).toBe(''));
    expect(
      await screen.findByText('Ajoutez votre pseudo pour activer la synchronisation.')
    ).toBeInTheDocument();
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

    await user.click(await screen.findByRole('button', { name: 'Modifier le pseudo Letterboxd' }));
    await user.type(screen.getByLabelText('Pseudo Letterboxd'), 'xyz');
    await user.click(screen.getByRole('button', { name: 'Annuler' }));

    expect(screen.queryByLabelText('Pseudo Letterboxd')).not.toBeInTheDocument();
    expect(screen.getByText('dave_v')).toBeInTheDocument();
    expect(patchCalled).toBe(false);
  });

  it('affiche directement le champ de saisie quand aucun pseudo n’est enregistré', async () => {
    server.use(meHandler({ letterboxdUsername: null }));

    renderAccount();

    expect(await screen.findByLabelText('Pseudo Letterboxd')).toHaveValue('');
    expect(
      screen.queryByRole('button', { name: 'Modifier le pseudo Letterboxd' })
    ).not.toBeInTheDocument();
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

    expect(await screen.findByText('3 film(s) ajouté(s), 1 retiré(s).')).toBeInTheDocument();
    expect(syncUrl).toContain('force=true');
    expect(
      screen.queryByRole('heading', { name: 'Choisir les bonnes correspondances' })
    ).not.toBeInTheDocument();
  });

  it('ouvre la modale de choix quand la synchro renvoie des correspondances ambiguës', async () => {
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

  it('affiche une réconciliation en attente et ouvre la modale de choix au clic', async () => {
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

    const pendingButton = await screen.findByRole('button', {
      name: /Réconciliation en attente : 2 film\(s\)/,
    });
    await user.click(pendingButton);

    expect(
      await screen.findByRole('heading', { name: 'Un titre à confirmer' })
    ).toBeInTheDocument();
  });

  it('met à jour le nombre de films restants après une réconciliation partielle', async () => {
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

    const pendingButton = await screen.findByRole('button', {
      name: /Réconciliation en attente : 2 film\(s\)/,
    });
    await user.click(pendingButton);

    expect(
      await screen.findByRole('heading', { name: '2 titres à confirmer' })
    ).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: /Sermons de minuit/ }));
    await user.click(screen.getByRole('button', { name: 'Décider plus tard' }));

    expect(await screen.findByText('1 film(s) ajouté(s).')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Choisir pour 1 film/ })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Réconciliation en attente : 2 film\(s\)/ })
    ).not.toBeInTheDocument();
  });

  it('liste les films introuvables sur TMDB dans un dépliant', async () => {
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

  it('désactive la synchronisation et signale qu’elle est inactive sans pseudo', async () => {
    server.use(meHandler({ letterboxdUsername: null }));

    renderAccount();

    const syncButton = await screen.findByRole('button', { name: /Synchroniser maintenant/ });
    expect(syncButton).toBeDisabled();
    expect(
      screen.getByText('Ajoutez votre pseudo pour activer la synchronisation.')
    ).toBeInTheDocument();
  });

  it('affiche la date de dernière synchronisation réussie', async () => {
    server.use(
      meHandler({
        letterboxdUsername: 'affy657',
        letterboxdLastSyncAt: '2026-08-10T12:00:00Z',
      })
    );

    renderAccount();

    expect(await screen.findByText(/Synchronisé le/)).toBeInTheDocument();
  });

  it('affiche l’erreur de la dernière synchronisation échouée', async () => {
    server.use(
      meHandler({
        letterboxdUsername: 'affy657',
        letterboxdLastSyncError: 'Watchlist Letterboxd inaccessible.',
      })
    );

    renderAccount();

    const alerts = await screen.findAllByRole('alert');
    expect(
      alerts.some((el) => el.textContent?.includes('Watchlist Letterboxd inaccessible.'))
    ).toBe(true);
  });

  it('affiche le message d’erreur du serveur quand la synchronisation échoue', async () => {
    const user = userEvent.setup();

    server.use(
      meHandler({ letterboxdUsername: 'inconnu' }),
      http.post(`${TEST_API_V1}/letterboxd/sync`, () =>
        HttpResponse.json(
          { error: 'Watchlist Letterboxd de « inconnu » inaccessible.' },
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
});
