import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import LetterboxdChoicesModal from './LetterboxdChoicesModal';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { TEST_API_V1 } from '@/mocks/handlers';
import type { LetterboxdPendingChoice } from '@/features/letterboxd/api/letterboxdApi';

const ONE_CHOICE: LetterboxdPendingChoice[] = [
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
      {
        tmdbId: 714995,
        mediaType: 'movie',
        title: 'The Manson Brothers',
        year: '2021',
        posterPath: null,
        voteAverage: 4.2,
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
];

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
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('affiche un titre à la fois avec les candidats sans présélection', () => {
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

  it('confirme le choix sélectionné et notifie le résultat sur le dernier titre', async () => {
    const user = userEvent.setup();
    let received: unknown;

    server.use(
      http.post(`${TEST_API_V1}/letterboxd/confirm`, async ({ request }) => {
        received = (await request.json()) as { selections: unknown };
        return HttpResponse.json({ added: 1, alreadyPresent: 0, pendingReconciliationCount: 0 });
      })
    );

    const onConfirmed = (result: { added: number; alreadyPresent: number }) => {
      expect(result).toEqual({ added: 1, alreadyPresent: 0, pendingReconciliationCount: 0 });
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
            letterboxdSlug: 'midnight-mass-2021',
          },
        ],
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

  it('avance au titre suivant et envoie toutes les réponses au dernier écran', async () => {
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
            letterboxdSlug: 'spider-man-1977',
          },
        ],
        remainingUnresolvedCount: 1,
      })
    );
  });

  it('permet de décider plus tard en envoyant seulement les titres déjà tranchés', async () => {
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
      expect(result).toEqual({ added: 1, alreadyPresent: 0, pendingReconciliationCount: 1 });
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
            letterboxdSlug: 'midnight-mass-2021',
          },
        ],
        remainingUnresolvedCount: 1,
      })
    );
  });
});
