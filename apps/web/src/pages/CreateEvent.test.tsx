import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import CreateEvent from './CreateEvent';

const mockFetchApi = vi.fn();
vi.mock('../api/client', () => ({ fetchApi: (...args: unknown[]) => mockFetchApi(...args) }));

function RenderCreateEvent() {
  return render(
    <MemoryRouter>
      <CreateEvent />
    </MemoryRouter>
  );
}

describe('CreateEvent', () => {
  beforeEach(() => {
    mockFetchApi.mockReset();
  });

  it('affiche le formulaire avec titre, date, heure', () => {
    RenderCreateEvent();
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
      hostToken: 'ht-secret',
      shareUrl: '/s/abc123',
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
});
