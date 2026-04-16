import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import CreateEvent from '@/features/events/pages/CreateEvent';
import { pageTitle } from '@/shared/hooks/useDocumentTitle';
import { QueryClientWrapper } from '@/test-utils/queryWrapper';

const mockFetchApi = vi.fn();
vi.mock('@/shared/api/client', () => ({ fetchApi: (...args: unknown[]) => mockFetchApi(...args) }));

function RenderCreateEvent() {
  return render(
    <QueryClientWrapper>
      <MemoryRouter>
        <CreateEvent />
      </MemoryRouter>
    </QueryClientWrapper>
  );
}

describe('CreateEvent', () => {
  beforeEach(() => {
    mockFetchApi.mockReset();
  });

  it('affiche le formulaire avec titre, date, heure', () => {
    RenderCreateEvent();
    expect(document.title).toBe(pageTitle('Nouvelle soirée'));
    expect(screen.getByRole('heading', { name: /créer une soirée/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/titre/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/heure/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /créer la soirée/i })).toBeInTheDocument();
  });

  it('soumission appelle l’API avec titre, date, heure', async () => {
    const user = userEvent.setup();
    mockFetchApi.mockResolvedValueOnce({
      slug: 'abc123',
      shareUrl: '/e/abc123',
      creatorParticipant: { _id: 'p-new', pseudo: 'Vitest' },
    });
    RenderCreateEvent();
    const titleInput = screen.getByLabelText(/titre/i);
    const dateInput = screen.getByLabelText(/date/i);
    const timeInput = screen.getByLabelText(/heure/i);
    await user.clear(titleInput);
    await user.type(titleInput, 'Ma soirée');
    fireEvent.change(dateInput, { target: { value: '2030-12-31' } });
    fireEvent.change(timeInput, { target: { value: '20:00' } });
    await user.click(screen.getByRole('button', { name: /créer la soirée/i }));

    await waitFor(() => {
      expect(mockFetchApi).toHaveBeenCalledWith(
        '/events',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ title: 'Ma soirée', date: '2030-12-31', time: '20:00' }),
        })
      );
    });
  });

  it("affiche un message d'erreur si l'API échoue", async () => {
    const user = userEvent.setup();
    mockFetchApi.mockRejectedValueOnce(new Error('Serveur indisponible'));
    RenderCreateEvent();
    const titleInput = screen.getByLabelText(/titre/i);
    const dateInput = screen.getByLabelText(/date/i);
    const timeInput = screen.getByLabelText(/heure/i);
    await user.clear(titleInput);
    await user.type(titleInput, 'Ma soirée');
    fireEvent.change(dateInput, { target: { value: '2030-12-31' } });
    fireEvent.change(timeInput, { target: { value: '20:00' } });
    await user.click(screen.getByRole('button', { name: /créer la soirée/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/serveur indisponible/i);
    });
  });
});
