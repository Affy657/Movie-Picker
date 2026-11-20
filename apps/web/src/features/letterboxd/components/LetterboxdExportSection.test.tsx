import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import LetterboxdExportSection from '@/features/letterboxd/components/LetterboxdExportSection';
import { AppTestProviders, createTestQueryClient } from '@/test-utils/queryWrapper';
import { createLetterboxdConfirmHandler, TEST_API_V1 } from '@/mocks/handlers';

vi.mock('@/shared/hooks/useAnalytics', () => ({ useAnalytics: () => ({ track: vi.fn() }) }));

const WATCHED = Array.from({ length: 60 }, (_, index) => ({
  title: `Film ${index + 1}`,
  year: '2001',
  rating: index === 0 ? 8 : null,
  watchedOn: index === 0 ? '2026-01-31' : null,
}));

const TO_WATCH = [{ title: 'Heat', year: '1995', rating: null, watchedOn: null }];

const AMBIGUOUS = {
  rowIndex: 2,
  title: 'Film 2',
  year: '2001',
  letterboxdSlug: '',
  target: 'watched',
  candidates: [
    { tmdbId: 11, mediaType: 'movie', title: 'Film 2', year: '2001', genreIds: [] },
    { tmdbId: 12, mediaType: 'movie', title: 'Film 2', year: '2002', genreIds: [] },
  ],
};

function renderSection() {
  return render(
    <AppTestProviders client={createTestQueryClient()}>
      <LetterboxdExportSection />
    </AppTestProviders>
  );
}

async function chooseExport(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Importer' }));
  const dialog = await screen.findByRole('dialog', { name: 'Importer depuis Letterboxd' });
  await user.upload(
    within(dialog).getByLabelText('Choisir le fichier'),
    new File(['PK'], 'letterboxd-pat-2026-11-20.zip', { type: 'application/zip' })
  );
  return dialog;
}

describe('LetterboxdExportSection (MSW)', () => {
  const server = setupServer();
  const batches: { target: string; rows: { rowIndex: number; rating?: number | null }[] }[] = [];

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
    batches.length = 0;
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () =>
        HttpResponse.json({ userId: 'u1', displayName: 'Pat' })
      ),
      http.post(`${TEST_API_V1}/letterboxd/export/read`, () =>
        HttpResponse.json({ watched: WATCHED, watchlist: TO_WATCH })
      ),
      http.post(`${TEST_API_V1}/letterboxd/export/import`, async ({ request }) => {
        const batch = (await request.json()) as (typeof batches)[number];
        batches.push(batch);
        const ambiguous = batch.rows.some((row) => row.rowIndex === AMBIGUOUS.rowIndex);
        return HttpResponse.json({
          added: batch.rows.length - (ambiguous ? 1 : 0),
          alreadyPresent: 0,
          pendingChoices: ambiguous ? [AMBIGUOUS] : [],
          unmatchedTitles: [],
        });
      })
    );
  });
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('imports the whole export in batches, the watched films first, then asks about the ambiguous one', async () => {
    const user = userEvent.setup();
    renderSection();

    const dialog = await chooseExport(user);
    expect(await within(dialog).findByText('60 films')).toBeInTheDocument();
    expect(within(dialog).getByText('1 film')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Importer' }));

    expect(await within(dialog).findByText('Import terminé : 61 films lus.')).toBeInTheDocument();
    expect(
      within(dialog).getByText('Films vus : 59 film(s) ajouté(s), 0 déjà présent(s).')
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText('À voir : 1 film(s) ajouté(s), 0 déjà présent(s).')
    ).toBeInTheDocument();
    expect(batches.map((batch) => [batch.target, batch.rows.length])).toEqual([
      ['watched', 50],
      ['watched', 10],
      ['watchlist', 1],
    ]);
    expect(batches[0]!.rows[0]).toMatchObject({ rowIndex: 1, rating: 8, watchedOn: '2026-01-31' });
    expect(batches[2]!.rows[0]).toMatchObject({ rowIndex: 61, rating: null });

    const confirmations: unknown[] = [];
    server.use(
      createLetterboxdConfirmHandler((body) => confirmations.push(body), { watchedAdded: 1 })
    );
    await user.click(within(dialog).getByRole('button', { name: /Choisir pour 1 film/ }));
    const choices = await screen.findByRole('dialog', { name: 'Un titre à confirmer' });
    await user.click(within(choices).getAllByRole('radio')[0]!);
    await user.click(within(choices).getByRole('button', { name: 'Confirmer et terminer' }));

    expect(
      await screen.findByText('Films vus : 60 film(s) ajouté(s), 0 déjà présent(s).')
    ).toBeInTheDocument();
    expect(confirmations).toEqual([
      expect.objectContaining({ fromExport: true, remainingUnresolvedCount: 0 }),
    ]);
    expect(screen.queryByRole('button', { name: /Choisir pour/ })).not.toBeInTheDocument();
  });

  it('imports only the lists left switched on', async () => {
    const user = userEvent.setup();
    renderSection();

    const dialog = await chooseExport(user);
    await user.click(await within(dialog).findByRole('switch', { name: 'Films vus' }));
    await user.click(within(dialog).getByRole('button', { name: 'Importer' }));

    expect(await within(dialog).findByText('Import terminé : 1 film lu.')).toBeInTheDocument();
    expect(batches.map((batch) => batch.target)).toEqual(['watchlist']);
  });

  it('says when the file is not the Letterboxd export, and lets another one be chosen', async () => {
    const user = userEvent.setup();
    server.use(
      http.post(`${TEST_API_V1}/letterboxd/export/read`, () =>
        HttpResponse.json(
          { code: 400, message: 'unreadable', reason: 'letterboxd_export_unreadable' },
          { status: 400 }
        )
      )
    );
    renderSection();

    const dialog = await chooseExport(user);

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Ce fichier ne vient pas de l’export Letterboxd'
    );
    expect(within(dialog).getByRole('button', { name: 'Choisir le fichier' })).toBeInTheDocument();
  });
});
