import { describe, it, expect, beforeAll, afterEach, afterAll, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
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

function meHandler(letterboxdUsername: string | null = null) {
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
      letterboxdUsername,
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

  it('affiche le pseudo Letterboxd existant et envoie le PATCH au clic sur Enregistrer', async () => {
    const user = userEvent.setup();
    let patched: string | null | undefined;

    server.use(
      meHandler('dave_v'),
      http.patch(`${TEST_API_V1}/auth/me`, async ({ request }) => {
        const body = (await request.json()) as { letterboxdUsername?: string | null };
        patched = body.letterboxdUsername;
        return HttpResponse.json({
          userId: 'u-acc',
          displayName: 'Pat',
          emailMasked: 'p***@test.local',
          letterboxdUsername: body.letterboxdUsername ?? null,
        });
      })
    );

    renderAccount();

    const input = await screen.findByLabelText('Pseudo Letterboxd');
    await waitFor(() => expect(input).toHaveValue('dave_v'));

    await user.clear(input);
    await user.type(input, 'newname');
    const section = input.closest('section') as HTMLElement;
    await user.click(within(section).getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(patched).toBe('newname'));
  });

  it('importe un CSV et ouvre l’écran de revue avec les candidats TMDB', async () => {
    const user = userEvent.setup();

    server.use(
      meHandler(),
      http.post(`${TEST_API_V1}/letterboxd-import/preview`, async ({ request }) => {
        const body = (await request.json()) as { csv: string };
        expect(body.csv).toContain('Inception');
        return HttpResponse.json({
          rows: [
            {
              rowIndex: 1,
              title: 'Inception',
              year: '2010',
              alreadyInWatchlist: false,
              candidates: [
                {
                  tmdbId: 27205,
                  mediaType: 'movie',
                  title: 'Inception',
                  year: '2010',
                  posterPath: null,
                  voteAverage: 8.4,
                },
              ],
            },
          ],
          totalParsed: 1,
          totalTruncated: 0,
        });
      })
    );

    renderAccount();

    await screen.findByLabelText('Pseudo Letterboxd');
    const csvContent =
      'Date,Name,Year,Letterboxd URI\n2026-01-01,Inception,2010,https://letterboxd.com/x/\n';
    const file = new File([csvContent], 'watchlist.csv', { type: 'text/csv' });
    const fileInput = screen.getByLabelText('Fichier watchlist.csv');

    await user.upload(fileInput, file);

    expect(
      await screen.findByRole('heading', { name: 'Vérifier les films à importer' })
    ).toBeInTheDocument();
    expect(screen.getByText('Inception (2010)')).toBeInTheDocument();
  });
});
