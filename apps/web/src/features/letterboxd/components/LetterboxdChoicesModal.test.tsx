import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import LetterboxdChoicesModal from './LetterboxdChoicesModal';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { TEST_API_V1 } from '@/mocks/handlers';
import type { LetterboxdPendingChoice } from '@/features/letterboxd/api/letterboxdApi';

const CHOICES: LetterboxdPendingChoice[] = [
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

function renderModal(
  onConfirmed: (result: { added: number; alreadyPresent: number }) => void = () => undefined,
  onClose = () => undefined
) {
  return render(
    <AppTestProviders>
      <LetterboxdChoicesModal open choices={CHOICES} onClose={onClose} onConfirmed={onConfirmed} />
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

  it('affiche les candidats sans présélection', () => {
    renderModal();

    expect(screen.getByText('Sermons de minuit (2021)')).toBeInTheDocument();
    expect(screen.getByText('The Manson Brothers (2021)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Valider \(0\)/ })).toBeDisabled();
  });

  it('confirme le choix sélectionné et notifie le résultat', async () => {
    const user = userEvent.setup();
    let received: unknown;

    server.use(
      http.post(`${TEST_API_V1}/letterboxd/confirm`, async ({ request }) => {
        received = (await request.json()) as { selections: unknown };
        return HttpResponse.json({ added: 1, alreadyPresent: 0 });
      })
    );

    const onConfirmed = (result: { added: number; alreadyPresent: number }) => {
      expect(result).toEqual({ added: 1, alreadyPresent: 0 });
    };
    renderModal(onConfirmed);

    await user.click(screen.getByLabelText('Sermons de minuit (2021)'));
    await user.click(screen.getByRole('button', { name: /Valider \(1\)/ }));

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
      })
    );
  });

  it('permet d’ignorer un film ambigu', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByLabelText('Sermons de minuit (2021)'));
    await user.click(screen.getByLabelText('Ignorer ce film'));

    expect(screen.getByRole('button', { name: /Valider \(0\)/ })).toBeDisabled();
  });
});
