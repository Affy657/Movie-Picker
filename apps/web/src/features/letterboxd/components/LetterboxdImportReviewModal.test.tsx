import { afterEach, afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import LetterboxdImportReviewModal from '@/features/letterboxd/components/LetterboxdImportReviewModal';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { TEST_API_V1 } from '@/mocks/handlers';
import type { LetterboxdImportPreview } from '@/features/letterboxd/api/letterboxdApi';

beforeAll(() => {
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

const PREVIEW: LetterboxdImportPreview = {
  rows: [
    {
      rowIndex: 1,
      title: 'Matrix',
      year: '1999',
      alreadyInWatchlist: false,
      candidates: [
        {
          tmdbId: 603,
          mediaType: 'movie',
          title: 'The Matrix',
          year: '1999',
          posterPath: null,
          voteAverage: 8.2,
        },
      ],
    },
    {
      rowIndex: 2,
      title: 'Inception',
      year: '2010',
      alreadyInWatchlist: true,
      candidates: [],
    },
    {
      rowIndex: 3,
      title: 'Film Introuvable',
      year: '2005',
      alreadyInWatchlist: false,
      candidates: [],
    },
  ],
  totalParsed: 3,
  totalTruncated: 0,
};

function renderModal(onImported = vi.fn(), onClose = vi.fn()) {
  return render(
    <AppTestProviders>
      <LetterboxdImportReviewModal
        open
        preview={PREVIEW}
        onClose={onClose}
        onImported={onImported}
      />
    </AppTestProviders>
  );
}

describe('LetterboxdImportReviewModal (MSW)', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it("n'affiche que les lignes avec candidats et résume les autres", () => {
    renderModal();

    expect(screen.getByText('The Matrix (1999)')).toBeInTheDocument();
    expect(screen.queryByText(/Inception/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Film Introuvable/)).not.toBeInTheDocument();
    expect(screen.getByText(/3 ligne\(s\) lue\(s\)/)).toBeInTheDocument();
    expect(screen.getByText(/1 déjà dans votre watchlist/)).toBeInTheDocument();
    expect(screen.getByText(/1 introuvable\(s\)/)).toBeInTheDocument();
  });

  it('confirme la sélection par défaut (premier candidat) et notifie le résultat', async () => {
    const user = userEvent.setup();
    const onImported = vi.fn();
    let receivedSelections: unknown;

    server.use(
      http.post(`${TEST_API_V1}/letterboxd-import/confirm`, async ({ request }) => {
        const body = (await request.json()) as { selections: unknown };
        receivedSelections = body.selections;
        return HttpResponse.json({ added: 1, alreadyPresent: 0 });
      })
    );

    renderModal(onImported);

    await user.click(screen.getByRole('button', { name: /Importer \(1\)/ }));

    await waitFor(() => expect(onImported).toHaveBeenCalledWith({ added: 1, alreadyPresent: 0 }));
    expect(receivedSelections).toEqual([
      {
        tmdbId: 603,
        mediaType: 'movie',
        title: 'The Matrix',
        year: '1999',
        posterPath: null,
        voteAverage: 8.2,
      },
    ]);
  });

  it("permet d'ignorer une ligne avant de confirmer", async () => {
    const user = userEvent.setup();

    renderModal();

    await user.click(screen.getByRole('radio', { name: 'Ignorer cette ligne' }));

    expect(screen.getByRole('button', { name: /Importer \(0\)/ })).toBeDisabled();
  });
});
