import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import JoinForm from './JoinForm';

const mockFetchApi = vi.fn();
const mockSetStoredParticipant = vi.fn();
vi.mock('../api/client', () => ({ fetchApi: (...args: unknown[]) => mockFetchApi(...args) }));
vi.mock('../types/event', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../types/event')>();
  return {
    ...actual,
    setStoredParticipant: (...args: unknown[]) => mockSetStoredParticipant(...args),
  };
});

describe('JoinForm', () => {
  const onJoined = vi.fn();

  beforeEach(() => {
    mockFetchApi.mockReset();
    mockSetStoredParticipant.mockReset();
    onJoined.mockReset();
  });

  it('affiche le champ pseudo et le bouton Rejoindre', () => {
    render(<JoinForm slug="soiree" onJoined={onJoined} />);
    expect(screen.getByRole('heading', { name: /rejoindre la soirée/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/alice/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /rejoindre/i })).toBeInTheDocument();
  });

  it('soumission appelle l’API join et onJoined', async () => {
    const user = userEvent.setup();
    mockFetchApi.mockResolvedValueOnce({ _id: 'p1', eventId: 'e1', pseudo: 'Alice' });
    render(<JoinForm slug="soiree" onJoined={onJoined} />);
    await user.type(screen.getByPlaceholderText(/alice/i), 'Alice');
    await user.click(screen.getByRole('button', { name: /rejoindre/i }));

    await waitFor(() => {
      expect(mockFetchApi).toHaveBeenCalledWith(
        '/events/soiree/join',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ pseudo: 'Alice' }),
        })
      );
    });
    await waitFor(() => {
      expect(mockSetStoredParticipant).toHaveBeenCalledWith('soiree', 'p1', 'Alice');
      expect(onJoined).toHaveBeenCalledWith('p1', 'Alice');
    });
  });
});
